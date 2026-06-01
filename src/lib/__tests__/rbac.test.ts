import { describe, it, expect } from 'vitest'
import { hasPermission } from '../rbac'

describe('RBAC', () => {
  it('admin can access everything', () => {
    expect(hasPermission('admin', 'page:settings')).toBe(true)
    expect(hasPermission('admin', 'page:dashboard')).toBe(true)
    expect(hasPermission('admin', 'action:manage-team')).toBe(true)
  })

  it('gestor cannot access admin pages', () => {
    expect(hasPermission('gestor', 'page:settings')).toBe(false)
    expect(hasPermission('gestor', 'page:security')).toBe(false)
    expect(hasPermission('gestor', 'page:team')).toBe(false)
  })

  it('gestor can access operational pages', () => {
    expect(hasPermission('gestor', 'page:leads')).toBe(true)
    expect(hasPermission('gestor', 'page:campaigns')).toBe(true)
    expect(hasPermission('gestor', 'page:reports')).toBe(true)
  })

  it('operador has limited access', () => {
    expect(hasPermission('operador', 'page:dashboard')).toBe(true)
    expect(hasPermission('operador', 'page:leads')).toBe(true)
    expect(hasPermission('operador', 'page:campaigns')).toBe(false)
    expect(hasPermission('operador', 'page:settings')).toBe(false)
    expect(hasPermission('operador', 'action:manage-team')).toBe(false)
  })
})
