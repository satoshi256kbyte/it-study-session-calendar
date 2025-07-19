import { NotificationService } from '../../services/NotificationService'

// Simple integration test to verify NotificationService can be imported and instantiated
describe('studySessionHandlers integration', () => {
  it('should be able to import and instantiate NotificationService', () => {
    const notificationService = new NotificationService()
    expect(notificationService).toBeInstanceOf(NotificationService)
  })

  it('should have publishStudySessionNotification method', () => {
    const notificationService = new NotificationService()
    expect(typeof notificationService.publishStudySessionNotification).toBe(
      'function'
    )
  })
})
