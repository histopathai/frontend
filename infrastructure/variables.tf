variable "image_tag" {
  description = "Docker image tag to deploy (e.g., 'latest' or commit hash)"
  type        = string
  default     = "latest"
}

variable "api_base_url" {
  description = "Base URL for the backend API that the frontend will communicate with"
  type        = string
  default     = "https://api.example.com"
}

variable "tf_state_bucket" {
  description = "GCS bucket name for Terraform remote state"
  type        = string
}