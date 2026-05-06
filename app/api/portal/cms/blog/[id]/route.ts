export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission(request, 'cms.blog')
  if (error) return error

  try {
    const post = await db.blogPost.findUnique({
      where: { id: params.id },
      include: { tags: { include: { tag: true } } },
    })
    if (!post) return notFound()
    return ok({ ...post, tags: post.tags.map(t => t.tag) })
  } catch (err) {
    console.error('[cms/blog/id] GET:', err)
    return serverError()
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'cms.blog')
  if (error || !employee) return error!

  try {
    const existing = await db.blogPost.findUnique({ where: { id: params.id } })
    if (!existing) return notFound()

    const body = await request.json()
    const { tagNames, ...data } = body as { tagNames?: string[]; [key: string]: unknown }

    const updateData: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) updateData[k] = v
    }
    if (updateData.publishedAt) updateData.publishedAt = new Date(updateData.publishedAt as string)
    if (updateData.scheduledAt) updateData.scheduledAt = new Date(updateData.scheduledAt as string)

    const updated = await db.blogPost.update({ where: { id: params.id }, data: updateData })

    if (tagNames !== undefined) {
      await db.blogPostTag.deleteMany({ where: { postId: params.id } })
      for (const tagName of tagNames) {
        const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const tag = await db.blogTag.upsert({
          where: { slug },
          update: {},
          create: { name: tagName, slug },
        })
        await db.blogPostTag.create({ data: { postId: params.id, tagId: tag.id } })
      }
    }

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.blog.updated', resourceType: 'BlogPost', resourceId: params.id,
    })

    return ok(updated)
  } catch (err) {
    console.error('[cms/blog/id] PUT:', err)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'cms.blog')
  if (error || !employee) return error!

  try {
    await db.blogPost.delete({ where: { id: params.id } })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.blog.deleted', resourceType: 'BlogPost', resourceId: params.id,
    })

    return ok({ deleted: true })
  } catch (err) {
    console.error('[cms/blog/id] DELETE:', err)
    return serverError()
  }
}
