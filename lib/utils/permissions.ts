export function canAccessCar(car: { id_family?: string }, profile: { family_id?: string } | null) {
  if (!car) return false
  if (!profile) return false
  return String(car.id_family) === String(profile.family_id)
}
