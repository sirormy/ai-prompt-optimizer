module.exports = {
  projects: [
    {
      displayName: 'backend',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/src/**/*.spec.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/backend/src/$1',
        '^@/common/(.*)$': '<rootDir>/backend/src/common/$1',
        '^@/modules/(.*)$': '<rootDir>/backend/src/modules/$1',
        '^@/config/(.*)$': '<rootDir>/backend/src/config/$1'
      },
      globals: {
        'ts-jest': {
          tsconfig: '<rootDir>/backend/tsconfig.json'
        }
      }
    }
  ]
};
