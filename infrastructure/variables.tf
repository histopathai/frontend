variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default = "latest"
}

variable "api_base_url" {
  description = "Backend API URL"
  type        = string
}

variable "tf_state_bucket" {
  description = "GCS bucket for state"
  type        = string
}

# --- YENİ EKLENENLER ---
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "artifact_registry_repo" {
  description = "Name of the Artifact Registry repository"
  type        = string
}

variable "allow_public_access" {
  description = "Whether to allow public access to the Cloud Run service"
  type        = bool
  default     = true
}

variable "min_instances" {
  description = "Minimum number of instances for Cloud Run service"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of instances for Cloud Run service"
  type        = number
  default     = 2
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run service"
  type        = string
  default     = "512Mi"
}

variable "cpu_limit" {
  description = "CPU limit for Cloud Run service"
  type        = string
  default     = "1"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

