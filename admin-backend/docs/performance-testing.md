# パフォーマンステスト実装ガイド

## 概要

このドキュメントでは、広島イベント自動登録機能のパフォーマンステスト実装について説明します。

## 実装されたパフォーマンステスト

### 1. HiroshimaEventDiscoveryService パフォーマンステスト

**ファイル**: `src/services/__tests__/HiroshimaEventDiscoveryService.performance.test.ts`

#### テスト項目

1. **APIレート制限遵守テスト**
   - connpass APIのレート制限（5秒間隔）を遵守することを確認
   - レート制限エラーの適切な処理を確認

2. **メモリ使用量と実行時間テスト**
   - 大量イベント処理時（100件）のパフォーマンス測定
   - 混合シナリオ（新規・重複・エラー）での効率性確認
   - エラーシナリオでのパフォーマンス劣化がないことを確認

3. **並行処理テスト**
   - 通知失敗時の他プロセスへの影響がないことを確認

4. **リソースクリーンアップテスト**
   - 繰り返し実行時のメモリリークがないことを確認

#### パフォーマンス閾値

- **実行時間**: 30秒以内（警告）、60秒以内（クリティカル）
- **メモリ使用量**: 100MB以内（警告）、200MB以内（クリティカル）
- **イベント処理**: 平均10ms/イベント以内

### 2. ConnpassApiService パフォーマンステスト

**ファイル**: `src/services/__tests__/ConnpassApiService.performance.test.ts`

#### テスト項目

1. **レート制限遵守テスト**
   - 5秒間隔でのAPI呼び出し確認
   - レート制限エラーの迅速な処理確認
   - 複数検索での一貫したパフォーマンス確認

2. **メモリ使用量テスト**
   - 大量レスポンスデータの効率的処理
   - 繰り返しAPI呼び出し時のメモリリーク防止

3. **エラーハンドリングパフォーマンステスト**
   - ネットワークエラーの迅速な処理
   - 不正JSONレスポンスの効率的処理

### 3. パフォーマンス最適化ユーティリティ

**ファイル**: `src/utils/performanceOptimization.ts`

#### 提供機能

1. **PerformanceMonitor**
   - 実行時間とメモリ使用量の詳細監視
   - チェックポイント機能による段階的測定

2. **RateLimiter**
   - APIレート制限の管理
   - 呼び出し統計の取得

3. **MemoryMonitor**
   - リアルタイムメモリ監視
   - ピーク使用量の追跡

4. **BatchProcessor**
   - 効率的なバッチ処理
   - エラー耐性のある並列処理

## 実行方法

### 基本実行

```bash
# 全パフォーマンステストを実行
npm run test:performance

# 特定のテストのみ実行
npm run test:performance -- --testNamePattern="should handle large number of events efficiently"

# カバレッジ付きで実行
npm run test:performance:coverage
```

### 高度な実行

```bash
# パフォーマンステストランナーを使用
npm run test:performance:runner

# ウォッチモードで実行
npm run test:performance:watch
```

## パフォーマンス監視の統合

### HiroshimaEventDiscoveryService での使用例

```typescript
import { PerformanceMonitor, MemoryMonitor, evaluatePerformance } from '../utils/performanceOptimization'

async discoverAndRegisterEvents(): Promise<HiroshimaDiscoveryResult> {
    const performanceMonitor = new PerformanceMonitor('HiroshimaEventDiscovery')
    const memoryMonitor = new MemoryMonitor(2000)
    memoryMonitor.start()

    try {
        performanceMonitor.checkpoint('Phase1-Start-API-Search')
        // API検索処理
        performanceMonitor.checkpoint('Phase1-Complete-API-Search')

        performanceMonitor.checkpoint('Phase2-Start-Event-Processing')
        // イベント処理
        performanceMonitor.checkpoint('Phase2-Complete-Event-Processing')

    } finally {
        const performanceResult = performanceMonitor.finish()
        const memoryStats = memoryMonitor.stop()
        this.logPerformanceMetrics(performanceResult, memoryStats, eventsProcessed)
    }
}
```

## パフォーマンス評価基準

### 実行時間評価

- **良好**: 30秒以内
- **警告**: 30-60秒
- **クリティカル**: 60秒超過

### メモリ使用量評価

- **良好**: 100MB以内の増加
- **警告**: 100-200MBの増加
- **クリティカル**: 200MB超過の増加

### API呼び出し間隔

- **最小間隔**: 1秒（connpass API制限）
- **推奨間隔**: 5秒（安全マージン）

## トラブルシューティング

### よくある問題

1. **タイムアウトエラー**
   - テストタイムアウトを120秒に設定済み
   - 長時間テストには個別にタイムアウト設定

2. **メモリ不足**
   - ガベージコレクションの明示的実行
   - バッチサイズの調整

3. **モックの設定ミス**
   - 実際のサービスメソッド名との一致確認
   - 戻り値の型定義確認

### デバッグ方法

```bash
# 詳細ログ付きで実行
npm run test:performance -- --verbose

# 特定のテストファイルのみ実行
npm run test:performance -- src/services/__tests__/HiroshimaEventDiscoveryService.performance.test.ts
```

## 継続的改善

### 監視項目

1. **実行時間の推移**
2. **メモリ使用量の変化**
3. **エラー率の監視**
4. **API呼び出し効率**

### 最適化の指針

1. **バッチ処理の活用**
2. **メモリ効率的なデータ構造**
3. **適切なエラーハンドリング**
4. **リソースの適切なクリーンアップ**

## 今後の拡張

1. **負荷テストの追加**
2. **実環境でのパフォーマンス測定**
3. **自動パフォーマンス回帰テスト**
4. **CloudWatchメトリクスとの統合**
