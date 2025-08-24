import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SWRConfig } from 'swr'

/**
 * SWRプロバイダーでラップしたテスト用レンダー関数
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        focusThrottleInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
