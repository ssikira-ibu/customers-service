#!/bin/bash

# Exit on any error
set -e

# Configuration
PROJECT_ID="ibu-customer-management"
REGION="europe-north2"
REPOSITORY="app"
SERVICE_NAME="customers"
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:latest"

echo "🚀 Building and deploying customers service (latest version)..."
echo "📦 Project: ${PROJECT_ID}"
echo "🌍 Region: ${REGION}"
echo "🏷️  Image: ${IMAGE_TAG}"

# Navigate to project root
cd "$(dirname "$0")/.."

# Build the Docker image using production Dockerfile with platform specification
echo "🔨 Building Docker image for linux/amd64 platform..."
docker build --platform linux/amd64 -f Dockerfile.prod -t ${IMAGE_TAG} .

# Push the image
echo "📤 Pushing Docker image..."
docker push ${IMAGE_TAG}

# Apply Terraform changes (using latest tag)
echo "🚀 Applying Terraform configuration..."
cd terraform
terraform apply -var-file="secrets.auto.tfvars" -auto-approve

echo "✅ Deployment completed successfully!"
echo "🌐 Service URL: $(terraform output -raw url)" 