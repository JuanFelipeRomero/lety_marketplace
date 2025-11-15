export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  moduleFileExtensions: ["js", "json"],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/*.spec.js",
    "!**/node_modules/**",
    "!**/coverage/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // AÑADE ESTA SECCIÓN
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "./test-results/html-report",
        filename: "report.html",
        expand: true,
        pageTitle: "Reporte de Pruebas - Lety Marketplace",
      },
    ],
  ],
};
