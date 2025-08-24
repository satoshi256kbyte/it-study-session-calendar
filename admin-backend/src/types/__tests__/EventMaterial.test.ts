import {
  Material,
  EventWithMaterials,
  EventMaterialsResponse,
  isValidEventWithMaterials,
  isValidMaterial,
  ConnpassPresentationData,
  ConnpassPresentationsResponse,
} from '../EventMaterial'

describe('EventMaterial Types', () => {
  describe('Material interface', () => {
    it('should accept valid material data', () => {
      const validMaterial: Material = {
        id: 'material-1',
        title: 'Test Slide',
        url: 'https://example.com/slide.pdf',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        type: 'slide',
        createdAt: '2024-01-01T00:00:00Z',
      }

      expect(isValidMaterial(validMaterial)).toBe(true)
    })

    it('should accept material without thumbnailUrl', () => {
      const materialWithoutThumbnail: Material = {
        id: 'material-2',
        title: 'Test Document',
        url: 'https://example.com/doc.pdf',
        type: 'document',
        createdAt: '2024-01-01T00:00:00Z',
      }

      expect(isValidMaterial(materialWithoutThumbnail)).toBe(true)
    })

    it('should reject invalid material type', () => {
      const invalidMaterial = {
        id: 'material-3',
        title: 'Test',
        url: 'https://example.com/test',
        type: 'invalid-type',
        createdAt: '2024-01-01T00:00:00Z',
      }

      expect(isValidMaterial(invalidMaterial)).toBe(false)
    })
  })

  describe('EventWithMaterials interface', () => {
    it('should accept valid event with materials', () => {
      const validEvent: EventWithMaterials = {
        id: 'event-1',
        title: 'Test Event',
        eventDate: '2024-01-01T10:00:00Z',
        eventUrl: 'https://example.com/event',
        connpassUrl: 'https://connpass.com/event/123/',
        materials: [
          {
            id: 'material-1',
            title: 'Test Slide',
            url: 'https://example.com/slide.pdf',
            type: 'slide',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      expect(isValidEventWithMaterials(validEvent)).toBe(true)
    })

    it('should reject event without connpass URL', () => {
      const eventWithoutConnpass = {
        id: 'event-2',
        title: 'Test Event',
        eventDate: '2024-01-01T10:00:00Z',
        eventUrl: 'https://example.com/event',
        materials: [
          {
            id: 'material-1',
            title: 'Test Slide',
            url: 'https://example.com/slide.pdf',
            type: 'slide',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      expect(isValidEventWithMaterials(eventWithoutConnpass)).toBe(false)
    })

    it('should reject event without materials', () => {
      const eventWithoutMaterials = {
        id: 'event-3',
        title: 'Test Event',
        eventDate: '2024-01-01T10:00:00Z',
        eventUrl: 'https://example.com/event',
        connpassUrl: 'https://connpass.com/event/123/',
        materials: [],
      }

      expect(isValidEventWithMaterials(eventWithoutMaterials)).toBe(false)
    })
  })

  describe('EventMaterialsResponse interface', () => {
    it('should accept valid response structure', () => {
      const validResponse: EventMaterialsResponse = {
        count: 1,
        total: 10,
        events: [
          {
            id: 'event-1',
            title: 'Test Event',
            eventDate: '2024-01-01T10:00:00Z',
            eventUrl: 'https://example.com/event',
            connpassUrl: 'https://connpass.com/event/123/',
            materials: [
              {
                id: 'material-1',
                title: 'Test Slide',
                url: 'https://example.com/slide.pdf',
                type: 'slide',
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
          },
        ],
      }

      expect(validResponse.count).toBe(1)
      expect(validResponse.total).toBe(10)
      expect(validResponse.events).toHaveLength(1)
      expect(isValidEventWithMaterials(validResponse.events[0])).toBe(true)
    })
  })

  describe('ConnpassPresentationData interface', () => {
    it('should accept valid connpass presentation data', () => {
      const validPresentation: ConnpassPresentationData = {
        title: 'Test Presentation',
        url: 'https://example.com/presentation',
        thumbnail_url: 'https://example.com/thumb.jpg',
        type: 'slide',
      }

      expect(validPresentation.title).toBe('Test Presentation')
      expect(validPresentation.url).toBe('https://example.com/presentation')
      expect(validPresentation.thumbnail_url).toBe(
        'https://example.com/thumb.jpg'
      )
    })

    it('should accept presentation without thumbnail', () => {
      const presentationWithoutThumbnail: ConnpassPresentationData = {
        title: 'Test Presentation',
        url: 'https://example.com/presentation',
      }

      expect(presentationWithoutThumbnail.title).toBe('Test Presentation')
      expect(presentationWithoutThumbnail.thumbnail_url).toBeUndefined()
    })
  })

  describe('ConnpassPresentationsResponse interface', () => {
    it('should accept valid connpass API response', () => {
      const validResponse: ConnpassPresentationsResponse = {
        results_returned: 2,
        results_available: 5,
        results_start: 1,
        presentations: [
          {
            title: 'Presentation 1',
            url: 'https://example.com/pres1',
          },
          {
            title: 'Presentation 2',
            url: 'https://example.com/pres2',
            thumbnail_url: 'https://example.com/thumb2.jpg',
          },
        ],
      }

      expect(validResponse.results_returned).toBe(2)
      expect(validResponse.presentations).toHaveLength(2)
    })
  })
})
