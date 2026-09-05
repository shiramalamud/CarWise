import { test, expect } from '@playwright/test'
import { signUpNewFamily, addCar, addMaintenanceRecord, uniqueEmail } from './helpers'

// Test A: the core "new family" happy path — sign up (creating a family),
// add a car, log a maintenance record, and confirm it's visible where a user
// would expect to see it: the car's own page, and the family Calendar.
//
// Note on scope: Calendar is driven by the car's own last_service_date /
// test_expiry_date / insurance_expiry_date fields (set via "Edit" on the car),
// not by the maintenance_records log itself — adding a maintenance_records
// row alone does not change what Calendar shows for that car. This test
// exercises both actions a user actually takes to keep them in sync, and
// documents that distinction rather than assuming an integration that
// doesn't exist in the current implementation.
test('sign up, add a car, log a maintenance record, and see it on the car page and Calendar', async ({ page }) => {
  await signUpNewFamily(page, 'E2E Tester A', uniqueEmail('flow-a'))

  const carUrl = await addCar(page, { make: 'Toyota', model: 'Corolla', year: '2022', plate: '111-11-111', mileage: '15000' })
  expect(carUrl).toMatch(/\/cars\/[a-f0-9-]+$/)

  await addMaintenanceRecord(page, { typeLabel: 'Oil Change', date: '2026-08-01', garage: 'QuickFix Garage', cost: '120' })

  // 1) Shows up on the car detail page's Maintenance tab.
  await expect(page.getByText('Oil Change — QuickFix Garage')).toBeVisible()

  // 2) Reflect the same service date on the car itself, the field Calendar
  // actually reads — the realistic next step for a user who just serviced
  // the car and wants the family calendar to know about it.
  await page.click('button:has-text("Edit")')
  // "Last service date" is the first of the three date fields on the edit form.
  await page.locator('input[type="date"]').first().fill('2026-08-01')
  await page.click('button:has-text("Save")')
  await page.waitForSelector('button:has-text("Edit")', { timeout: 10000 })
  await expect(page.getByText('Oil Change — QuickFix Garage')).toBeVisible()

  // 3) Calendar picks up that same car + service entry.
  await page.goto('/calendar', { waitUntil: 'networkidle' })
  const calendarEntry = page.locator('text=Toyota Corolla').first()
  await expect(calendarEntry).toBeVisible()
  await expect(page.getByText('Service').first()).toBeVisible()
})
