const { ConnpassApiService } = require('./dist/services/ConnpassApiService')

const service = new ConnpassApiService('test-key')
console.log(
  'searchEvents method exists:',
  typeof service.searchEvents === 'function'
)
