import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Global test setup
global.console = {
  ...console,
  // Silence console.log in tests unless NODE_ENV is 'development'
  log: process.env.NODE_ENV === "development" ? console.log : jest.fn(),
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Global test teardown
afterAll(async () => {
  // Clean up any resources if needed
});

// Global test timeout
jest.setTimeout(30000);
