export function generateFamilyCode(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// The one and only shape a "mark as sold" update is allowed to take — a
// partial status patch, never a payload that could drop other columns or
// delete the row. Marking a car sold is a soft delete: the row (and its
// maintenance history) always stays put.
export const SOLD_STATUS_UPDATE = { status: 'sold' } as const
