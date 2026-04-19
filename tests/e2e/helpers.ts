import type { Page } from '@playwright/test'

/**
 * Dismisses the BetaNotice dialog that appears on auth pages.
 * Must be called after navigating to a login or signup page.
 */
export async function dismissBetaNotice(page: Page) {
  const iUnderstandBtn = page.getByRole('button', { name: 'I Understand' })
  try {
    await iUnderstandBtn.waitFor({ state: 'visible', timeout: 5000 })
    await iUnderstandBtn.click()
    await iUnderstandBtn.waitFor({ state: 'hidden', timeout: 5000 })
  } catch {
    // Dialog may not be present (already dismissed or not rendered)
  }
}

/**
 * Signs up a new user via the signup page and waits for dashboard redirect.
 */
export async function signUpUser(
  page: Page,
  email: string,
  password: string,
  name: string = 'Test User',
) {
  await page.goto('http://localhost:3000/signup')
  await dismissBetaNotice(page)
  await page.fill('input[name="name"]', name)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="confirmPassword"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}
