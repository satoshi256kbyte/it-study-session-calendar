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

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'AdminUserPool', {
      userPoolName: `${serviceName}-${environment}-admin-user-pool`,
      selfSignUpEnabled: false, // 管理者のみなので自己登録は無効
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
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
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
    })

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

    // Cognito User Pool Domain
    const userPoolDomain = new cognito.UserPoolDomain(
      this,
      'AdminUserPoolDomain',
      {
        userPool,
        cognitoDomain: {
          domainPrefix: `${serviceName}-${environment}-admin`,
        },
      }
    )

    // DynamoDB テーブル
    const studySessionsTable = new dynamodb.Table(this, 'StudySessionsTable', {
      tableName: `${serviceName}-${environment}-table-study-sessions`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // GSI for status-based queries
    studySessionsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    })

    // Lambda 関数用の環境変数
    const lambdaEnvironment = {
      STUDY_SESSIONS_TABLE_NAME: studySessionsTable.tableName,
      GOOGLE_CALENDAR_ID: googleCalendarId,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: googleServiceAccountEmail,
      GOOGLE_PRIVATE_KEY: googlePrivateKey,
      ENVIRONMENT: environment,
      LOG_LEVEL: 'INFO',
    }

    // Lambda Layer for dependencies
    const dependenciesLayer = new lambda.LayerVersion(
      this,
      'DependenciesLayer',
      {
        code: lambda.Code.fromAsset('../admin-backend', {
          bundling: {
            image: lambda.Runtime.NODEJS_20_X.bundlingImage,
            command: [
              'bash',
              '-c',
              [
                'echo "Starting bundling process..."',
                'ls -la',
                'echo "Installing dependencies..."',
                'npm ci --production --ignore-engines || npm install --production --ignore-engines',
                'echo "Creating output directory..."',
                'mkdir -p /asset-output/nodejs',
                'echo "Copying node_modules..."',
                'cp -r node_modules /asset-output/nodejs/ || echo "No node_modules found"',
                'echo "Copying package.json..."',
                'cp package.json /asset-output/nodejs/ || echo "No package.json found"',
                'echo "Listing output directory..."',
                'ls -la /asset-output/',
                'ls -la /asset-output/nodejs/ || echo "nodejs directory not found"',
                'echo "Bundling complete"',
              ].join(' && '),
            ],
            user: 'root', // Docker内でroot権限を使用
          },
        }),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        description: 'Dependencies layer for study session functions',
        layerVersionName: `${serviceName}-${environment}-layer-dependencies`,
      }
    )

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
        layers: [dependenciesLayer],
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
        layers: [dependenciesLayer],
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
        layers: [dependenciesLayer],
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
        layers: [dependenciesLayer],
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
        layers: [dependenciesLayer],
      }
    )

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
          'User-Agent',
        ],
        exposeHeaders: [
          'Access-Control-Allow-Origin',
          'Access-Control-Allow-Headers',
          'Access-Control-Allow-Methods',
        ],
        maxAge: cdk.Duration.hours(1),
      },
    })

    // /api リソース
    const apiResource = api.root.addResource('api')

    // エンドユーザー向けAPI: /api/study-sessions
    const studySessionsResource = apiResource.addResource('study-sessions', {
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'https://satoshi256kbyte.github.io',
          'http://localhost:3000',
        ],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Requested-With',
          'Accept',
          'Origin',
        ],
      },
    })
    studySessionsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createStudySessionFunction)
    )

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
          'Origin',
        ],
      },
    })
    const adminStudySessionsResource = adminResource.addResource(
      'study-sessions',
      {
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
            'Origin',
          ],
        },
      }
    )
    adminStudySessionsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getStudySessionsFunction)
    )

    const adminStudySessionResource =
      adminStudySessionsResource.addResource('{id}')
    const approveResource = adminStudySessionResource.addResource('approve')
    const rejectResource = adminStudySessionResource.addResource('reject')
    const deleteResource = adminStudySessionResource.addResource('delete')

    approveResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(approveStudySessionFunction)
    )
    rejectResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(rejectStudySessionFunction)
    )
    deleteResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(deleteStudySessionFunction)
    )

    // S3 バケット（管理画面用）
    const adminFrontendBucket = new s3.Bucket(this, 'AdminFrontendBucket', {
      bucketName: `${serviceName}-${environment}-s3-admin-frontend`,
      publicReadAccess: false, // CloudFront経由でのみアクセス
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod', // 本番以外では自動削除
      versioned: environment === 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
    })

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OriginAccessIdentity',
      {
        comment: `OAI for ${serviceName}-${environment}-admin-frontend`,
      }
    )

    // S3バケットポリシーを追加（CloudFrontからのアクセスを許可）
    adminFrontendBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [adminFrontendBucket.arnForObjects('*')],
        principals: [
          new iam.CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
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

    // CloudFront ディストリビューション
    const distribution = new cloudfront.Distribution(
      this,
      'AdminFrontendDistributionV4',
      {
        defaultBehavior: {
          origin: new origins.S3Origin(adminFrontendBucket, {
            originAccessIdentity: originAccessIdentity,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
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
            cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
            compress: true,
          },
        },
        domainNames: [domainName],
        certificate: certificate,
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(30),
          },
        ],
        comment: `${serviceName}-${environment}-cloudfront-admin-frontend-v4`,
      }
    )

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
      value: api.url,
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

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront ディストリビューション ID',
      exportName: `${serviceName}-${environment}-cloudfront-id`,
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
  }
}
