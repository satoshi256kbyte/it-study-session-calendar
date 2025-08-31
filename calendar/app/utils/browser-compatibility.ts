/**
 * Browser compatibility utilities for responsive event materials
 * 要件5.4, 7.4: 主要ブラウザでのレスポンシブ表示テスト、タッチイベントの互換性確認
 */

/**
 * Browser detection results
 */
export interface BrowserInfo {
  name: string
  version: string
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  supportsTouch: boolean
  supportsPointer: boolean
}

/**
 * CSS feature support results
 */
export interface FeatureSupport {
  grid: boolean
  flexbox: boolean
  transforms: boolean
  transitions: boolean
  willChange: boolean
  touchAction: boolean
  overscrollBehavior: boolean
  backdropFilter: boolean
  aspectRatio: boolean
  objectFit: boolean
  stickyPosition: boolean
  scrollBehavior: boolean
  gap: boolean
  containerQueries: boolean
  customProperties: boolean
  focusVisible: boolean
  logicalProperties: boolean
}

/**
 * Detect browser information
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent
  const vendor = navigator.vendor || ''

  let name = 'unknown'
  let version = 'unknown'

  // Chrome
  if (/Chrome/.test(userAgent) && /Google Inc/.test(vendor)) {
    name = 'chrome'
    const match = userAgent.match(/Chrome\/(\d+)/)
    version = match ? match[1] : 'unknown'
  }
  // Firefox
  else if (/Firefox/.test(userAgent)) {
    name = 'firefox'
    const match = userAgent.match(/Firefox\/(\d+)/)
    version = match ? match[1] : 'unknown'
  }
  // Safari
  else if (/Safari/.test(userAgent) && /Apple Computer/.test(vendor)) {
    name = 'safari'
    const match = userAgent.match(/Version\/(\d+)/)
    version = match ? match[1] : 'unknown'
  }
  // Edge
  else if (/Edg/.test(userAgent)) {
    name = 'edge'
    const match = userAgent.match(/Edg\/(\d+)/)
    version = match ? match[1] : 'unknown'
  }
  // Legacy Edge
  else if (/Edge/.test(userAgent)) {
    name = 'edge-legacy'
    const match = userAgent.match(/Edge\/(\d+)/)
    version = match ? match[1] : 'unknown'
  }
  // Internet Explorer
  else if (/Trident/.test(userAgent)) {
    name = 'ie'
    const match = userAgent.match(/rv:(\d+)/)
    version = match ? match[1] : 'unknown'
  }

  // Device type detection
  const isMobile = /Mobi|Android/i.test(userAgent)
  const isTablet =
    /Tablet|iPad/i.test(userAgent) || (isMobile && window.innerWidth >= 768)
  const isDesktop = !isMobile && !isTablet

  // Touch and pointer support
  const supportsTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0

  const supportsPointer = 'PointerEvent' in window

  return {
    name,
    version,
    isMobile,
    isTablet,
    isDesktop,
    supportsTouch,
    supportsPointer,
  }
}

/**
 * Detect CSS feature support
 */
export function detectFeatureSupport(): FeatureSupport {
  const supports = (property: string, value: string): boolean => {
    if (typeof CSS !== 'undefined' && CSS.supports) {
      return CSS.supports(property, value)
    }

    // Fallback for browsers without CSS.supports
    const element = document.createElement('div')
    const camelCase = property.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    )

    try {
      element.style[camelCase as any] = value
      return element.style[camelCase as any] === value
    } catch {
      return false
    }
  }

  return {
    grid: supports('display', 'grid'),
    flexbox: supports('display', 'flex'),
    transforms: supports('transform', 'translateX(1px)'),
    transitions: supports('transition', 'all 0.3s'),
    willChange: supports('will-change', 'transform'),
    touchAction: supports('touch-action', 'manipulation'),
    overscrollBehavior: supports('overscroll-behavior', 'contain'),
    backdropFilter: supports('backdrop-filter', 'blur(10px)'),
    aspectRatio: supports('aspect-ratio', '1 / 1'),
    objectFit: supports('object-fit', 'cover'),
    stickyPosition: supports('position', 'sticky'),
    scrollBehavior: supports('scroll-behavior', 'smooth'),
    gap: supports('gap', '1rem'),
    containerQueries: supports('container-type', 'inline-size'),
    customProperties: supports('color', 'var(--test)'),
    focusVisible:
      'CSS' in window &&
      'supports' in CSS &&
      CSS.supports('selector(:focus-visible)'),
    logicalProperties: supports('margin-inline-start', '1rem'),
  }
}

