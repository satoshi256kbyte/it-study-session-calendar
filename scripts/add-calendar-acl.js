const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

// パラメータファイルを読み込み
const parametersPath = path.join(__dirname, '../cdk/parameters.json')
const parameters = JSON.parse(fs.readFileSync(parametersPath, 'utf8'))

async function addCalendarACL() {
  try {
    // サービスアカウントの認証情報を設定
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: 'it-study-session-calendar',
        private_key_id: '',
        private_key: parameters.googlePrivateKey,
        client_email: parameters.googleServiceAccountEmail,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url:
          'https://www.googleapis.com/oauth2/v1/certs',
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // ACLを追加
    const aclResource = {
      role: 'owner', // owner権限を付与
      scope: {
        type: 'user',
        value: 'satoshi256kbyte@gmail.com',
      },
    }

    console.log('Adding ACL to calendar...')
    console.log('Calendar ID:', parameters.googleCalendarId)
    console.log('User:', aclResource.scope.value)
    console.log('Role:', aclResource.role)

    const response = await calendar.acl.insert({
      calendarId: parameters.googleCalendarId,
      resource: aclResource,
    })

    console.log('ACL added successfully!')
    console.log('Response:', response.data)

    // 現在のACL一覧を表示
    console.log('\nCurrent ACL list:')
    const aclList = await calendar.acl.list({
      calendarId: parameters.googleCalendarId,
    })

    aclList.data.items.forEach((acl, index) => {
      console.log(`${index + 1}. ${acl.scope.value} - ${acl.role}`)
    })
  } catch (error) {
    console.error('Error adding ACL:', error.message)
    if (error.response) {
      console.error('Response data:', error.response.data)
    }
  }
}

addCalendarACL()
