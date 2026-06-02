# Rate Limit Report

## Implementacao (`src/lib/rate-limit.ts`)

### Arquitetura
- Rate limiter baseado em sliding window com Map em memoria
- Limpeza automatica de entradas expiradas a cada 5 minutos via `setInterval`
- Funcao factory `rateLimit(config)` retorna checker function

### Limiters Pre-configurados
| Limiter | Window | Max Requests | Uso |
|---------|--------|-------------|-----|
| `apiLimiter` | 60s | 60 | APIs gerais |
| `authLimiter` | 60s | 10 | Login/auth |
| `aiLimiter` | 60s | 20 | Chamadas IA |
| `seedLimiter` | 300s | 2 | Seed do banco |

### API
```ts
const limiter = rateLimit({ windowMs: 60000, max: 30 })
const result = limiter('identifier')
// result: { success: boolean, remaining: number, resetAt: number }
```

### Testes (4/4 passando)
- Permite requests dentro do limite
- Bloqueia requests acima do limite
- IPs diferentes tem limites separados
- Contagem `remaining` decresce corretamente

### Integracao
- Usado na rota `/api/whatsapp` via `checkRateLimit(request)` para proteger envios
- Disponivel para qualquer API route via imports diretos

### Limitacoes conhecidas
- Storage em memoria: nao persiste entre restarts do servidor
- Nao compartilhado entre instancias em deploy multi-replica
- Para producao em escala, considerar Redis-backed rate limiter (e.g. `@upstash/ratelimit`)

Data do relatorio: 2026-06-02
