export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { ok, badRequest, conflict, serverError, created } from '@/lib/api-response'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'cms.blog')
  if (error) return error

  try {
    const sp = request.nextUrl.searchParams
    const status = sp.get('status') as 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED' | null
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
    const limit = Math.min(50, parseInt(sp.get('limit') ?? '20'))

    const where = status ? { status } : {}

    const [posts, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { tags: { include: { tag: true } } },
      }),
      db.blogPost.count({ where }),
    ])

    return ok({
      items: posts.map(p => ({
        ...p,
        tags: p.tags.map(t => t.tag),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[cms/blog] GET:', err)
    return serverError()
  }
}

const blogSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(300),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1),
  coverImage: z.string().url().optional().nullable(),
  authorName: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).default('DRAFT'),
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  readTimeMinutes: z.number().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  tagNames: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const { error, employee } = await requirePermission(request, 'cms.blog')
  if (error || !employee) return error!

  try {
    const body = await request.json()
    const parsed = blogSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid blog data', parsed.error.flatten())

    const existing = await db.blogPost.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) return conflict('Post with this slug already exists')

    const { tagNames, ...data } = parsed.data

    const post = await db.blogPost.create({
      data: {
        ...data,
        authorId: employee.id,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : data.status === 'PUBLISHED' ? new Date() : null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    })

    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const tag = await db.blogTag.upsert({
          where: { slug },
          update: {},
          create: { name: tagName, slug },
        })
        await db.blogPostTag.create({
          data: { postId: post.id, tagId: tag.id },
        })
      }
    }

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.blog.created', resourceType: 'BlogPost', resourceId: post.id,
      payload: { context: { title: post.title, status: post.status } },
    })

    return created(post)
  } catch (err) {
    console.error('[cms/blog] POST:', err)
    return serverError()
  }
}
