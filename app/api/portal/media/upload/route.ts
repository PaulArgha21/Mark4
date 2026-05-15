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

    // Use duck-typing instead of instanceof (File class differs between browser and Node.js)
    if (!file || typeof (file as any).arrayBuffer !== 'function') {
      return badRequest('No valid file provided')
    }

    const fileObj = file as File
    const contentType = fileObj.type || 'application/octet-stream'

    // Validate file type
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/') && contentType !== 'text/html') {
      return badRequest(`Invalid file type: ${contentType}. Only images, videos, and HTML are allowed.`)
    }

    // Validate size
    const size = fileObj.size ?? 0
    if (size > 10 * 1024 * 1024) {
      return badRequest(`File too large (${Math.round(size / 1024)}KB). Max 10MB.`)
    }

    // Check R2 config
    if (!process.env.R2_BUCKET_NAME || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      console.error('R2 env vars missing')
      return badRequest('Storage not configured — check R2 environment variables')
    }

    const rawExt = contentType.split('/')[1] || 'bin'
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt.split('+')[0]
    const key = `${folder}/${nanoid()}.${ext}`

    const buffer = Buffer.from(await fileObj.arrayBuffer())

    try {
      await s3.send(new PutObjectCommand({
        Bucket:      process.env.R2_BUCKET_NAME,
        Key:         key,
        Body:        buffer,
        ContentType: contentType,
      }))
    } catch (r2Err: any) {
      const msg = r2Err?.message || 'R2 upload failed'
      console.error('R2 PutObject error:', r2Err)
      return badRequest(`Storage error: ${msg}`)
    }

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    console.log('Upload success:', key)
    return ok({ publicUrl, key })
  } catch (err: any) {
    console.error('Server upload error:', err?.message || err)
    return serverError()
  }
}
