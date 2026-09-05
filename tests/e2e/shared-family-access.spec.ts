import { test, expect } from '@playwright/test'
import { signUpNewFamily, joinFamily, addCar, uniqueEmail } from './helpers'

// Test B: family-scoped access. Account A creates a family and a car;
// Account B joins that same family with A's code. B should see A's car —
// proving the two profiles share one family_id and Supabase RLS grants
// access by family, not by the row's original creator.
test('a second account that joins the same family sees the first account\'s car', async ({ browser }) => {
  const pageA = await (await browser.newContext()).newPage()
  const { familyCode } = await signUpNewFamily(pageA, 'Family Member A', uniqueEmail('rls-a'))
  expect(familyCode.length).toBeGreaterThan(0)

  await addCar(pageA, { make: 'Mazda', model: 'CX-5', year: '2021', plate: '222-22-222', mileage: '30000' })

  const pageB = await (await browser.newContext()).newPage()
  await joinFamily(pageB, 'Family Member B', uniqueEmail('rls-b'), familyCode)

  // B's own "My Cars" list shows the car A created.
  await pageB.goto('/cars', { waitUntil: 'networkidle' })
  await expect(pageB.getByText('Mazda CX-5')).toBeVisible()

  // B can also open its detail page directly and fully interact with it
  // (not just see a summary card) — the shared-family grant is real, not
  // partial.
  await pageB.getByText('Mazda CX-5').click()
  await pageB.waitForSelector('text=Mark as Sold', { timeout: 15000 })
  await expect(pageB.getByText('222-22-222').first()).toBeVisible()
})
