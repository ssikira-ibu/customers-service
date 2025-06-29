#!/bin/bash

# Modern secure deployment script for customers-service
# Follows best practices for CI/CD and security

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'       # Secure Internal Field Separator

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly TERRAFORM_DIR="$SCRIPT_DIR"
readonly IMAGE_NAME="customers"
readonly REGISTRY_REGION="${REGION:-europe-north2}"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

# Error handling
error_exit() {
    log_error "$1"
    exit 1
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
    fi
    exit $exit_code
}

trap cleanup EXIT

# Validation functions
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check required tools
    command -v gcloud >/dev/null 2>&1 || error_exit "gcloud CLI not found"
    command -v docker >/dev/null 2>&1 || error_exit "Docker not found"
    command -v terraform >/dev/null 2>&1 || error_exit "Terraform not found"
    command -v npm >/dev/null 2>&1 || error_exit "npm not found"
    
    # Check required environment variables
    [[ -z "${PROJECT_ID:-}" ]] && error_exit "PROJECT_ID environment variable not set"
    [[ -z "${REGION:-}" ]] && error_exit "REGION environment variable not set"
    
    # Validate gcloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        error_exit "No active gcloud authentication found. Run 'gcloud auth login'"
    fi
    
    # Validate Docker daemon
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker daemon not running"
    fi
    
    log_success "Prerequisites validated"
}

validate_terraform_files() {
    log_info "Validating Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Check if required files exist
    [[ -f "main.tf" ]] || error_exit "main.tf not found"
    [[ -f "variables.tf" ]] || error_exit "variables.tf not found"
    [[ -f "versions.tf" ]] || error_exit "versions.tf not found"
    [[ -f "secrets.auto.tfvars" ]] || error_exit "secrets.auto.tfvars not found"
    [[ -f "image_version.tfvars" ]] || error_exit "image_version.tfvars not found"
    
    # Validate Terraform syntax
    terraform fmt -check=true || {
        log_warn "Terraform formatting issues found. Running terraform fmt..."
        terraform fmt
    }
    
    terraform validate || error_exit "Terraform validation failed"
    
    log_success "Terraform configuration validated"
}

# Build functions
run_tests() {
    if [[ "${SKIP_TESTS:-false}" == "true" ]]; then
        log_warn "Skipping tests (SKIP_TESTS=true)"
        return 0
    fi
    
    log_info "Running tests..."
    
    # Install dependencies if needed
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]] || [[ "$PROJECT_ROOT/package.json" -nt "$PROJECT_ROOT/node_modules" ]]; then
        log_info "Installing dependencies..."
        (cd "$PROJECT_ROOT" && npm ci) || error_exit "Failed to install dependencies"
    fi
    
    # Run tests
    (cd "$PROJECT_ROOT" && npm test) || error_exit "Tests failed"
    
    # Run type checking
    (cd "$PROJECT_ROOT" && npm run typecheck) || error_exit "Type checking failed"
    
    log_success "Tests passed"
}

build_docker_image() {
    log_info "Building Docker image..."
    
    # Generate timestamp for image tag
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    local commit_sha
    commit_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    readonly IMAGE_TAG="${timestamp}-${commit_sha}"
    readonly FULL_IMAGE_NAME="${REGISTRY_REGION}-docker.pkg.dev/${PROJECT_ID}/app/${IMAGE_NAME}:${IMAGE_TAG}"
    
    # Configure Docker to use gcloud as credential helper
    gcloud auth configure-docker "${REGISTRY_REGION}-docker.pkg.dev" --quiet
    
    # Build multi-stage Docker image with security best practices
    (cd "$PROJECT_ROOT" && docker build \
        --file Dockerfile.prod \
        --platform linux/amd64 \
        --tag "$FULL_IMAGE_NAME" \
        --tag "${REGISTRY_REGION}-docker.pkg.dev/${PROJECT_ID}/app/${IMAGE_NAME}:latest" \
        --label "build.timestamp=${timestamp}" \
        --label "build.commit=${commit_sha}" \
        --label "build.version=${IMAGE_TAG}" \
        .) || error_exit "Docker build failed"
    
    log_success "Docker image built: $FULL_IMAGE_NAME"
}

