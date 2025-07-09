import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'

export interface StudySessionCalendarStackProps extends cdk.StackProps {
  serviceName: string
  environment: string
  googleCalendarId: string
  googleCalendarApiKey: string
}

export class StudySessionCalendarStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StudySessionCalendarStackProps) {
    super(scope, id, props)

    const { serviceName, environment, googleCalendarId, googleCalendarApiKey } = props

    // DynamoDB テーブル
    const studySessionsTable = new dynamodb.Table(this, 'StudySessionsTable', {
      tableName: `${serviceName}-${environment}-table-study-sessions`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY
    })

    // Lambda 関数用の環境変数
    const lambdaEnvironment = {
      STUDY_SESSIONS_TABLE_NAME: studySessionsTable.tableName,
      GOOGLE_CALENDAR_ID: googleCalendarId,
      GOOGLE_CALENDAR_API_KEY: googleCalendarApiKey,
      ENVIRONMENT: environment
    }

    // Lambda 関数
    const createStudySessionFunction = new lambda.Function(this, 'CreateStudySessionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/studySessionHandlers.createStudySession',
      code: lambda.Code.fromAsset('../admin-backend/dist'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-create-study-session`
    })

    const getStudySessionsFunction = new lambda.Function(this, 'GetStudySessionsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/studySessionHandlers.getStudySessions',
      code: lambda.Code.fromAsset('../admin-backend/dist'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-get-study-sessions`
    })

    const approveStudySessionFunction = new lambda.Function(this, 'ApproveStudySessionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/studySessionHandlers.approveStudySession',
      code: lambda.Code.fromAsset('../admin-backend/dist'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-approve-study-session`
    })

    const rejectStudySessionFunction = new lambda.Function(this, 'RejectStudySessionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/studySessionHandlers.rejectStudySession',
      code: lambda.Code.fromAsset('../admin-backend/dist'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-reject-study-session`
    })

    const deleteStudySessionFunction = new lambda.Function(this, 'DeleteStudySessionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/studySessionHandlers.deleteStudySession',
      code: lambda.Code.fromAsset('../admin-backend/dist'),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-delete-study-session`
    })

    // DynamoDB テーブルへのアクセス権限を付与
    studySessionsTable.grantReadWriteData(createStudySessionFunction)
    studySessionsTable.grantReadWriteData(getStudySessionsFunction)
    studySessionsTable.grantReadWriteData(approveStudySessionFunction)
    studySessionsTable.grantReadWriteData(rejectStudySessionFunction)
    studySessionsTable.grantReadWriteData(deleteStudySessionFunction)

    // API Gateway
    const api = new apigateway.RestApi(this, 'StudySessionApi', {
      restApiName: `${serviceName}-${environment}-api-study-session`,
      description: `広島IT勉強会カレンダー API (${environment})`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
          'X-Requested-With',
          'Accept',
          'Accept-Language',
          'Accept-Encoding',
          'Origin',
          'Referer',
          'User-Agent'
        ],
        exposeHeaders: [
          'Access-Control-Allow-Origin',
          'Access-Control-Allow-Headers',
          'Access-Control-Allow-Methods'
        ],
        maxAge: cdk.Duration.hours(1)
      }
    })

    // /api リソース
    const apiResource = api.root.addResource('api')

    // エンドユーザー向けAPI: /api/study-sessions
    const studySessionsResource = apiResource.addResource('study-sessions')
    studySessionsResource.addMethod('POST', new apigateway.LambdaIntegration(createStudySessionFunction))

    // 管理者向けAPI: /api/admin
    const adminResource = apiResource.addResource('admin')
    const adminStudySessionsResource = adminResource.addResource('study-sessions')
    adminStudySessionsResource.addMethod('GET', new apigateway.LambdaIntegration(getStudySessionsFunction))

    const adminStudySessionResource = adminStudySessionsResource.addResource('{id}')
    const approveResource = adminStudySessionResource.addResource('approve')
    const rejectResource = adminStudySessionResource.addResource('reject')
    const deleteResource = adminStudySessionResource.addResource('delete')

    approveResource.addMethod('POST', new apigateway.LambdaIntegration(approveStudySessionFunction))
    rejectResource.addMethod('POST', new apigateway.LambdaIntegration(rejectStudySessionFunction))
    deleteResource.addMethod('POST', new apigateway.LambdaIntegration(deleteStudySessionFunction))

    // S3 バケット（管理画面用）
    const adminFrontendBucket = new s3.Bucket(this, 'AdminFrontendBucket', {
      bucketName: `${serviceName}-${environment}-s3-admin-frontend`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY
    })

    // CloudFront ディストリビューション
    const distribution = new cloudfront.Distribution(this, 'AdminFrontendDistributionV4', {
      defaultBehavior: {
        origin: new origins.S3Origin(adminFrontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(`${api.restApiId}.execute-api.${this.region}.amazonaws.com`, {
            originPath: '/prod'
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true
        }
      },
      defaultRootObject: 'index.html',
      comment: `${serviceName}-${environment}-cloudfront-admin-frontend-v4`
    })

    // 管理画面のデプロイ（ビルド済みファイルがある場合）
    // new s3deploy.BucketDeployment(this, 'AdminFrontendDeployment', {
    //   sources: [s3deploy.Source.asset('../admin-frontend/out')],
    //   destinationBucket: adminFrontendBucket,
    //   distribution,
    //   distributionPaths: ['/*']
    // })

    // 出力
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: `${serviceName}-${environment}-api-url`
    })

    new cdk.CfnOutput(this, 'AdminFrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: '管理画面URL',
      exportName: `${serviceName}-${environment}-admin-url`
    })

    new cdk.CfnOutput(this, 'AdminFrontendBucketName', {
      value: adminFrontendBucket.bucketName,
      description: '管理画面用S3バケット名',
      exportName: `${serviceName}-${environment}-admin-bucket`
    })

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: studySessionsTable.tableName,
      description: 'DynamoDB テーブル名',
      exportName: `${serviceName}-${environment}-table-name`
    })

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront ディストリビューション ID',
      exportName: `${serviceName}-${environment}-cloudfront-id`
    })
  }
}
