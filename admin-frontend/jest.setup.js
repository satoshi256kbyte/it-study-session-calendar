import '@testing-library/jest-dom'

// Mock window.location
delete window.location
window.location = {
  search: '',
  href: '',
  origin: 'http://localhost:3000',
  pathname: '/',
  hash: '',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  protocol: 'http:',
  assign: jest.fn(),
  reload: jest.fn(),
  replace: jest.fn(),
}
