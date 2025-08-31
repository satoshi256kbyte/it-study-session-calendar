'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * 画像最適化設定の型定義
 */
export interface ImageOptimizationSettings {
  /** 遅延読み込みを有効にするか */
  lazyLoading: boolean
  /** レスポンシブ画像を使用するか */
  responsiveImages: boolean
  /** 画質設定 (0-100) */
  quality: number
  /** WebP形式を使用するか */
  useWebP: boolean
  /** プレースホルダーを表示するか */
  showPlaceholder: boolean
  /** 画像圧縮レベル */
  compressionLevel: 'low' | 'medium' | 'high'
}

/**
 * デバイス情報の型定義
 */
export interface DeviceInfo {
  /** 接続速度 */
  connectionSpeed: 'slow' | 'fast' | 'unknown'
  /** データセーバーモードが有効か */
  dataSaver: boolean
  /** デバイスメモリ（GB） */
  deviceMemory: number
  /** 画面の解像度 */
  screenResolution: { width: number; height: number }
  /** デバイスピクセル比 */
  devicePixelRatio: number
}

/**
 * 画像最適化フックの戻り値
 */
export interface UseImageOptimizationReturn {
  /** 現在の最適化設定 */
  settings: ImageOptimizationSettings
  /** デバイス情報 */
  deviceInfo: DeviceInfo
  /** 画像URLを最適化する関数 */
  optimizeImageUrl: (baseUrl: string, width?: number, height?: number) => string
  /** 画像サイズを計算する関数 */
  calculateOptimalSize: (
    containerWidth: number,
    containerHeight: number
  ) => { width: number; height: number }
  /** 設定を更新する関数 */
  updateSettings: (newSettings: Partial<ImageOptimizationSettings>) => void
}

/**
 * デフォルトの最適化設定
 */
const DEFAULT_SETTINGS: ImageOptimizationSettings = {
  lazyLoading: true,
  responsiveImages: true,
  quality: 80,
  useWebP: true,
  showPlaceholder: true,
  compressionLevel: 'medium',
}

/**
 * 画像最適化カスタムフック
 * 要件7.3: 画像とサムネイルの最適化
 */
