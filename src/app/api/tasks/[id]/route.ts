import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const updateTaskSchema = z.object({
  title: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error } = await requireAuth(); if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Tarefa nao encontrada' }, { status: 404 })

    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[key] = value
    }
    if (data.dueDate) data.dueDate = new Date(data.dueDate as string)
    if (parsed.data.status === 'completed') data.completedAt = new Date()

    const updated = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true } },
      },
    })

    logger.info('Task updated', { taskId: id, changes: Object.keys(parsed.data) })
    return NextResponse.json(updated)
  } catch (err) {
    logger.error('PATCH /api/tasks/[id] error', err)
    return NextResponse.json({ error: 'Falha ao atualizar tarefa' }, { status: 500 })
  }
}
