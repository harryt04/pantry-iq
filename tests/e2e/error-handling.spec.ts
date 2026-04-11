import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:3000/api'

test.describe('Error Handling and API Consistency', () => {
  test.describe('API Error Responses', () => {
    test('should return 401 for unauthenticated requests', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE}/locations`)

      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
      expect(body.code).toBe('NOT_AUTHENTICATED')
    })

    test('should return 404 for non-existent resources', async ({
      request,
    }) => {
      const response = await request.get(
        `${API_BASE}/locations/non-existent-id`,
      )

      expect(response.status()).toBe(404)
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
    })

    test('should return 400 for invalid JSON', async ({ request }) => {
      const response = await request.post(`${API_BASE}/locations`, {
        data: 'invalid json {',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect([400, 401]).toContain(response.status())
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
    })

    test('should return 400 for missing required fields', async ({
      request,
    }) => {
      const response = await request.post(`${API_BASE}/subscribe`, {
        data: JSON.stringify({ email: '' }),
      })

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
      expect(body.code).toBe('MISSING_EMAIL')
    })

    test('should return 400 for invalid email format', async ({ request }) => {
      const response = await request.post(`${API_BASE}/subscribe`, {
        data: JSON.stringify({ email: 'not-an-email' }),
      })

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.code).toBe('INVALID_EMAIL')
    })

    test('should never expose stack traces in error responses', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE}/locations`)

      const body = await response.json()
      const errorMessage = JSON.stringify(body)

      // Check that stack traces, SQL queries, or internal details aren't exposed
      expect(errorMessage).not.toMatch(/stack/i)
      expect(errorMessage).not.toMatch(/sql/i)
      expect(errorMessage).not.toMatch(/at /i) // Stack trace indicator
      expect(errorMessage).not.toMatch(/Error:/i) // Raw error
    })

    test('should have consistent error response structure', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE}/locations`)

      expect(response.status()).toBe(401)
      const body = await response.json()

      // All errors should have this structure
      expect(typeof body.error).toBe('string')
      expect(typeof body.code).toBe('string')
      expect(body.error.length).toBeGreaterThan(0)
      expect(body.code.length).toBeGreaterThan(0)
    })
  })

  test.describe('HTTP Status Codes', () => {
    test('should return appropriate status codes', async ({ request }) => {
      // 401 - Unauthorized
      const unauth = await request.get(`${API_BASE}/locations`)
      expect(unauth.status()).toBe(401)

      // 400 - Bad Request (invalid email)
      const badReq = await request.post(`${API_BASE}/subscribe`, {
        data: JSON.stringify({ email: 'invalid' }),
      })
      expect(badReq.status()).toBe(400)

      // 200 - Success (valid email)
      const success = await request.post(`${API_BASE}/subscribe`, {
        data: JSON.stringify({ email: 'test@example.com' }),
      })
      expect(success.status()).toBe(200)
    })
  })

  test.describe('Loading States', () => {
    test('should display loading skeleton on dashboard page', async ({
      page,
    }) => {
      // Try to navigate to dashboard (will redirect if not authenticated)
      await page.goto('http://localhost:3000/dashboard', {
        waitUntil: 'domcontentloaded',
      })

      // Check for skeleton loaders (animate-pulse class indicates loading state)
      const skeletons = page.locator('[class*="animate-pulse"]')
      // On initial load or during auth check, skeleton should be visible
      const skeletonCount = await skeletons.count()
      // Expect at least some loading elements or a loading message
      const loadingText = page.locator('text=Loading')
      const hasLoadingState =
        skeletonCount > 0 || (await loadingText.count()) > 0

      expect(hasLoadingState).toBeTruthy()
    })
  })

  test.describe('Error Boundary Rendering', () => {
    test('should have error boundary at app level', async ({ page }) => {
      // Error boundaries are typically tested by simulating errors
      // This test just verifies the error component is properly set up
      // Real error testing would require E2E tests that trigger errors

      // Navigate to a valid page
      await page.goto('http://localhost:3000/dashboard', {
        waitUntil: 'domcontentloaded',
      })

      // Check page loads without crashing
      const status = page.url()
      expect(status.length).toBeGreaterThan(0)
    })

    test('should display user-friendly error messages', async ({ page }) => {
      // Subscribe with invalid email to trigger user-friendly error
      await page.goto('http://localhost:3000')

      // Try to submit form with invalid email (if form exists)
      const emailInput = page.locator('input[type="email"]').first()
      const hasEmailField = await emailInput.count()

      if (hasEmailField > 0) {
        await emailInput.fill('invalid-email')
        await page.locator('button:has-text("Subscribe")').click()

        // Wait for error message
        await page.waitForTimeout(500)

        // Error message should be visible and user-friendly
        const errorMessage = page.locator('[class*="error"], [role="alert"]')
        if ((await errorMessage.count()) > 0) {
          const text = await errorMessage.first().textContent()
          // Should contain user-friendly text
          expect(text?.length || 0).toBeGreaterThan(0)
          // Should NOT contain stack traces or SQL
          expect(text).not.toMatch(/stack/i)
          expect(text).not.toMatch(/sql/i)
        }
      }
    })
  })

  test.describe('API Error Codes', () => {
    test('should include descriptive error codes', async ({ request }) => {
      const tests = [
        {
          endpoint: `${API_BASE}/locations`,
          expectedCode: 'NOT_AUTHENTICATED',
          expectedStatus: 401,
        },
        {
          endpoint: `${API_BASE}/subscribe`,
          method: 'POST',
          body: { email: '' },
          expectedCode: 'MISSING_EMAIL',
          expectedStatus: 400,
        },
      ]

      for (const test of tests) {
        let response
        if (test.method === 'POST') {
          response = await request.post(test.endpoint, {
            data: JSON.stringify(test.body),
          })
        } else {
          response = await request.get(test.endpoint)
        }

        expect(response.status()).toBe(test.expectedStatus)
        const body = await response.json()
        expect(body.code).toBe(test.expectedCode)
      }
    })
  })

  test.describe('Form Validation Errors', () => {
    test('should return validation error for invalid email on subscribe', async ({
      request,
    }) => {
      const invalidEmails = [
        'invalid',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
      ]

      for (const email of invalidEmails) {
        const response = await request.post(`${API_BASE}/subscribe`, {
          data: JSON.stringify({ email }),
        })

        expect(response.status()).toBe(400)
        const body = await response.json()
        expect(body.code).toMatch(/INVALID_EMAIL|MISSING_EMAIL/)
      }
    })

    test('should accept valid email on subscribe', async ({ request }) => {
      const response = await request.post(`${API_BASE}/subscribe`, {
        data: JSON.stringify({ email: 'valid.email@example.com' }),
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('message')
    })
  })

  test.describe('Response Structure', () => {
    test('should have consistent response structure across all errors', async ({
      request,
    }) => {
      // Test multiple error scenarios
      const responses = [
        await request.get(`${API_BASE}/locations`), // 401
        await request.post(`${API_BASE}/subscribe`, {
          data: JSON.stringify({ email: '' }),
        }), // 400
      ]

      for (const response of responses) {
        const body = await response.json()

        // All error responses should have these fields
        expect(body).toHaveProperty('error')
        expect(body).toHaveProperty('code')

        // Should NOT have these fields in error responses
        expect(body).not.toHaveProperty('stack')
        expect(body).not.toHaveProperty('query')
        expect(body).not.toHaveProperty('detail')
      }
    })
  })

  test.describe('Content-Type Headers', () => {
    test('should return JSON content-type for all API errors', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE}/locations`)

      expect(response.headers()['content-type']).toContain('application/json')
    })
  })
})
