export type DateStatus = 'ok' | 'due-soon' | 'expired' | 'missing' | 'overdue'

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Derives a single "so what does this mean for me" status from the raw date
// fields already on the car — combining test/insurance expiry (forward-looking,
// 3-state) with last-service recency (backward-looking, 2-state).
export function computeCarHealth(car: any) {
  const testDays = daysUntil(car.test_expiry_date)
  const insDays = daysUntil(car.insurance_expiry_date)
  const serviceDaysAgo = car.last_service_date
    ? Math.floor((Date.now() - new Date(car.last_service_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const testStatus: DateStatus = testDays === null ? 'missing' : testDays < 0 ? 'expired' : testDays <= 30 ? 'due-soon' : 'ok'
  const insStatus: DateStatus = insDays === null ? 'missing' : insDays < 0 ? 'expired' : insDays <= 30 ? 'due-soon' : 'ok'
  const serviceStatus: DateStatus = serviceDaysAgo === null ? 'missing' : serviceDaysAgo > 365 ? 'overdue' : 'ok'

  let level: 'good' | 'attention' | 'action' = 'good'
  if (testStatus === 'expired' || insStatus === 'expired') level = 'action'
  else if (
    testStatus === 'due-soon' || insStatus === 'due-soon' ||
    testStatus === 'missing' || insStatus === 'missing' ||
    serviceStatus === 'missing' || serviceStatus === 'overdue'
  ) level = 'attention'

  return { level, testStatus, insStatus, serviceStatus, testDays, insDays, serviceDaysAgo }
}
