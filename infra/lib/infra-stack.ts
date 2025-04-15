import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';

export class InfraStack extends cdk.Stack {
  public readonly apiUrl: cdk.CfnOutput;
  public readonly frontendUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const backendLambda = new lambda.Function(this, 'NebulaBridgeBackend', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('../backend'),
      handler: 'lambda_function.lambda_handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
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

    const lambdaIntegration = new apigateway.LambdaIntegration(backendLambda);
    const apiResource = api.root.addResource('api');
    apiResource.addMethod('GET', lambdaIntegration);
    apiResource.addMethod('POST', lambdaIntegration);

    const frontendBucket = new s3.Bucket(this, 'NebulaBridgeFrontend', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
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
  }
}
