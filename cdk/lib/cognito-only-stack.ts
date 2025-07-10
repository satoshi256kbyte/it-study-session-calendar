import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

export interface CognitoOnlyStackProps extends cdk.StackProps {
  serviceName: string
  environment: string
  domainName: string
}

export class CognitoOnlyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CognitoOnlyStackProps) {
    super(scope, id, props)

    const { serviceName, environment, domainName } = props

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'AdminUserPool', {
      userPoolName: `${serviceName}-${environment}-admin-user-pool`,
      selfSignUpEnabled: false, // 管理者のみなので自己登録は無効
      signInAliases: {
        email: true,
        username: true
      },
      autoVerify: {
        email: true
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true
        }
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY // 開発環境用
    })

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'AdminUserPoolClient', {
      userPool,
      userPoolClientName: `${serviceName}-${environment}-admin-client`,
      generateSecret: false, // SPAなのでシークレットは不要
      authFlows: {
        userSrp: true,
        userPassword: false,
        adminUserPassword: false
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE
        ],
        callbackUrls: [
          `https://${domainName}`,
          `https://${domainName}/`,
          'http://localhost:3001',
          'http://localhost:3001/'
        ],
        logoutUrls: [
          `https://${domainName}`,
          `https://${domainName}/`,
          'http://localhost:3001',
          'http://localhost:3001/'
        ]
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO
      ],
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1)
    })

    // Cognito User Pool Domain
    const userPoolDomain = new cognito.UserPoolDomain(this, 'AdminUserPoolDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix: `${serviceName}-${environment}-admin`
      }
    })

    // Cognito関連の出力
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${serviceName}-${environment}-user-pool-id`
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${serviceName}-${environment}-user-pool-client-id`
    })

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito User Pool Domain',
      exportName: `${serviceName}-${environment}-user-pool-domain`
    })
  }
}
