export const runtime = 'nodejs'

import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { nanoid } from 'nanoid'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

// Server-side file upload — bypasses R2 CORS entirely
// Accepts multipart/form-data with a 'file' field and optional 'folder' field
export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'products'

    if (!file || !(file instanceof File)) {
      return badRequest('No file provided')
    }

    // Validate file type and size
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && file.type !== 'text/html') {
      return badRequest('Invalid file type. Only images, videos, and HTML are allowed.')
    }

    if (file.size > 10 * 1024 * 1024) {
      return badRequest('File too large. Max 10MB.')
    }

    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'bin'
    const key = `${folder}/${nanoid()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    await s3.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         key,
      Body:        buffer,
      ContentType: file.type,
    }))

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

    return ok({ publicUrl, key })
  } catch (err) {
    console.error('Server upload error:', err)
    return serverError()
  }
}
