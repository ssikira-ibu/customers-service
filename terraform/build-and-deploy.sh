#!/bin/bash

# Exit on any error
set -e

# Configuration
PROJECT_ID="ibu-customer-management"
REGION="europe-north2"
REPOSITORY="app"
SERVICE_NAME="customers"

# Generate timestamp for versioning
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:${TIMESTAMP}"
LATEST_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:latest"

echo "🚀 Building and deploying customers service..."
echo "📦 Project: ${PROJECT_ID}"
echo "🌍 Region: ${REGION}"
echo "🏷️  Image tag: ${IMAGE_TAG}"

# Navigate to project root
cd "$(dirname "$0")/.."

# Build the Docker image with platform specification
echo "🔨 Building Docker image for linux/amd64 platform..."
docker build --platform linux/amd64 -f Dockerfile.prod -t ${IMAGE_TAG} -t ${LATEST_TAG} .

# Push both timestamped and latest tags
echo "📤 Pushing Docker image..."
docker push ${IMAGE_TAG}
docker push ${LATEST_TAG}

# Update Terraform variables with the new image tag
echo "📝 Updating Terraform configuration..."
cd terraform

# Create a temporary file with the new image tag
cat > image_version.tfvars << EOF
image_tag = "${TIMESTAMP}"
EOF

# Apply Terraform changes
echo "🚀 Applying Terraform configuration..."
terraform apply -var-file="secrets.auto.tfvars" -var-file="image_version.tfvars" -auto-approve

# Clean up temporary file
rm image_version.tfvars

echo "✅ Deployment completed successfully!"
echo "🌐 Service URL: $(terraform output -raw url)" 