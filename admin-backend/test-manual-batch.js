#!/usr/bin/env node

/**
 * 手動バッチ実行テストスクリプト
 * 要件5.5: テスト用の手動実行機能を実装
 *
 * このスクリプトは開発・テスト目的で手動バッチ更新を実行します。
 * 広島イベント発見機能を含む完全なバッチ処理をテストできます。
 */

const { manualBatchUpdate } = require('./dist/handlers/batchMaterialsHandler')

async function runManualBatch() {
  console.log('🚀 Starting manual batch update...')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('='.repeat(50))

  try {
    const result = await manualBatchUpdate()
    const responseBody = JSON.parse(result.body)

    console.log('✅ Manual batch update completed!')
    console.log('📊 Status Code:', result.statusCode)
    console.log('📋 Results:')
    console.log('  📄 Materials Update:')
    console.log(`    - Processed: ${responseBody.processedCount}`)
    console.log(`    - Success: ${responseBody.successCount}`)
    console.log(`    - Errors: ${responseBody.errorCount}`)

    if (responseBody.errors && responseBody.errors.length > 0) {
      console.log('  ❌ Errors:')
      responseBody.errors.forEach((error, index) => {
        console.log(`    ${index + 1}. ${error}`)
      })
    }

    // 要件5.5: 手動実行時の結果表示に広島イベント発見結果を含める
    if (responseBody.hiroshimaDiscovery) {
      console.log('  🏯 Hiroshima Event Discovery:')
      console.log(
        `    - Total Found: ${responseBody.hiroshimaDiscovery.totalFound}`
      )
      console.log(
        `    - New Registrations: ${responseBody.hiroshimaDiscovery.newRegistrations}`
      )
      console.log(
        `    - Duplicates Skipped: ${responseBody.hiroshimaDiscovery.duplicatesSkipped}`
      )

      if (
        responseBody.hiroshimaDiscovery.errors &&
        responseBody.hiroshimaDiscovery.errors.length > 0
      ) {
        console.log('    ❌ Discovery Errors:')
        responseBody.hiroshimaDiscovery.errors.forEach((error, index) => {
          console.log(`      ${index + 1}. ${error}`)
        })
      }

      if (
        responseBody.hiroshimaDiscovery.registeredEvents &&
        responseBody.hiroshimaDiscovery.registeredEvents.length > 0
      ) {
        console.log('    📝 Registered Events:')
        responseBody.hiroshimaDiscovery.registeredEvents.forEach(
          (event, index) => {
            console.log(`      ${index + 1}. ${event.title}`)
            console.log(`         URL: ${event.url}`)
            console.log(`         Date: ${event.datetime}`)
            console.log(`         Status: ${event.status}`)
          }
        )
      }
    }

    console.log('='.repeat(50))
    console.log('🎉 Manual batch execution completed successfully!')
  } catch (error) {
    console.error('❌ Manual batch update failed:')
    console.error('Error:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  runManualBatch()
}

module.exports = { runManualBatch }
