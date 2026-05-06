import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { nanoid } from 'nanoid'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export type MediaType = 'image' | 'video' | 'document'

export interface UploadUrlResult {
  uploadUrl: string
  publicUrl: string
  key: string
}

export async function getR2UploadUrl(
  type: MediaType,
  contentType: string,
  folder = 'media'
): Promise<UploadUrlResult> {
  const ext = contentType.split('/')[1] || 'bin'
  const key = `${folder}/${nanoid()}.${ext}`

  const command = new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME!,
    Key:         key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  return { uploadUrl, publicUrl, key }
}