/**
 * Apply browser-specific classes to document
 */
export function applyBrowserClasses(): void {
  const browser = detectBrowser()
  const features = detectFeatureSupport()
  const documentElement = document.documentElement

  // Add browser classes
  documentElement.classList.add(`browser-${browser.name}`)
  documentElement.classList.add(`browser-version-${browser.version}`)

  // Add device type classes
  if (browser.isMobile) documentElement.classList.add('mobile-browser')
  if (browser.isTablet) documentElement.classList.add('tablet-browser')
  if (browser.isDesktop) documentElement.classList.add('desktop-browser')

  // Add input method classes
  if (browser.supportsTouch) documentElement.classList.add('touch-enabled')
  if (browser.supportsPointer) documentElement.classList.add('pointer-enabled')

  // Add feature support classes
  Object.entries(features).forEach(([feature, supported]) => {
    const className = supported ? `has-${feature}` : `no-${feature}`
    documentElement.classList.add(className)
  })

  // Add legacy browser class for older browsers
  const isLegacyBrowser =
    browser.name === 'ie' ||
    browser.name === 'edge-legacy' ||
    (browser.name === 'safari' && parseInt(browser.version) < 14) ||
    (browser.name === 'firefox' && parseInt(browser.version) < 90) ||
    (browser.name === 'chrome' && parseInt(browser.version) < 90)

  if (isLegacyBrowser) {
    documentElement.classList.add('legacy-browser')
  }
}

/**
 * Get optimal CSS properties based on browser support
 */
export function getOptimalCSSProperties(features: FeatureSupport) {
  return {
    // Layout
    display: features.grid ? 'grid' : features.flexbox ? 'flex' : 'block',
    gap: features.gap ? '1rem' : undefined,

    // Transforms
    transform: features.transforms ? 'translateZ(0)' : undefined,
    willChange: features.willChange ? 'transform, opacity' : undefined,

    // Touch
    touchAction: features.touchAction ? 'manipulation' : undefined,
    overscrollBehavior: features.overscrollBehavior ? 'contain' : undefined,

    // Visual effects
    backdropFilter: features.backdropFilter ? 'blur(10px)' : undefined,

    // Positioning
    position: features.stickyPosition ? 'sticky' : 'relative',

    // Scrolling
    scrollBehavior: features.scrollBehavior ? 'smooth' : 'auto',
  }
}

/**
 * Create fallback styles for unsupported features
 */
export function createFallbackStyles(features: FeatureSupport): string {
  const styles: string[] = []

  // Grid fallback
  if (!features.grid && features.flexbox) {
    styles.push(`
      .responsive-grid-tablet {
        display: flex !important;
        flex-wrap: wrap;
        justify-content: space-between;
      }
      .responsive-grid-tablet .event-card-tablet {
        flex: 0 1 calc(50% - 0.75rem);
        min-width: 280px;
      }
    `)
  }

  // Transform fallback
  if (!features.transforms) {
    styles.push(`
      .event-card:hover {
        position: relative;
        top: -1px;
        transform: none !important;
      }
    `)
  }

  // Gap fallback
  if (!features.gap) {
    styles.push(`
      .responsive-grid-tablet {
        margin: -0.5rem;
      }
      .responsive-grid-tablet .event-card-tablet {
        margin: 0.5rem;
      }
    `)
  }

  // Touch action fallback
  if (!features.touchAction) {
    styles.push(`
      .touch-target-enhanced {
        -ms-touch-action: manipulation;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
    `)
  }

  // Object fit fallback
  if (!features.objectFit) {
    styles.push(`
      .event-card img {
        width: 100%;
        height: auto;
        max-height: 200px;
      }
    `)
  }

  return styles.join('\n')
}

/**
 * Inject fallback styles into the document
 */
export function injectFallbackStyles(): void {
  const features = detectFeatureSupport()
  const fallbackCSS = createFallbackStyles(features)

  if (fallbackCSS) {
    const styleElement = document.createElement('style')
    styleElement.id = 'browser-compatibility-fallbacks'
    styleElement.textContent = fallbackCSS
    document.head.appendChild(styleElement)
  }
}

/**
 * Setup touch event polyfills for older browsers
 */
