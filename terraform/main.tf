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
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

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

# ---- Cloud SQL -----------------------------------------------------------
# --- Cloud SQL (public IP) --------------------------
resource "google_sql_database_instance" "pg" {
  name             = "customers-pg"
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = var.db_tier
    # remove the whole ip_configuration block
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

# ---- VPC connector (serverless access) -----------------------------------
resource "google_vpc_access_connector" "connector" {
  name   = "run-sql-connector"
  region = var.region
  subnet {
    name = "default"
  }
}

# ---- Cloud Run service account -------------------------------------------
resource "google_service_account" "run_sa" {
  account_id   = "customers-api"
  display_name = "Cloud Run – customers-api"
}

# allow SA to use secrets
resource "google_secret_manager_secret_iam_member" "db_secret_access" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "firebase_secret_access" {
  secret_id = google_secret_manager_secret.firebase.id
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
    spec {
      service_account_name = google_service_account.run_sa.email
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/app/customers:0.1.0"

        env {
          name  = "DATABASE_URL"
          value = "postgresql://app_user:${var.db_password}@/customers?host=/cloudsql/${google_sql_database_instance.pg.connection_name}"
        }

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
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
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# public unauthenticated access (optional)
resource "google_cloud_run_service_iam_member" "public_invoker" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
