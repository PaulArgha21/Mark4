import crypto from 'crypto'

// ═══════════════════════════════════════════════════
// AES-256-GCM End-to-End Chat Encryption
// ═══════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.CHAT_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('CHAT_ENCRYPTION_KEY must be set and at least 32 characters')
  }
  return crypto.scryptSync(key, 'aprdite-chat-salt', 32)
}

export interface EncryptedPayload {
  encrypted: string  // hex
  iv: string         // hex
  tag: string        // hex
}

export function encryptMessage(plaintext: string): EncryptedPayload {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  }
}

export function decryptMessage(payload: EncryptedPayload): string {
  const key = getKey()
  const iv = Buffer.from(payload.iv, 'hex')
  const tag = Buffer.from(payload.tag, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
