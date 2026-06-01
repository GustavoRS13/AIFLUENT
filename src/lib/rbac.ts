export type UserRole = 'admin' | 'gestor' | 'operador'

export const PERMISSIONS = {
  // Pages
  'page:dashboard': ['admin', 'gestor', 'operador'],
  'page:leads': ['admin', 'gestor', 'operador'],
  'page:pipeline': ['admin', 'gestor', 'operador'],
  'page:deals': ['admin', 'gestor', 'operador'],
  'page:inbox': ['admin', 'gestor', 'operador'],
  'page:whatsapp': ['admin', 'gestor', 'operador'],
  'page:campaigns': ['admin', 'gestor'],
  'page:disparos': ['admin', 'gestor'],
  'page:templates': ['admin', 'gestor'],
  'page:meta-ads': ['admin', 'gestor'],
  'page:automations': ['admin', 'gestor'],
  'page:tasks': ['admin', 'gestor', 'operador'],
  'page:productivity': ['admin', 'gestor', 'operador'],
  'page:team': ['admin'],
  'page:reports': ['admin', 'gestor'],
  'page:settings': ['admin'],
  'page:security': ['admin'],
  'page:integrations': ['admin'],
  'page:ai-assistant': ['admin', 'gestor'],
  // Actions
  'action:create-lead': ['admin', 'gestor', 'operador'],
  'action:delete-lead': ['admin', 'gestor'],
  'action:create-campaign': ['admin', 'gestor'],
  'action:manage-team': ['admin'],
  'action:manage-settings': ['admin'],
  'action:export-data': ['admin', 'gestor'],
  'action:seed-data': ['admin'],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission]
  return (allowed as readonly string[]).includes(role)
}
