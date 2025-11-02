export const PERMISSIONS: Record<string, string[]> = {
  'events.create': ['admin', 'organizer'],
  'events.read': ['admin', 'organizer', 'judge'],
  'events.update': ['admin', 'organizer'],
  'events.delete': ['admin'],
  'scores.submit': ['judge'],
  'scores.read': ['admin', 'organizer', 'judge'],
};

export function hasPermission(userRole: string, permission: string) {
  return PERMISSIONS[permission]?.includes(userRole) ?? false;
}
