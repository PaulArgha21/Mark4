import { Redis } from '@upstash/redis'
import { readFileSync } from 'fs'

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

async function main() {
  const email = 'Arghap46@gmail.com'
  const emailLower = 'arghap46@gmail.com'
  
  // Clear all lockout and failure keys for both cases
  const keys = [
    `employee:lockout:${email}`,
    `employee:lockout:${emailLower}`,
    `employee:failures:${email}`,
    `employee:failures:${emailLower}`,
    `employee:otp_failures:${email}`,
    `employee:otp_failures:${emailLower}`,
    `otp:employee:${email}`,
    `otp:employee:${emailLower}`,
  ]

  for (const key of keys) {
    await redis.del(key)
  }

  console.log('✅ All lockout/failure keys cleared')
}

main().catch(console.error)
