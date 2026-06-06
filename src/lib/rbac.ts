export type UserRole = 'admin' | 'gestor' | 'supervisor' | 'operador'

export const PERMISSIONS = {
  // Pages
  'page:dashboard': ['admin', 'gestor', 'supervisor', 'operador'],
  'page:leads': ['admin', 'gestor', 'supervisor', 'operador'],
  'page:pipeline': ['admin', 'gestor', 'supervisor', 'operador'],
  'page:deals': ['admin', 'gestor', 'supervisor', 'operador'],
  'page:inbox': ['admin', 'gestor', 'operador'],
  'page:whatsapp': ['admin', 'gestor', 'operador'],
  'page:campaigns': ['admin', 'gestor'],
  'page:disparos': ['admin', 'gestor'],
  'page:templates': ['admin', 'gestor'],
  'page:meta-ads': ['admin', 'gestor'],
  'page:automations': ['admin', 'gestor'],
  'page:tasks': ['admin', 'gestor', 'supervisor', 'operador'],
  'page:productivity': ['admin', 'gestor'],
  'page:team': ['admin'],
  'page:reports': ['admin', 'gestor'],
  'page:relatorios': ['admin', 'gestor'],
  'page:settings': ['admin'],
  'page:configuracoes': ['admin', 'gestor'],
  'page:departamentos': ['admin'],
  'page:security': ['admin'],
  'page:integrations': ['admin'],
  'page:ai-assistant': ['admin', 'gestor'],
  'page:atendimento': ['admin', 'gestor', 'supervisor', 'operador'],
  'page:onboarding': ['admin', 'gestor', 'supervisor', 'operador'],
  // Actions
  'action:create-lead': ['admin', 'gestor', 'supervisor', 'operador'],
  'action:delete-lead': ['admin', 'gestor'],
  'action:create-campaign': ['admin', 'gestor'],
  'action:manage-team': ['admin', 'gestor'],
  'action:manage-users': ['admin', 'gestor'],
  'action:manage-settings': ['admin'],
  'action:export-data': ['admin', 'gestor'],
  'action:seed-data': ['admin'],
  'action:transfer': ['admin', 'gestor'],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission]
  return (allowed as readonly string[]).includes(role)
}
