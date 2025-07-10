import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import { Construct } from 'constructs'

export interface StudySessionCalendarStackProps extends cdk.StackProps {
  serviceName: string
  environment: string
  googleCalendarId: string
  googleServiceAccountEmail: string
  googlePrivateKey: string
  domainName: string
  hostedZoneId: string
  certificateArn: string
}

export class StudySessionCalendarStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StudySessionCalendarStackProps) {
    super(scope, id, props)

    const { serviceName, environment, googleCalendarId, googleServiceAccountEmail, googlePrivateKey, domainName, hostedZoneId, certificateArn } = props

    // DynamoDB テーブル（既存のテーブルを参照）
    const studySessionsTable = dynamodb.Table.fromTableName(
      this, 
      'StudySessionsTable', 
      'hiroshima-it-calendar-prod-table-study-sessions'
    )

    // Lambda 関数用の環境変数
    const lambdaEnvironment = {
      STUDY_SESSIONS_TABLE_NAME: studySessionsTable.tableName,
      GOOGLE_CALENDAR_ID: googleCalendarId,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: googleServiceAccountEmail,
      GOOGLE_PRIVATE_KEY: googlePrivateKey,
      ENVIRONMENT: environment
    }

    // Lambda 関数
    const createStudySessionFunction = new nodejs.NodejsFunction(this, 'CreateStudySessionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: '../admin-backend/src/handlers/studySessionHandlers.ts',
      handler: 'createStudySession',
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-create-study-session`,
      bundling: {
        externalModules: ['aws-sdk']
      }
    })

    const getStudySessionsFunction = new nodejs.NodejsFunction(this, 'GetStudySessionsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: '../admin-backend/src/handlers/studySessionHandlers.ts',
      handler: 'getStudySessions',
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-get-study-sessions`,
      bundling: {
        externalModules: ['aws-sdk']
      }
    })

    const approveStudySessionFunction = new nodejs.NodejsFunction(this, 'ApproveStudySessionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: '../admin-backend/src/handlers/studySessionHandlers.ts',
      handler: 'approveStudySession',
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-approve-study-session`,
      bundling: {
        externalModules: ['aws-sdk']
      }
    })

    const rejectStudySessionFunction = new nodejs.NodejsFunction(this, 'RejectStudySessionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: '../admin-backend/src/handlers/studySessionHandlers.ts',
      handler: 'rejectStudySession',
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-reject-study-session`,
      bundling: {
        externalModules: ['aws-sdk']
      }
    })

    const deleteStudySessionFunction = new nodejs.NodejsFunction(this, 'DeleteStudySessionFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: '../admin-backend/src/handlers/studySessionHandlers.ts',
      handler: 'deleteStudySession',
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      functionName: `${serviceName}-${environment}-lambda-delete-study-session`,
      bundling: {
        externalModules: ['aws-sdk']
      }
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
    const studySessionsResource = apiResource.addResource('study-sessions', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://satoshi256kbyte.github.io', 'http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Requested-With',
          'Accept',
          'Origin'
        ]
      }
    })
    studySessionsResource.addMethod('POST', new apigateway.LambdaIntegration(createStudySessionFunction))

    // 管理者向けAPI: /api/admin
    const adminResource = apiResource.addResource('admin', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Requested-With',
          'Accept',
          'Origin'
        ]
      }
    })
    const adminStudySessionsResource = adminResource.addResource('study-sessions', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Requested-With',
          'Accept',
          'Origin'
        ]
      }
    })
    adminStudySessionsResource.addMethod('GET', new apigateway.LambdaIntegration(getStudySessionsFunction))

    const adminStudySessionResource = adminStudySessionsResource.addResource('{id}')
    const approveResource = adminStudySessionResource.addResource('approve')
    const rejectResource = adminStudySessionResource.addResource('reject')
    const deleteResource = adminStudySessionResource.addResource('delete')

    approveResource.addMethod('POST', new apigateway.LambdaIntegration(approveStudySessionFunction))
    rejectResource.addMethod('POST', new apigateway.LambdaIntegration(rejectStudySessionFunction))
    deleteResource.addMethod('POST', new apigateway.LambdaIntegration(deleteStudySessionFunction))

    // S3 バケット（既存のバケットを参照）
    const adminFrontendBucket = s3.Bucket.fromBucketName(
      this, 
      'AdminFrontendBucket', 
      'hiroshima-it-calendar-prod-s3-admin-frontend'
    )

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: `OAI for ${serviceName}-${environment}-admin-frontend`
    })

    // S3バケットポリシーを追加（CloudFrontからのアクセスを許可）
    const bucketPolicyStatement = new cdk.aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${adminFrontendBucket.bucketArn}/*`],
      principals: [new cdk.aws_iam.CanonicalUserPrincipal(originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
    })

    adminFrontendBucket.addToResourcePolicy(bucketPolicyStatement)

    // Route53 ホストゾーンの参照
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: hostedZoneId,
      zoneName: domainName.split('.').slice(1).join('.') // サブドメインを除いたドメイン名
    })

    // ACM証明書の参照（事前にus-east-1で作成済み）
    const certificate = acm.Certificate.fromCertificateArn(
      this, 
      'Certificate',
      certificateArn
    )

    // CloudFront ディストリビューション
    const distribution = new cloudfront.Distribution(this, 'AdminFrontendDistributionV4', {
      defaultBehavior: {
        origin: new origins.S3Origin(adminFrontendBucket, {
          originAccessIdentity: originAccessIdentity
        }),
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
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true
        }
      },
      domainNames: [domainName],
      certificate: certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30)
        }
      ],
      comment: `${serviceName}-${environment}-cloudfront-admin-frontend-v4`
    })

    // Route53 Aレコードの作成
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: domainName.split('.')[0], // サブドメイン部分のみ
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
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
      value: `https://${domainName}`,
      description: '管理画面URL (カスタムドメイン)',
      exportName: `${serviceName}-${environment}-admin-url`
    })

    new cdk.CfnOutput(this, 'AdminFrontendCloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: '管理画面URL (CloudFront)',
      exportName: `${serviceName}-${environment}-admin-cloudfront-url`
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
