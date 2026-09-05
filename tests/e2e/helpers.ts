import { Page } from '@playwright/test'

const PASSWORD = 'TestPass123!'

export function uniqueEmail(tag: string) {
  return `carwise.e2e.${tag}+${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`
}

/** Creates a brand-new family via the signup form and lands back on Home. */
export async function signUpNewFamily(page: Page, name: string, email: string) {
  await page.goto('/signup', { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="email"]')
  await page.locator('form input').nth(0).fill(name)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button:has-text("Sign up")')
  await page.waitForSelector('text=Your family is set up!', { timeout: 15000 })
  const familyCode = (await page.locator('text=Family code').locator('xpath=following-sibling::div[1]').textContent())?.trim() || ''
  await page.click('button:has-text("Continue")')
  await page.waitForURL('**/', { timeout: 15000 })
  return { familyCode }
}

/** Joins an existing family with its code via the signup form's "Join family" mode. */
export async function joinFamily(page: Page, name: string, email: string, familyCode: string) {
  await page.goto('/signup', { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="email"]')
  await page.click('button:has-text("Join family")')
  await page.locator('form input').nth(0).fill(name)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  const joinCodeInput = page.locator('label:has-text("Family code")').locator('xpath=following-sibling::input[1]')
  await joinCodeInput.fill(familyCode)
  await page.click('button:has-text("Sign up")')
  await page.waitForURL('**/', { timeout: 15000 })
}

export type NewCar = { make: string; model: string; year: string; plate: string; mileage: string }

/** Fills the /cars/new form and returns the resulting car detail page URL. */
export async function addCar(page: Page, car: NewCar) {
  await page.goto('/cars/new', { waitUntil: 'networkidle' })
  const inputs = page.locator('form input')
  await inputs.nth(0).fill(car.make)
  await inputs.nth(1).fill(car.model)
  await inputs.nth(2).fill(car.year)
  await inputs.nth(3).fill(car.plate)
  await inputs.nth(4).fill(car.mileage)
  await page.click('button:has-text("Save")')
  await page.waitForSelector('text=Mark as Sold', { timeout: 15000 })
  return page.url()
}

/** Adds a maintenance record via the dedicated /records/new screen, from the car detail page. */
export async function addMaintenanceRecord(page: Page, opts: { typeLabel: string; date: string; garage?: string; cost?: string }) {
  await page.click('button:has-text("+ Add Maintenance Record")')
  await page.waitForURL('**/records/new', { timeout: 10000 })
  await page.selectOption('select', { label: opts.typeLabel })
  await page.fill('input[type="date"]', opts.date)
  if (opts.garage) await page.fill('input[placeholder="Optional"]', opts.garage)
  if (opts.cost) await page.locator('input[placeholder="0"]').fill(opts.cost)
  await page.click('button:has-text("Add Record")')
  await page.waitForURL('**/cars/**', { timeout: 15000 })
  await page.waitForSelector('text=Mark as Sold', { timeout: 15000 })
}
