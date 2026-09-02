import { z } from 'zod'

const currentYear = new Date().getFullYear()

export const carSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z
    .number({ invalid_type_error: 'Year must be a number' })
    .int()
    .min(1980, `Year must be >= 1980`)
    .max(currentYear, `Year must be <= ${currentYear}`),
  plate_license: z
    .string()
    .min(1, 'License plate is required')
    .regex(/^[A-Z0-9-]{1,10}$/i, 'Invalid license plate format'),
  mileage: z
    .number({ invalid_type_error: 'Mileage must be a number' })
    .int()
    .min(0, 'Mileage must be non-negative'),
})

export type CarInput = z.infer<typeof carSchema>
