import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as iam from 'aws-cdk-lib/aws-iam'
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
  constructor(
    scope: Construct,
    id: string,
    props: StudySessionCalendarStackProps
  ) {
    super(scope, id, props)

    const {
      serviceName,
      environment,
      googleCalendarId,
      googleServiceAccountEmail,
      googlePrivateKey,
      domainName,
      hostedZoneId,
      certificateArn,
    } = props

    // 既存のCognito User Poolをインポート
    const userPool = cognito.UserPool.fromUserPoolId(
      this,
      'AdminUserPool',
      'ap-northeast-1_80yvGw2Xg'
    )

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(
      this,
      'AdminUserPoolClient',
      {
        userPool,
        userPoolClientName: `${serviceName}-${environment}-admin-client`,
        generateSecret: false, // SPAなのでシークレットは不要
        authFlows: {
          userSrp: true,
          userPassword: false,
          adminUserPassword: false,
        },
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
            implicitCodeGrant: false,
          },
          scopes: [
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.PROFILE,
          ],
          callbackUrls: [
            `https://${domainName}`,
            `https://${domainName}/`,
            'http://localhost:3001',
            'http://localhost:3001/',
          ],
          logoutUrls: [
            `https://${domainName}`,
            `https://${domainName}/`,
            'http://localhost:3001',
            'http://localhost:3001/',
          ],
        },
        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.COGNITO,
        ],
        refreshTokenValidity: cdk.Duration.days(30),
        accessTokenValidity: cdk.Duration.hours(1),
        idTokenValidity: cdk.Duration.hours(1),
      }
    )

    // 既存のCognito User Pool Domainをインポート
    const userPoolDomain = {
      domainName: `${serviceName}-${environment}-admin`,
      baseUrl: () =>
        `https://${serviceName}-${environment}-admin.auth.${this.region}.amazoncognito.com`,
    }

    // DynamoDB テーブル（既存のテーブルを参照）
    const studySessionsTable = dynamodb.Table.fromTableName(
      this,
      'StudySessionsTable',
      'hiroshima-it-calendar-prod-table-study-sessions'
    )

    // 既存のSNSトピックをインポート
    const adminNotificationTopic = sns.Topic.fromTopicArn(
      this,
      'AdminNotificationTopic',
      `arn:aws:sns:${this.region}:${this.account}:${serviceName}-${environment}-admin-notification`
    )

    // Lambda 関数用の環境変数
    const lambdaEnvironment = {
      STUDY_SESSIONS_TABLE_NAME: studySessionsTable.tableName,
      GOOGLE_CALENDAR_ID: googleCalendarId,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: googleServiceAccountEmail,
      GOOGLE_PRIVATE_KEY: googlePrivateKey,
      ENVIRONMENT: environment,
      LOG_LEVEL: 'INFO',
      SNS_TOPIC_ARN: adminNotificationTopic.topicArn,
      NOTIFICATION_ENABLED: 'true',
      ADMIN_URL: `https://${domainName}`,
    }

    // Lambda 関数
    const createStudySessionFunction = new lambda.Function(
      this,
      'CreateStudySessionFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('../admin-backend/dist'),
        handler: 'handlers/studySessionHandlers.createStudySession',
        environment: lambdaEnvironment,
        timeout: cdk.Duration.seconds(30),
        functionName: `${serviceName}-${environment}-lambda-create-study-session`,
        reservedConcurrentExecutions: 10, // 同時実行数制限でスケーリング制御
        retryAttempts: 2,
        currentVersionOptions: {
          removalPolicy: cdk.RemovalPolicy.RETAIN, // 常に維持
        },
      }
    )

    const getStudySessionsFunction = new lambda.Function(
      this,
      'GetStudySessionsFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('../admin-backend/dist'),
        handler: 'handlers/studySessionHandlers.getStudySessions',
        environment: lambdaEnvironment,
        timeout: cdk.Duration.seconds(30),
        functionName: `${serviceName}-${environment}-lambda-get-study-sessions`,
        reservedConcurrentExecutions: 10,
        retryAttempts: 2,
        currentVersionOptions: {
          removalPolicy: cdk.RemovalPolicy.RETAIN, // 常に維持
        },
      }
    )

    const approveStudySessionFunction = new lambda.Function(
      this,
      'ApproveStudySessionFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('../admin-backend/dist'),
        handler: 'handlers/studySessionHandlers.approveStudySession',
        environment: lambdaEnvironment,
        timeout: cdk.Duration.seconds(30),
        functionName: `${serviceName}-${environment}-lambda-approve-study-session`,
        reservedConcurrentExecutions: 5,
        retryAttempts: 2,
        currentVersionOptions: {
          removalPolicy: cdk.RemovalPolicy.RETAIN, // 常に維持
        },
      }
    )

    const rejectStudySessionFunction = new lambda.Function(
      this,
      'RejectStudySessionFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('../admin-backend/dist'),
        handler: 'handlers/studySessionHandlers.rejectStudySession',
        environment: lambdaEnvironment,
        timeout: cdk.Duration.seconds(30),
        functionName: `${serviceName}-${environment}-lambda-reject-study-session`,
        reservedConcurrentExecutions: 5,
        retryAttempts: 2,
        currentVersionOptions: {
          removalPolicy: cdk.RemovalPolicy.RETAIN, // 常に維持
        },
      }
    )

    const deleteStudySessionFunction = new lambda.Function(
      this,
      'DeleteStudySessionFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset('../admin-backend/dist'),
        handler: 'handlers/studySessionHandlers.deleteStudySession',
        environment: lambdaEnvironment,
        timeout: cdk.Duration.seconds(30),
        functionName: `${serviceName}-${environment}-lambda-delete-study-session`,
        reservedConcurrentExecutions: 5,
        retryAttempts: 2,
        currentVersionOptions: {
          removalPolicy: cdk.RemovalPolicy.RETAIN, // 常に維持
        },
      }
    )

    // DynamoDB テーブルへのアクセス権限を付与
    studySessionsTable.grantReadWriteData(createStudySessionFunction)
    studySessionsTable.grantReadWriteData(getStudySessionsFunction)
    studySessionsTable.grantReadWriteData(approveStudySessionFunction)
    studySessionsTable.grantReadWriteData(rejectStudySessionFunction)
    studySessionsTable.grantReadWriteData(deleteStudySessionFunction)

    // SNS トピックへの発行権限を付与（createStudySessionFunction のみ）
    adminNotificationTopic.grantPublish(createStudySessionFunction)

    // 既存のAPI Gatewayをインポート
    const api = apigateway.RestApi.fromRestApiAttributes(
      this,
      'StudySessionApi',
      {
        restApiId: 'ldtw3g3bs1',
        rootResourceId: 'api', // APIのルートリソースID
      }
    )

    // APIリソースは直接操作しない

    // 既存のAPIリソースは操作しない
    // Lambda関数のみデプロイ

    // 既存のS3バケットをインポート
    const adminFrontendBucket = s3.Bucket.fromBucketName(
      this,
      'AdminFrontendBucket',
      `${serviceName}-${environment}-s3-admin-frontend`
    )

    // Route53 ホストゾーンの参照
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'HostedZone',
      {
        hostedZoneId: hostedZoneId,
        zoneName: domainName.split('.').slice(1).join('.'), // サブドメインを除いたドメイン名
      }
    )

    // ACM証明書の参照（事前にus-east-1で作成済み）
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn
    )

    // Origin Access Control (OAC) for CloudFront
    const originAccessControl = new cloudfront.CfnOriginAccessControl(
      this,
      'OriginAccessControl',
      {
        originAccessControlConfig: {
          name: `${serviceName}-${environment}-oac`,
          originAccessControlOriginType: 's3',
          signingBehavior: 'always',
          signingProtocol: 'sigv4',
          description: `OAC for ${serviceName}-${environment}-admin-frontend`,
        },
      }
    )

    // CloudFront ディストリビューション
    const distribution = new cloudfront.Distribution(
      this,
      'AdminFrontendDistributionV4',
      {
        defaultBehavior: {
          origin:
            origins.S3BucketOrigin.withOriginAccessControl(adminFrontendBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
        additionalBehaviors: {
          '/api/*': {
            origin: new origins.HttpOrigin(
              `${api.restApiId}.execute-api.${this.region}.amazonaws.com`,
              {
                originPath: '/prod',
              }
            ),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
            responseHeadersPolicy:
              cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            compress: true,
          },
        },
        domainNames: [domainName],
        certificate: certificate,
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(30),
          },
        ],
        comment: `${serviceName}-${environment}-cloudfront-admin-frontend-v4`,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        enableIpv6: true,
      }
    )
    //         compress: true,
    //       },
    //     },
    //     domainNames: [domainName],
    //     certificate: certificate,
    //     defaultRootObject: 'index.html',
    //     errorResponses: [
    //       {
    //         httpStatus: 404,
    //         responseHttpStatus: 200,
    //         responsePagePath: '/index.html',
    //         ttl: cdk.Duration.minutes(5), // SPAのため短めに設定
    //       },
    //       {
    //         httpStatus: 403,
    //         responseHttpStatus: 200,
    //         responsePagePath: '/index.html',
    //         ttl: cdk.Duration.minutes(5),
    //       },
    //     ],
    //     comment: `${serviceName}-${environment}-cloudfront-admin-frontend`,
    //     priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // コスト最適化
    //     enableIpv6: true,
    //   }
    // )

    // S3バケットポリシーを追加（OACからのアクセスを許可）
    // 注意: インポートしたバケットにはポリシーを直接追加できないため、
    // AWS Management Consoleで手動で設定する必要があります

    // バケットポリシーの内容を出力（手動設定用）
    new cdk.CfnOutput(this, 'S3BucketPolicyJson', {
      value: JSON.stringify(
        {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'cloudfront.amazonaws.com' },
              Action: 's3:GetObject',
              Resource: `arn:aws:s3:::${adminFrontendBucket.bucketName}/*`,
              Condition: {
                StringEquals: {
                  'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
                },
              },
            },
          ],
        },
        null,
        2
      ),
      description: 'S3バケットポリシーJSON（手動設定用）',
    })

    // Route53 Aレコードの作成
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: domainName.split('.')[0], // サブドメイン部分のみ
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
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
      value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod/`,
      description: 'API Gateway URL',
      exportName: `${serviceName}-${environment}-api-url`,
    })

    new cdk.CfnOutput(this, 'AdminFrontendUrl', {
      value: `https://${domainName}`,
      description: '管理画面URL (カスタムドメイン)',
      exportName: `${serviceName}-${environment}-admin-url`,
    })

    new cdk.CfnOutput(this, 'AdminFrontendCloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: '管理画面URL (CloudFront)',
      exportName: `${serviceName}-${environment}-admin-cloudfront-url`,
    })

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront ディストリビューション ID',
      exportName: `${serviceName}-${environment}-cloudfront-id`,
    })

    new cdk.CfnOutput(this, 'AdminFrontendBucketName', {
      value: adminFrontendBucket.bucketName,
      description: '管理画面用S3バケット名',
      exportName: `${serviceName}-${environment}-admin-bucket`,
    })

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: studySessionsTable.tableName,
      description: 'DynamoDB テーブル名',
      exportName: `${serviceName}-${environment}-table-name`,
    })

    // Cognito関連の出力
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${serviceName}-${environment}-user-pool-id`,
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${serviceName}-${environment}-user-pool-client-id`,
    })

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito User Pool Domain',
      exportName: `${serviceName}-${environment}-user-pool-domain`,
    })

    // SNS関連の出力
    new cdk.CfnOutput(this, 'AdminNotificationTopicArn', {
      value: adminNotificationTopic.topicArn,
      description: '管理者通知用SNSトピックARN',
      exportName: `${serviceName}-${environment}-sns-topic-arn`,
    })
  }
}
