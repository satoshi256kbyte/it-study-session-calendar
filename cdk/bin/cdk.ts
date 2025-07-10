#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import * as fs from 'fs'
import * as path from 'path'
import { StudySessionCalendarStack } from '../lib/study-session-calendar-stack'

const app = new cdk.App()

// パラメータファイルの読み込み
const parametersPath = path.join(__dirname, '..', 'parameters.json')

if (!fs.existsSync(parametersPath)) {
  console.error('❌ parameters.json が見つかりません。')
  console.error('📝 parameters.sample.json をコピーして parameters.json を作成し、適切な値を設定してください。')
  console.error('')
  console.error('コマンド例:')
  console.error('  cp parameters.sample.json parameters.json')
  console.error('  # parameters.json を編集して適切な値を設定')
  process.exit(1)
}

let parameters: any
try {
  const parametersContent = fs.readFileSync(parametersPath, 'utf8')
  parameters = JSON.parse(parametersContent)
} catch (error) {
  console.error('❌ parameters.json の読み込みに失敗しました:', error)
  process.exit(1)
}

// 必須パラメータの検証
const requiredParams = ['serviceName', 'environment', 'googleCalendarId', 'googleServiceAccountEmail', 'googlePrivateKey', 'domainName', 'hostedZoneId', 'certificateArn']
const missingParams = requiredParams.filter(param => !parameters[param])

if (missingParams.length > 0) {
  console.error('❌ 以下の必須パラメータが不足しています:')
  missingParams.forEach(param => console.error(`  - ${param}`))
  console.error('')
  console.error('📝 parameters.json を確認して、すべての必須パラメータを設定してください。')
  process.exit(1)
}

// 環境名の検証
const validEnvironments = ['dev', 'stg', 'prod']
if (!validEnvironments.includes(parameters.environment)) {
  console.error(`❌ 環境名は ${validEnvironments.join(', ')} のいずれかを指定してください。`)
  console.error(`現在の値: ${parameters.environment}`)
  process.exit(1)
}

// スタック名の決定
const stackName = `${parameters.serviceName}-${parameters.environment}-stack`

new StudySessionCalendarStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
  },
  serviceName: parameters.serviceName,
  environment: parameters.environment,
  googleCalendarId: parameters.googleCalendarId,
  googleServiceAccountEmail: parameters.googleServiceAccountEmail,
  googlePrivateKey: parameters.googlePrivateKey,
  domainName: parameters.domainName,
  hostedZoneId: parameters.hostedZoneId,
  certificateArn: parameters.certificateArn
})
