// Runs before the test framework is installed, and before any test file
// requires app code — ensures JWT_SECRET etc. exist without needing a real .env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_jest';
process.env.JWT_EXPIRES_IN = '1h';
