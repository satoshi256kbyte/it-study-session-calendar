const { ConnpassApiService } = require('./dist/services/ConnpassApiService')

const service = new ConnpassApiService('test-key')
console.log(
  'searchEventsByKeyword method exists:',
  typeof service.searchEventsByKeyword === 'function'
)
