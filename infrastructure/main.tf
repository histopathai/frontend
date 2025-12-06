terraform {
  required_version = ">=1.5.0"

  required_providers {
    google = {
        source = "hashicorp/google"
        version = "~>5.0"
    }
  }
  backend "gcs" {
    prefix = "service/frontend"
  }
}

# ----------------------------------------------------------
# REMOTE STATE DATA SOURCES
# ----------------------------------------------------------

data "terraform_remote_state" "platform" {
    backend = "gcs"

    config = {
        bucket = var.tf_state_bucket
        prefix = "platform/prod"
    }
}

# ----------------------------------------------------------
# LOCALS & PROVIDERS
# ----------------------------------------------------------
locals {
    project_id      = data.terraform_remote_state.platform.outputs.project_id
    region          = data.terraform_remote_state.platform.outputs.region
    repo_url        = data.terraform_remote_state.platform.outputs.artifact_repository_url
    service_account = data.terraform_remote_state.platform.outputs.frontend_service_account_email
    
    image_name      = "${local.repo_url}/frontend:${var.image_tag}"
}

provider "google" {
    project = data.terraform_remote_state.platform.outputs.project_id
    region  = data.terraform_remote_state.platform.outputs.region
}

# ----------------------------------------------------------
# CLOUD RUN SERVICE
# ----------------------------------------------------------
resource "google_cloud_run_service" "frontend" {
    name = "frontend"
    location = local.region

    template {
      spec {
        service_account_name = local.service_account
        containers {
          image = local.image_name
          ports {
            container_port = 8080  
          }

          env {
            name  = "VITE_API_BASE_URL"
            value = var.api_base_url
          }
        }
      }
    }

    traffic {
      percent         = 100
      latest_revision = true
    }
}

# ----------------------------------------------------------
# PUBLIC ACCESS (Frontend is Public)
# ----------------------------------------------------------
data "google_iam_policy" "noauth" {
    binding {
      role = "roles/run.invoker"
      members = [
        "allUsers",
      ]
    }
}

resource "google_cloud_run_service_iam_policy" "noauth" {
  location    = google_cloud_run_service.frontend.location
  project     = google_cloud_run_service.frontend.project
  service     = google_cloud_run_service.frontend.name
  policy_data = data.google_iam_policy.noauth.policy_data
}