push_docker_image() {
    log_info "Pushing Docker image to Artifact Registry..."
    
    # Push both versioned and latest tags
    docker push "$FULL_IMAGE_NAME" || error_exit "Failed to push versioned image"
    docker push "${REGISTRY_REGION}-docker.pkg.dev/${PROJECT_ID}/app/${IMAGE_NAME}:latest" || error_exit "Failed to push latest image"
    
    log_success "Docker image pushed successfully"
}

update_terraform_vars() {
    log_info "Updating Terraform variables..."
    cd "$TERRAFORM_DIR"
    
    # Update image_version.tfvars with new image tag
    cat > image_version.tfvars <<EOF
# Auto-generated by deploy.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')
image_tag = "${IMAGE_TAG}"
EOF
    
    log_success "Terraform variables updated with image tag: $IMAGE_TAG"
}

# Deployment functions
plan_terraform() {
    log_info "Planning Terraform deployment..."
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    terraform init -upgrade
    
    # Create deployment plan
    terraform plan \
        -var="project_id=${PROJECT_ID}" \
        -var="region=${REGION}" \
        -var-file="secrets.auto.tfvars" \
        -var-file="image_version.tfvars" \
        -out="tfplan" || error_exit "Terraform planning failed"
    
    log_success "Terraform plan created"
}

apply_terraform() {
    log_info "Applying Terraform deployment..."
    cd "$TERRAFORM_DIR"
    
    # Apply the plan
    terraform apply "tfplan" || error_exit "Terraform apply failed"
    
    # Clean up plan file
    rm -f tfplan
    
    log_success "Terraform deployment completed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    cd "$TERRAFORM_DIR"
    
    # Get the deployed URL
    local service_url
    service_url=$(terraform output -raw url 2>/dev/null || echo "")
    
    if [[ -n "$service_url" ]]; then
        log_info "Service deployed at: $service_url"
        
        # Wait for service to be ready
        log_info "Waiting for service to be ready..."
        local max_attempts=30
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -sf "$service_url/health" >/dev/null 2>&1; then
                log_success "Service is healthy and responding"
                break
            fi
            
            log_info "Attempt $attempt/$max_attempts: Service not ready yet, waiting..."
            sleep 10
            ((attempt++))
        done
        
        if [[ $attempt -gt $max_attempts ]]; then
            log_warn "Service health check timed out, but deployment may still be successful"
        fi
    else
        log_warn "Could not retrieve service URL"
    fi
}

# Main deployment flow
main() {
    log_info "Starting secure deployment of customers-service"
    log_info "Project: $PROJECT_ID, Region: $REGION"
    
    validate_prerequisites
    validate_terraform_files
    run_tests
    build_docker_image
    push_docker_image
    update_terraform_vars
    plan_terraform
    
    # Ask for confirmation before applying
    echo
    log_info "Ready to deploy. The following changes will be applied:"
    echo "  - Image: $FULL_IMAGE_NAME"
    echo "  - Project: $PROJECT_ID"
    echo "  - Region: $REGION"
    echo
    
    if [[ "${AUTO_APPROVE:-false}" != "true" ]]; then
        read -rp "Proceed with deployment? (y/N): " confirm
        case $confirm in
            [Yy]* ) ;;
            * ) log_info "Deployment cancelled"; exit 0;;
        esac
    fi
    
    apply_terraform
    verify_deployment
    
    log_success "Deployment completed successfully!"
    
    # Display final information
    echo
    log_info "Deployment Summary:"
    log_info "  Image: $FULL_IMAGE_NAME"
    log_info "  Service URL: $(terraform output -raw url 2>/dev/null || echo 'Not available')"
    echo
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy customers-service to Google Cloud Platform

OPTIONS:
    -h, --help          Show this help message
    -y, --yes           Auto-approve deployment (skip confirmation)

ENVIRONMENT VARIABLES:
    PROJECT_ID          GCP Project ID (required)
    REGION             GCP Region (required, default: europe-north2)
    AUTO_APPROVE       Skip confirmation prompt (default: false)
    SKIP_TESTS         Skip running tests (default: false)

EXAMPLES:
    export PROJECT_ID=my-project
    export REGION=europe-north2
    $0

    # Auto-approve deployment
    AUTO_APPROVE=true $0

    # Or with command line flag
    $0 --yes

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -y|--yes)
            AUTO_APPROVE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"