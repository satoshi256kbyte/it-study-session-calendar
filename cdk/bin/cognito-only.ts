#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import * as fs from 'fs'
import * as path from 'path'
import { CognitoOnlyStack } from '../lib/cognito-only-stack'

const app = new cdk.App()

// パラメータファイルの読み込み
const parametersPath = path.join(__dirname, '..', 'parameters.json')
const parametersContent = fs.readFileSync(parametersPath, 'utf8')
const parameters = JSON.parse(parametersContent)

new CognitoOnlyStack(app, 'CognitoOnlyStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
  },
  serviceName: parameters.serviceName,
  environment: parameters.environment,
  domainName: parameters.domainName
})
