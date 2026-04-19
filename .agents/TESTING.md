# Testing

## Commands

```bash
npm run test:unit    # Vitest (tests/unit/**/*.test.ts)
npm run test:e2e     # Playwright (tests/e2e/**/*.spec.ts)
npm run test         # both
PWDEBUG=1 npm run test:e2e  # debug mode
npm run test:e2e -- error-handling.spec.ts  # specific file
```

Config: `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`

## Test Data (CSV)

Pre-generated fixtures in `tests/fixtures/`: `sample-transactions.csv` (150), `sample-inventory.csv` (120), `sample-vendor-invoices.csv` (100).

Generate new:
```bash
npm run generate:test-csv -- --records 100 --type transactions|inventory|invoices [--output file.csv] [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]
```

## Drizzle Mock Pattern

```typescript
function createMockDatabaseChain(result: any[] = []) {
  const q: any = {}
  ;['from','where','limit','returning','set','values'].forEach(m => q[m] = vi.fn().mockReturnValue(q))
  q.then = (ok?: any, fail?: any) => Promise.resolve(result).then(ok, fail)
  q.catch = (fail?: any) => Promise.resolve(result).catch(fail)
  q.finally = (f?: any) => Promise.resolve(result).finally(f)
  q[Symbol.toStringTag] = 'Promise'
  return q
}

// Multiple sequential db.select() calls:
function mockSequential(...results: any[][]) {
  let i = 0
  vi.mocked(db.select).mockImplementation(() => createMockDatabaseChain(results[i++]) as any)
}
// mockSequential([connection], [location])
```

## Constructor Mocking

```typescript
vi.mock('@/lib/square/sync', () => ({
  SquareSyncManager: vi.fn(function (client: any, locationId: string) {
    this.syncTransactions = vi.fn().mockResolvedValue({ synced: 5, errors: 0 })
  }),
}))
```

## Error Handling Tests

`tests/e2e/error-handling.spec.ts` (20+ cases): 401/403/404/400 API errors, stack trace non-exposure, skeleton loaders, error boundary.
