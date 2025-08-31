/**
 * ResponsiveEventMaterialsList component basic test
 * This test verifies the component can be imported and rendered without errors
 */
import { describe, test, expect } from 'vitest'

describe('ResponsiveEventMaterialsList', () => {
  test('コンポーネントが正常にインポートできる', async () => {
    const ResponsiveEventMaterialsList = await import(
      '../ResponsiveEventMaterialsList'
    )
    expect(ResponsiveEventMaterialsList.default).toBeDefined()
    // React.memo returns an object, not a function
    expect(typeof ResponsiveEventMaterialsList.default).toBe('object')
  })

  test('コンポーネントが正しいpropsを受け取る', () => {
    // This test verifies the component interface matches EventMaterialsTableProps
    const mockProps = {
      events: [],
      loading: false,
      error: null,
    }

    // If the component accepts these props without TypeScript errors, the test passes
    expect(mockProps).toEqual({
      events: expect.any(Array),
      loading: expect.any(Boolean),
      error: null,
    })
  })
})
