export const Roles = {
  Administrator: 'Administrator',
  Officer: 'Officer',
  Producer: 'Producer',
  Inspector: 'Inspector',
} as const

export type AppRole = (typeof Roles)[keyof typeof Roles]

export function hasRole(roles: string[] | null | undefined, role: string) {
  return Boolean(roles?.includes(role))
}

export function isAdmin(roles: string[] | null | undefined) {
  return hasRole(roles, Roles.Administrator)
}

export function isOfficer(roles: string[] | null | undefined) {
  return hasRole(roles, Roles.Officer)
}

export function isStaff(roles: string[] | null | undefined) {
  return isAdmin(roles) || isOfficer(roles)
}

export function homePathForRoles(roles: string[] | null | undefined) {
  if (isStaff(roles)) return '/'
  return '/login'
}

export function roleLabel(roles: string[] | null | undefined) {
  if (isAdmin(roles)) return 'Yönetici'
  if (isOfficer(roles)) return 'Tarım Uzmanı'
  if (hasRole(roles, Roles.Producer)) return 'Üretici'
  if (hasRole(roles, Roles.Inspector)) return 'Denetçi'
  return 'Kullanıcı'
}

export function panelSubtitle(roles: string[] | null | undefined) {
  if (isAdmin(roles)) return 'Yönetici Paneli'
  if (isOfficer(roles)) return 'Tarım Uzmanı Paneli'
  return 'Belediye Paneli'
}

/** Seed/demo names like "System Administrator" must not appear in the chrome. */
const BLOCKED_NAME_TOKENS = new Set([
  'system',
  'sistem',
  'administrator',
  'admin',
])

export function displayFirstName(fullName?: string | null, roles?: string[] | null) {
  const first = fullName?.trim().split(/\s+/)[0]
  if (first && !BLOCKED_NAME_TOKENS.has(first.toLocaleLowerCase('tr-TR'))) {
    return first
  }
  if (isAdmin(roles)) return 'Yönetici'
  if (isOfficer(roles)) return 'Uzman'
  return 'Profil'
}

export function displayFullName(fullName?: string | null, roles?: string[] | null) {
  const trimmed = fullName?.trim()
  if (!trimmed) return roleLabel(roles)
  const tokens = trimmed.split(/\s+/)
  const blocked = tokens.every((t) =>
    BLOCKED_NAME_TOKENS.has(t.toLocaleLowerCase('tr-TR')),
  )
  if (blocked) return roleLabel(roles)
  return trimmed
}
