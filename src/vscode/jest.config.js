module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: {
    '^planfs-core$': '<rootDir>/../core/src/index.ts',
    '^vscode$': '<rootDir>/src/test/vscode.ts'
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/test/**'
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 68,
      lines: 63,
      statements: 62
    }
  }
};
