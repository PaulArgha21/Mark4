import { Redis } from '@upstash/redis'
import { readFileSync } from 'fs'

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
  const patterns = [
    'ratelimit:*',
  ]
  
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern)
    console.log(`Keys matching ${pattern}:`, keys)
    
    for (const key of keys) {
      await redis.del(key)
    }
    console.log(`Cleared ${keys.length} keys for pattern ${pattern}`)
  }
}

main().catch(console.error)
