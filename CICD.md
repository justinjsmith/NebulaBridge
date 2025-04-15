# CI/CD Setup for NebulaBridge

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the NebulaBridge application.

## Overview

The CI/CD pipeline automatically deploys the NebulaBridge application to AWS when changes are merged to the `main` branch. The pipeline handles both the React frontend and Python Lambda backend deployments.

## Workflow

The CI/CD workflow is defined in `.github/workflows/deploy.yml` and performs the following steps:

1. Checkout the code from the repository
2. Set up Node.js for the frontend
3. Set up Python for the backend
4. Configure AWS credentials
5. Install frontend dependencies
6. Build the frontend
7. Install backend dependencies
8. Package the Lambda function
9. Deploy the frontend to S3
10. Update the Lambda function
11. Create a new API Gateway deployment

## Required GitHub Secrets

The following secrets need to be configured in the GitHub repository settings:

- `AWS_ACCESS_KEY_ID`: The AWS access key ID with permissions to deploy to S3, Lambda, and API Gateway
- `AWS_SECRET_ACCESS_KEY`: The corresponding AWS secret access key

## AWS Resources

The CI/CD pipeline deploys to the following AWS resources:

- S3 Bucket: `nebulabridge-frontend-1744743617`
- Lambda Function: `NebulaBridgeBackend`
- API Gateway: `zeiuj2c69c`

## Setting Up GitHub Secrets

To set up the required GitHub secrets:

1. Go to the repository settings on GitHub
2. Navigate to "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Add the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets

## Testing the CI/CD Pipeline

To test the CI/CD pipeline:

1. Make changes to the codebase
2. Create a pull request to the `main` branch
3. Merge the pull request
4. The GitHub Actions workflow will automatically deploy the changes to AWS

## Troubleshooting

If the CI/CD pipeline fails, check the following:

1. GitHub Actions logs for detailed error messages
2. AWS IAM permissions for the access key
3. AWS resource configurations
4. GitHub repository secrets
