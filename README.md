# NebulaBridge

A private repository for a React app with a Python Lambda backend that allows users to send text messages to a serverless backend and receive responses.

## What This Application Does

NebulaBridge is a simple web application that demonstrates frontend-backend integration using serverless architecture:

1. The React frontend provides a text input field where users can enter messages
2. When submitted, the message is sent to the Python Lambda backend via API Gateway
3. The Lambda function processes the message and returns a response with a prepended message
4. The frontend displays the response from the Lambda function

## Project Structure

- `frontend/`: React application with text input functionality and API integration
- `backend/`: Python Lambda function that processes text input and returns responses
- `infra/`: AWS CDK infrastructure code for deploying the application
- `.github/workflows/`: CI/CD pipeline configuration for automated deployments

## Setup Instructions

### Frontend (React)

To set up the React frontend locally:

```bash
cd frontend
npm install
npm start
```

### Backend (Python Lambda)

To set up the Python Lambda backend locally:

```bash
cd backend
pip install -r requirements.txt
```

## Deployment

The application is deployed to AWS using the AWS Cloud Development Kit (CDK) and GitHub Actions for CI/CD.

### AWS Resources Used

- **Frontend**: Hosted on Amazon S3 and distributed via Amazon CloudFront
- **Backend**: Deployed as an AWS Lambda function with Amazon API Gateway
- **Infrastructure**: Managed using AWS CDK for infrastructure as code

### Deployment URLs

- **Frontend Application**: https://nebulabridge-frontend-1744743617.s3.amazonaws.com/index.html
- **API Endpoint**: https://zeiuj2c69c.execute-api.us-east-1.amazonaws.com/prod/api

### CI/CD Pipeline

The application is automatically deployed to AWS when changes are merged to the `main` branch:

1. GitHub Actions workflow is triggered on push to `main`
2. Frontend is built and deployed to S3
3. Backend is packaged and deployed to Lambda
4. API Gateway deployment is created

To set up the CI/CD pipeline, AWS credentials must be configured as GitHub repository secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

For more details on the CI/CD setup, see [CICD.md](./CICD.md).
