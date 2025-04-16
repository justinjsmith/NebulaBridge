import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as fs from 'fs';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  public readonly apiUrl: cdk.CfnOutput;
  public readonly frontendUrl: cdk.CfnOutput;
  public readonly userPoolId: cdk.CfnOutput;
  public readonly userPoolClientId: cdk.CfnOutput;
  public readonly cognitoDomain: cdk.CfnOutput;
  public readonly frontendBucketName: cdk.CfnOutput;
  public readonly cloudFrontDistributionId: cdk.CfnOutput;
  public readonly lambdaFunctionName: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const userPool = new cognito.UserPool(this, 'NebulaBridgeUserPool', {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const backendLambda = new lambda.Function(this, 'NebulaBridgeBackend', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('../backend'),
      handler: 'lambda_function.lambda_handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        COGNITO_USER_POOL_ID: userPool.userPoolId,
      }
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'NebulaBridgeAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const api = new apigateway.RestApi(this, 'NebulaBridgeApi', {
      restApiName: 'NebulaBridge API',
      description: 'API for NebulaBridge application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    userPool.grant(backendLambda, 'cognito-idp:GetUser');

    const lambdaIntegration = new apigateway.LambdaIntegration(backendLambda);
    const apiResource = api.root.addResource('api');
    
    apiResource.addMethod('GET', lambdaIntegration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    apiResource.addMethod('POST', lambdaIntegration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const frontendBucket = new s3.Bucket(this, 'NebulaBridgeFrontend', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'NebulaBridgeDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'NebulaBridgeUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        callbackUrls: [
          'http://localhost:3000/',
          `https://${distribution.distributionDomainName}/`,
        ],
        logoutUrls: [
          'http://localhost:3000/',
          `https://${distribution.distributionDomainName}/`,
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });
    
    const cognitoDomainPrefix = `nebulabridge-${this.account}`;
    const userPoolDomain = new cognito.UserPoolDomain(this, 'NebulaBridgeDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix: cognitoDomainPrefix,
      },
    });
    
    backendLambda.addEnvironment('COGNITO_APP_CLIENT_ID', userPoolClient.userPoolClientId);

    const envFilePath = path.join(__dirname, '../../frontend/.env');
    try {
      let envContent = '';
      if (fs.existsSync(envFilePath)) {
        envContent = fs.readFileSync(envFilePath, 'utf8');
      }
      
      const envVars = {
        'REACT_APP_API_URL': api.url,
        'REACT_APP_AWS_REGION': this.region,
        'REACT_APP_USER_POOL_ID': userPool.userPoolId,
        'REACT_APP_USER_POOL_CLIENT_ID': userPoolClient.userPoolClientId,
        'REACT_APP_COGNITO_DOMAIN': cognitoDomainPrefix,
      };
      
      Object.entries(envVars).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (envContent.match(regex)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      });
      
      fs.writeFileSync(envFilePath, envContent);
      console.log('Frontend .env file updated with Cognito configuration');
    } catch (error) {
      console.error('Error updating frontend .env file:', error);
    }

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('../frontend/build')],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    this.apiUrl = new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'URL of the API Gateway endpoint',
    });

    this.frontendUrl = new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'URL of the CloudFront distribution',
    });
    
    this.userPoolId = new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'ID of the Cognito User Pool',
    });
    
    this.userPoolClientId = new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'ID of the Cognito User Pool Client',
    });
    
    this.cognitoDomain = new cdk.CfnOutput(this, 'CognitoDomain', {
      value: cognitoDomainPrefix,
      description: 'Cognito domain prefix',
    });
    
    this.frontendBucketName = new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Name of the S3 bucket for frontend',
    });
    
    this.cloudFrontDistributionId = new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'ID of the CloudFront distribution',
    });
    
    this.lambdaFunctionName = new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: backendLambda.functionName,
      description: 'Name of the Lambda function',
    });
  }
}
