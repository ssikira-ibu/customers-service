# ---- Enable required APIs -----------------------------------------------
resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "vpcaccess.googleapis.com",
  ])
  service = each.key
}

# ---- Secret Manager ------------------------------------------------------
resource "google_secret_manager_secret" "firebase" {
  secret_id = "firebase-credentials"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "firebase" {
  secret      = google_secret_manager_secret.firebase.id
  secret_data = base64decode(var.firebase_sa)
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "database-url"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgres://app_user:${var.db_password}@localhost/customers?host=/cloudsql/${google_sql_database_instance.pg.connection_name}"
}

# ---- Cloud SQL -----------------------------------------------------------
# --- Cloud SQL (public IP) --------------------------
resource "google_sql_database_instance" "pg" {
  name             = "customers-pg"
  region           = var.region
  database_version = "POSTGRES_15"

  deletion_protection = true

  settings {
    tier = var.db_tier

    # Storage configuration for cost optimization
    disk_size       = 10
    disk_type       = "PD_HDD"
    disk_autoresize = false

    # Availability configuration
    availability_type = "ZONAL"

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = false
      backup_retention_settings {
        retained_backups = 3
      }
    }

    # Maintenance window
    maintenance_window {
      day          = 1
      hour         = 2
      update_track = "stable"
    }
  }
}

resource "google_sql_database" "customers" {
  name     = "customers"
  instance = google_sql_database_instance.pg.name
}

resource "google_sql_user" "app" {
  instance = google_sql_database_instance.pg.name
  name     = "app_user"
  password = var.db_password
}

# ---- Cloud Run service account -------------------------------------------
resource "google_service_account" "run_sa" {
  account_id   = "customers-api"
  display_name = "Cloud Run – customers-api"
}

# allow SA to use secrets
resource "google_secret_manager_secret_iam_member" "firebase_secret_access" {
  secret_id = google_secret_manager_secret.firebase.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "database_url_secret_access" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run_sa.email}"
}

# allow SA to connect to Cloud SQL
resource "google_project_iam_member" "run_to_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

# ---- Cloud Run -----------------------------------------------------------
resource "google_cloud_run_service" "api" {
  name     = "customers-api"
  location = var.region

  template {

    metadata {
      annotations = {
        # If you later have more than one instance, separate them with commas.
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.pg.connection_name
      }
    }

    spec {
      service_account_name = google_service_account.run_sa.email
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/app/customers:${var.image_tag}"

        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.database_url.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name  = "CLOUD_SQL_CONNECTION_NAME"
          value = google_sql_database_instance.pg.connection_name
        }

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name  = "CORS_ORIGIN"
          value = "https://customers-service-web.vercel.app"
        }

        env {
          name  = "ALLOWED_DOMAINS"
          value = "customers-service-web.vercel.app"
        }

        env {
          name = "FIREBASE_CREDENTIALS"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase.secret_id
              key  = "latest"
            }
          }
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }

        ports {
          container_port = 8080
        }

      }
    }
  }

  traffic {
    latest_revision = true
    percent         = 100
  }
}

# Allow public access for health checks and frontend access
# The API handles authentication internally via Firebase tokens
resource "google_cloud_run_service_iam_member" "public_invoker" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
