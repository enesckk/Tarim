export const Roles = {
  Administrator: 'Administrator',
  Officer: 'Officer',
  Producer: 'Producer',
  Inspector: 'Inspector',
} as const;

export function hasRole(roles: string[] | null | undefined, role: string) {
  return Boolean(roles?.some((r) => r.toLowerCase() === role.toLowerCase()));
}

export function isProducer(roles: string[] | null | undefined) {
  return hasRole(roles, Roles.Producer) || hasRole(roles, 'üretici');
}

export function isOfficer(roles: string[] | null | undefined) {
  return hasRole(roles, Roles.Officer);
}

export function isAdmin(roles: string[] | null | undefined) {
  return hasRole(roles, Roles.Administrator);
}

/** Mobile app allows producer + tarım uzmanı (not admin). */
export function canUseMobileApp(roles: string[] | null | undefined) {
  return isProducer(roles) || isOfficer(roles);
}

export function roleLabel(roles: string[] | null | undefined) {
  if (isAdmin(roles)) return 'Yönetici';
  if (isOfficer(roles)) return 'Tarım Uzmanı';
  if (isProducer(roles)) return 'Üretici';
  return 'Kullanıcı';
}