export function setupTouchPolyfills(): void {
  const browser = detectBrowser()

  // Add touch event polyfill for IE and older browsers
  if (browser.name === 'ie' || browser.name === 'edge-legacy') {
    // Polyfill touch events using pointer events
    if ('PointerEvent' in window) {
      const touchEventMap = {
        pointerdown: 'touchstart',
        pointermove: 'touchmove',
        pointerup: 'touchend',
        pointercancel: 'touchcancel',
      }

      Object.entries(touchEventMap).forEach(
        ([pointerEventType, touchEventType]) => {
          document.addEventListener(pointerEventType, (e: Event) => {
            const pointerEvent = e as PointerEvent
            if (pointerEvent.pointerType === 'touch') {
              const touchEvent = new CustomEvent(touchEventType, {
                bubbles: true,
                cancelable: true,
                detail: {
                  touches: [
                    {
                      clientX: pointerEvent.clientX,
                      clientY: pointerEvent.clientY,
                      pageX: pointerEvent.pageX,
                      pageY: pointerEvent.pageY,
                    },
                  ],
                },
              })
              pointerEvent.target?.dispatchEvent(touchEvent)
            }
          })
        }
      )
    }
  }
}

/**
 * Setup resize event optimization for better performance
 */
export function setupResizeOptimization(): void {
  let resizeTimer: NodeJS.Timeout | null = null
  const optimizedResize = new CustomEvent('optimizedResize')

  window.addEventListener('resize', () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }

    resizeTimer = setTimeout(() => {
      window.dispatchEvent(optimizedResize)
    }, 150)
  })
}

/**
 * Setup orientation change handling for mobile devices
 */
export function setupOrientationHandling(): void {
  const browser = detectBrowser()

  if (browser.isMobile || browser.isTablet) {
    let orientationTimer: NodeJS.Timeout | null = null

    const handleOrientationChange = () => {
      if (orientationTimer) {
        clearTimeout(orientationTimer)
      }

      // Delay to allow browser to update viewport dimensions
      orientationTimer = setTimeout(() => {
        const optimizedOrientationChange = new CustomEvent(
          'optimizedOrientationChange'
        )
        window.dispatchEvent(optimizedOrientationChange)
      }, 100)
    }

    // Listen for both orientationchange and resize events
    window.addEventListener('orientationchange', handleOrientationChange)

    // Fallback for browsers that don't support orientationchange
    if (typeof window !== 'undefined' && !('onorientationchange' in window)) {
      const win = window as any
      let lastWidth = win.innerWidth

      win.addEventListener('resize', () => {
        const currentWidth = win.innerWidth
        const widthDifference = Math.abs(currentWidth - lastWidth)

        // Significant width change likely indicates orientation change
        if (widthDifference > 100) {
          handleOrientationChange()
          lastWidth = currentWidth
        }
      })
    }
  }
}

/**
 * Initialize all browser compatibility features
 */
export function initializeBrowserCompatibility(): void {
  // Apply browser-specific classes
  applyBrowserClasses()

  // Inject fallback styles
  injectFallbackStyles()

  // Setup polyfills and optimizations
  setupTouchPolyfills()
  setupResizeOptimization()
  setupOrientationHandling()

  // Import browser compatibility CSS
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/styles/browser-compatibility.css'
  document.head.appendChild(link)
}

/**
 * Check if current browser needs performance optimizations
 */
export function needsPerformanceOptimizations(): boolean {
  const browser = detectBrowser()
  const features = detectFeatureSupport()

  return (
    browser.name === 'ie' ||
    browser.name === 'edge-legacy' ||
    (browser.name === 'safari' && parseInt(browser.version) < 14) ||
    (browser.name === 'firefox' && parseInt(browser.version) < 90) ||
    (browser.name === 'chrome' && parseInt(browser.version) < 90) ||
    !features.transforms ||
    !features.willChange ||
    browser.isMobile
  )
}

/**
 * Get recommended animation settings based on browser capabilities
 */
export function getAnimationSettings(): {
  duration: number
  easing: string
  useTransforms: boolean
  useWillChange: boolean
} {
  const features = detectFeatureSupport()
  const needsOptimization = needsPerformanceOptimizations()

  return {
    duration: needsOptimization ? 150 : 300,
    easing: features.transitions ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'ease',
    useTransforms: features.transforms,
    useWillChange: features.willChange && !needsOptimization,
  }
}

/**
 * Export browser and feature information for debugging
 */
export function getBrowserCompatibilityInfo(): {
  browser: BrowserInfo
  features: FeatureSupport
  needsOptimization: boolean
  animationSettings: ReturnType<typeof getAnimationSettings>
} {
  return {
    browser: detectBrowser(),
    features: detectFeatureSupport(),
    needsOptimization: needsPerformanceOptimizations(),
    animationSettings: getAnimationSettings(),
  }
}
