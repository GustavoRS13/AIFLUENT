import { describe, it, expect } from 'vitest'

describe('Funnel Report', () => {
  it('calculates conversion rates between stages', () => {
    const stages = [
      { name: 'Novo', count: 100, isWon: false, isLost: false },
      { name: 'Qualificado', count: 60, isWon: false, isLost: false },
      { name: 'Proposta', count: 30, isWon: false, isLost: false },
      { name: 'Fechado', count: 15, isWon: true, isLost: false },
    ]

    const conversion = stages.map((s, i) => ({
      from: i > 0 ? stages[i-1].name : 'Entrada',
      to: s.name,
      rate: i > 0 && stages[i-1].count > 0 ? Math.round((s.count / stages[i-1].count) * 100) : 100,
    }))

    expect(conversion[0].rate).toBe(100)
    expect(conversion[1].rate).toBe(60)
    expect(conversion[2].rate).toBe(50)
    expect(conversion[3].rate).toBe(50)
  })

  it('handles empty stages', () => {
    const stages: { name: string; count: number }[] = []
    const conversion = stages.map((s, i) => ({
      from: i > 0 ? stages[i-1].name : 'Entrada',
      to: s.name,
      rate: i > 0 && stages[i-1].count > 0 ? Math.round((s.count / stages[i-1].count) * 100) : 100,
    }))
    expect(conversion).toHaveLength(0)
  })

  it('handles zero count in previous stage', () => {
    const stages = [
      { name: 'Novo', count: 0, isWon: false, isLost: false },
      { name: 'Qualificado', count: 5, isWon: false, isLost: false },
    ]

    const conversion = stages.map((s, i) => ({
      from: i > 0 ? stages[i-1].name : 'Entrada',
      to: s.name,
      rate: i > 0 && stages[i-1].count > 0 ? Math.round((s.count / stages[i-1].count) * 100) : 100,
    }))

    // When previous stage has 0 leads, rate defaults to 100 (division by zero guard)
    expect(conversion[1].rate).toBe(100)
  })

  it('aggregates lost reasons correctly', () => {
    const lostLeads = [
      { lostReason: 'Preco' },
      { lostReason: 'Preco' },
      { lostReason: 'Concorrencia' },
      { lostReason: null },
    ]

    const reasons: Record<string, number> = {}
    for (const l of lostLeads) {
      const r = l.lostReason || 'Nao informado'
      reasons[r] = (reasons[r] || 0) + 1
    }

    expect(reasons['Preco']).toBe(2)
    expect(reasons['Concorrencia']).toBe(1)
    expect(reasons['Nao informado']).toBe(1)
  })
})
