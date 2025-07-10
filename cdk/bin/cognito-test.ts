#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { CognitoTestStack } from '../lib/cognito-test-stack'

const app = new cdk.App()
new CognitoTestStack(app, 'CognitoTestStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
  }
})
