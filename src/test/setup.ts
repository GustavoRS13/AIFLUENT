import '@testing-library/jest-dom/vitest'

// Auth requires AUTH_SECRET to be present (boot aborts otherwise). Provide a
// deterministic value for the test environment so modules that import the auth
// config can load. Individual tests that exercise the "missing secret" path
// manipulate process.env.AUTH_SECRET directly.
process.env.AUTH_SECRET ||= 'test-auth-secret-0123456789abcdef'
