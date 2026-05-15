export const runtime = 'nodejs'

import { requirePermission } from '@/lib/permissions'
import { getR2UploadUrl } from '@/lib/r2'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { z } from 'zod'

const bodySchema = z.object({
  contentType: z.string().regex(/^(image|video|text)\//),
  folder: z.string().default('media'),
})

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid body', parsed.error.flatten())

    const typeMap = parsed.data.contentType.startsWith('image') ? 'image' as const
      : parsed.data.contentType.startsWith('video') ? 'video' as const
      : 'document' as const
    const result = await getR2UploadUrl(
      typeMap,
      parsed.data.contentType,
      parsed.data.folder
    )

    return ok(result)
  } catch (err) {
    console.error('Media upload URL error:', err)
    return serverError()
  }
}
