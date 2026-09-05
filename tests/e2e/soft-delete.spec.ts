import { test, expect } from '@playwright/test'
import { signUpNewFamily, addCar, addMaintenanceRecord, uniqueEmail } from './helpers'

// Test C: soft delete. Marking a car as sold must hide it from the active
// list, but the row (and its maintenance history) must still exist — this
// is a status flip, never a DELETE. Verified by navigating straight back to
// the car's own detail URL after marking it sold: that route doesn't filter
// by status, so if the row (or its maintenance_records) had actually been
// removed, the page or the record would be gone.
test('marking a car as sold hides it from the active list but keeps its maintenance history', async ({ page }) => {
  await signUpNewFamily(page, 'E2E Tester C', uniqueEmail('softdelete-c'))

  const carUrl = await addCar(page, { make: 'Ford', model: 'Focus', year: '2019', plate: '333-33-333', mileage: '50000' })
  await addMaintenanceRecord(page, { typeLabel: 'General Inspection', date: '2026-05-01' })
  await expect(page.getByText('General Inspection')).toBeVisible()

  await page.click('button:has-text("Mark as Sold")')
  await page.waitForSelector('[role="alertdialog"]')
  await page.click('[role="alertdialog"] button:has-text("Mark as Sold")')
  await page.waitForURL('**/cars', { timeout: 15000 })

  // Gone from the active list.
  await expect(page.getByText('Ford Focus')).toHaveCount(0)
  await expect(page.getByText('No active cars yet.')).toBeVisible()

  // But the row and its maintenance history are still there.
  await page.goto(carUrl, { waitUntil: 'networkidle' })
  await expect(page.getByText('Ford Focus')).toBeVisible()
  await expect(page.getByText('General Inspection')).toBeVisible()
})
