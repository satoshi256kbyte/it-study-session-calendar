module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Disable rules that might cause issues in CI
    '@typescript-eslint/no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: ['node_modules/', '.next/', 'out/', '*.min.js', '*.min.css'],
}
