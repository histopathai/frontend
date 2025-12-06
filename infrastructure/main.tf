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
    # GCP project and region info
    project_id     = data.terraform_remote_state.platform.outputs.project_id
    project_number = data.terraform_remote_state.platform.outputs.project_number
    region         = data.terraform_remote_state.platform.outputs.region

    # Service info
    service_account        = data.terraform_remote_state.platform.outputs.main_service_account_email
    artifact_repository_id = data.terraform_remote_state.platform.outputs.artifact_repository_id
    service_name           = var.environment == "prod" ? "main-service" : "main-service-${var.environment}"
  
    # Construct the full image path
    image_name = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/main-service:${var.image_tag}"

}

provider "google" {
  project = local.project_id
  region  = local.region
}

# ----------------------------------------------------------
# CLOUD RUN SERVICE
# ----------------------------------------------------------
resource "google_cloud_run_v2_service" "frontend" {
    name = local.service_name
    location = local.region
    ingress  = var.allow_public_access ? "INGRESS_TRAFFIC_ALL" : "INGRESS_TRAFFIC_INTERNAL_ONLY"

    template {
      service_account = local.service_account
      scaling {
          min_instance_count = var.min_instances
          max_instance_count = var.max_instances
        }
      containers {
        image = local.image_name
        resources {
          limits = {
            memory = var.memory_limit
            cpu    = var.cpu_limit
          }
          cpu_idle = true
        }

        ports {
          container_port = 8080
        }
      }
    }

    traffic {
      type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
      percent = 100
    }
      
    labels = {
      environment = var.environment
      service = "frontend"
      managed_by = "terraform"
    }
}

# ----------------------------------------------------------
# PUBLIC ACCESS (Frontend is Public)
# ----------------------------------------------------------
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  count     = var.allow_public_access ? 1 : 0
  project   = google_cloud_run_v2_service.frontend.project
  location  = google_cloud_run_v2_service.frontend.location
  name      = google_cloud_run_v2_service.frontend.name
  role      = "roles/run.invoker"
  member    = "allUsers"
}