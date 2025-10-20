module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'default-case': 'warn'
  },
  ignorePatterns: ['build/', 'node_modules/']
};