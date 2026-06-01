# Test Coverage Report

## Test Run Results

```
 RUN  v4.1.8 /Users/Raphael/AIFLUENT

 Test Files  3 passed (3)
      Tests  11 passed (11)
   Start at  18:24:53
   Duration  1.31s (transform 111ms, setup 464ms, import 158ms, tests 16ms, environment 2.66s)
```

## Test Suites

### 1. RBAC Tests (`src/lib/__tests__/rbac.test.ts`)
| Test | Status |
|---|---|
| admin can access everything | PASS |
| gestor cannot access admin pages | PASS |
| gestor can access operational pages | PASS |
| operador has limited access | PASS |

### 2. Leads API Validation Tests (`src/app/api/__tests__/leads.test.ts`)
| Test | Status |
|---|---|
| rejects empty firstName | PASS |
| accepts valid lead | PASS |
| rejects invalid email | PASS |
| defaults temperature to warm | PASS |

### 3. Auth Validation Tests (`src/lib/__tests__/auth.test.ts`)
| Test | Status |
|---|---|
| rejects empty email | PASS |
| rejects short password | PASS |
| accepts valid credentials format | PASS |

## Framework
- **Test Runner**: Vitest 4.1.8
- **Environment**: jsdom
- **Setup**: `@testing-library/jest-dom/vitest` for DOM matchers
- **React Plugin**: `@vitejs/plugin-react`

## Scripts
- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