export function useImageOptimization(): UseImageOptimizationReturn {
  const [settings, setSettings] =
    useState<ImageOptimizationSettings>(DEFAULT_SETTINGS)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    connectionSpeed: 'unknown',
    dataSaver: false,
    deviceMemory: 4,
    screenResolution: { width: 1920, height: 1080 },
    devicePixelRatio: 1,
  })

  /**
   * デバイス情報を取得
   * 要件7.3: デバイスに適したサイズで配信
   */
  const detectDeviceInfo = useCallback(() => {
    if (typeof window === 'undefined') return

    const info: DeviceInfo = {
      connectionSpeed: 'unknown',
      dataSaver: false,
      deviceMemory: 4,
      screenResolution: {
        width: window.screen.width,
        height: window.screen.height,
      },
      devicePixelRatio: window.devicePixelRatio || 1,
    }

    // Network Information API（実験的機能）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        // 接続速度の判定
        if (connection.effectiveType) {
          const effectiveType = connection.effectiveType
          info.connectionSpeed = ['slow-2g', '2g'].includes(effectiveType)
            ? 'slow'
            : 'fast'
        }

        // データセーバーモードの検出
        if ('saveData' in connection) {
          info.dataSaver = connection.saveData
        }
      }
    }

    // Device Memory API（実験的機能）
    if ('deviceMemory' in navigator) {
      info.deviceMemory = (navigator as any).deviceMemory || 4
    }

    setDeviceInfo(info)
  }, [])

  /**
   * 設定を自動調整
   * 要件7.3: デバイスに応じた最適化
   */
  const autoAdjustSettings = useCallback((info: DeviceInfo) => {
    const adjustedSettings: ImageOptimizationSettings = { ...DEFAULT_SETTINGS }

    // 低速接続またはデータセーバーモードの場合
    if (info.connectionSpeed === 'slow' || info.dataSaver) {
      adjustedSettings.quality = 60
      adjustedSettings.compressionLevel = 'high'
      adjustedSettings.useWebP = true
      adjustedSettings.responsiveImages = true
    }

    // 低メモリデバイスの場合
    if (info.deviceMemory < 2) {
      adjustedSettings.quality = 70
      adjustedSettings.compressionLevel = 'high'
      adjustedSettings.lazyLoading = true
    }

    // 高解像度ディスプレイの場合
    if (info.devicePixelRatio > 2) {
      adjustedSettings.quality = 85
      adjustedSettings.compressionLevel = 'medium'
    }

    setSettings(adjustedSettings)
  }, [])

  /**
   * 初期化処理
   */
  useEffect(() => {
    detectDeviceInfo()
  }, [detectDeviceInfo])

  /**
   * デバイス情報に基づく設定の自動調整
   */
  useEffect(() => {
    autoAdjustSettings(deviceInfo)
  }, [deviceInfo, autoAdjustSettings])

  /**
   * 画像URLを最適化
   * 要件7.3: 画像サイズの動的調整機能
   */
  const optimizeImageUrl = useCallback(
    (baseUrl: string, width?: number, height?: number): string => {
      if (!baseUrl) return ''

      const url = new URL(baseUrl, window.location.origin)
      const params = new URLSearchParams()

      // サイズ指定
      if (width) {
        params.set(
          'w',
          Math.round(width * deviceInfo.devicePixelRatio).toString()
        )
      }
      if (height) {
        params.set(
          'h',
          Math.round(height * deviceInfo.devicePixelRatio).toString()
        )
      }

      // 画質設定
      params.set('q', settings.quality.toString())

      // フォーマット設定
      if (settings.useWebP && supportsWebP()) {
        params.set('f', 'webp')
      }

      // 圧縮レベル
      const compressionMap = { low: 1, medium: 2, high: 3 }
      params.set('c', compressionMap[settings.compressionLevel].toString())

      // パラメータを追加
      params.forEach((value, key) => {
        url.searchParams.set(key, value)
      })

      return url.toString()
    },
    [settings, deviceInfo]
  )

  /**
   * 最適なサイズを計算
   * 要件7.3: 画像サイズの動的調整機能
   */
  const calculateOptimalSize = useCallback(
    (
      containerWidth: number,
      containerHeight: number
    ): { width: number; height: number } => {
      const pixelRatio = deviceInfo.devicePixelRatio
      const memoryFactor = Math.min(deviceInfo.deviceMemory / 4, 1)
      const connectionFactor = deviceInfo.connectionSpeed === 'slow' ? 0.7 : 1

      const optimalWidth = Math.round(
        containerWidth * pixelRatio * memoryFactor * connectionFactor
      )
      const optimalHeight = Math.round(
        containerHeight * pixelRatio * memoryFactor * connectionFactor
      )

      return {
        width: Math.max(optimalWidth, 100), // 最小サイズを保証
        height: Math.max(optimalHeight, 100),
      }
    },
    [deviceInfo]
  )

  /**
   * 設定を更新
   */
  const updateSettings = useCallback(
    (newSettings: Partial<ImageOptimizationSettings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }))
    },
    []
  )

  return {
    settings,
    deviceInfo,
    optimizeImageUrl,
    calculateOptimalSize,
    updateSettings,
  }
}

/**
 * WebP対応チェック
 */
function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1

  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

/**
 * レスポンシブ画像サイズ計算フック
 * 要件7.3: レスポンシブ画像の実装
 */
export function useResponsiveImageSizes(breakpoints: {
  mobile: number
  tablet: number
  desktop: number
}) {
  const { deviceInfo, calculateOptimalSize } = useImageOptimization()

  const responsiveSizes = useMemo(() => {
    const { width } = deviceInfo.screenResolution

    let containerSize: number
    if (width < 768) {
      containerSize = breakpoints.mobile
    } else if (width < 1024) {
      containerSize = breakpoints.tablet
    } else {
      containerSize = breakpoints.desktop
    }

    return calculateOptimalSize(containerSize, containerSize * 0.75) // 4:3 aspect ratio
  }, [breakpoints, deviceInfo.screenResolution, calculateOptimalSize])

  return responsiveSizes
}

/**
 * 画像プリロードフック
 * 要件7.3: パフォーマンス最適化
 */
export function useImagePreload(urls: string[], priority: boolean = false) {
  const [preloadedUrls, setPreloadedUrls] = useState<Set<string>>(new Set())
  const { optimizeImageUrl } = useImageOptimization()

  const preloadImages = useCallback(
    (imagesToPreload: string[]) => {
      imagesToPreload.forEach(url => {
        if (preloadedUrls.has(url)) return

        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = optimizeImageUrl(url, 400, 300) // 標準サイズでプリロード

        if (priority) {
          link.setAttribute('fetchpriority', 'high')
        }

        document.head.appendChild(link)

        setPreloadedUrls(prev => new Set([...prev, url]))
      })
    },
    [preloadedUrls, optimizeImageUrl, priority]
  )

  useEffect(() => {
    if (urls.length > 0) {
      preloadImages(urls)
    }
  }, [urls, preloadImages])

  return { preloadedUrls: Array.from(preloadedUrls) }
}
