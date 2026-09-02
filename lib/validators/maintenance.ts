import { z } from 'zod'

export const maintenanceSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  date: z.string().refine(d => {
    if (!d) return false
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return false
    const now = new Date()
    // date cannot be in the future
    return dt.getTime() <= now.getTime()
  }, { message: 'Date is required and cannot be in the future' }),
  name_garage: z.string().optional(),
  cost: z.preprocess(val => {
    if (typeof val === 'string') return val === '' ? 0 : Number(val)
    return val
  }, z.number().min(0, 'Cost must be non-negative')),
  notes: z.string().optional(),
})

export type MaintenanceInput = z.infer<typeof maintenanceSchema>
