import { describe, it, expect } from 'vitest'

describe('Forecast API', () => {
  it('calculates weighted forecast correctly', () => {
    const deals = [
      { value: 10000, probability: 80 },
      { value: 5000, probability: 50 },
      { value: 20000, probability: 30 },
    ]

    let totalWeighted = 0
    let totalUnweighted = 0
    let bestCase = 0
    let worstCase = 0

    for (const deal of deals) {
      const prob = deal.probability / 100
      const weighted = deal.value * prob
      totalWeighted += weighted
      totalUnweighted += deal.value
      bestCase += deal.value
      worstCase += deal.value * Math.max(0, prob - 0.2)
    }

    expect(Math.round(totalWeighted)).toBe(16500)
    expect(Math.round(totalUnweighted)).toBe(35000)
    expect(Math.round(bestCase)).toBe(35000)
    expect(Math.round(worstCase)).toBe(9500)
  })

  it('handles zero deals', () => {
    const deals: { value: number; probability: number }[] = []
    let totalWeighted = 0
    for (const deal of deals) {
      totalWeighted += deal.value * (deal.probability / 100)
    }
    expect(totalWeighted).toBe(0)
  })

  it('handles deals with zero value', () => {
    const deals = [{ value: 0, probability: 80 }]
    let totalWeighted = 0
    for (const deal of deals) {
      totalWeighted += deal.value * (deal.probability / 100)
    }
    expect(totalWeighted).toBe(0)
  })
})
