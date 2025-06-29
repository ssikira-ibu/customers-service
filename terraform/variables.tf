variable "project_id" { type = string }

variable "region" {
  type    = string
  default = "europe-north2"
}

variable "db_tier" {
  type    = string
  default = "db-f1-micro"
} # Shared CPU, 0.6 GB RAM - cost optimized for small datasets

variable "db_password" {
  type      = string
  sensitive = true
}

variable "firebase_sa" {
  type        = string
  description = "base64-encoded service-account JSON"
  sensitive   = true
}

variable "image_tag" {
  type        = string
  description = "Docker image tag to deploy (e.g., 'latest' or timestamp)"
  default     = "latest"
}
