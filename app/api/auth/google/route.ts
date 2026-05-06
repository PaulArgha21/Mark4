export const runtime = 'nodejs'

import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateCustomerTokenPair } from '@/lib/customer-jwt'

const schema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
})

interface GooglePayload {
  sub: string
  email: string
  email_verified: boolean
  name: string
  picture: string
  given_name?: string
  family_name?: string
}

async function verifyGoogleToken(credential: string): Promise<GooglePayload> {
  // Verify token with Google's tokeninfo endpoint
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
  if (!res.ok) throw new Error('Invalid Google token')
  const payload = await res.json()

  // Verify audience matches our client ID (if configured)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (clientId && payload.aud !== clientId) {
    throw new Error('Token audience mismatch')
  }

  return payload as GooglePayload
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid request', parsed.error.flatten())

    const { credential } = parsed.data

    // Verify Google token
    const googleUser = await verifyGoogleToken(credential)

    if (!googleUser.email_verified) {
      return badRequest('Google email not verified')
    }

    // Check if user exists by email
    let user = await db.user.findUnique({ where: { email: googleUser.email } })

    if (user?.isBlocked) {
      return forbidden('Your account has been suspended. Please contact support.')
    }

    if (user) {
      // Update profile picture from Google if not already set or if using Google
      await db.user.update({
        where: { id: user.id },
        data: {
          image: googleUser.picture || user.image,
          name: user.name || googleUser.name,
          emailVerified: user.emailVerified || new Date(),
        },
      })

      // Upsert the Google account link
      await db.account.upsert({
        where: { provider_providerAccountId: { provider: 'google', providerAccountId: googleUser.sub } },
        update: {},
        create: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: googleUser.sub,
        },
      })
    } else {
      // Create new user with Google profile
      user = await db.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture,
          emailVerified: new Date(),
          role: 'CUSTOMER',
          accounts: {
            create: {
              type: 'oauth',
              provider: 'google',
              providerAccountId: googleUser.sub,
            },
          },
          loyaltyAccount: {
            create: { tier: 'BRONZE' },
          },
        },
      })
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateCustomerTokenPair(user.id)

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    })
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        role: user.role,
      },
      accessToken,
    })
  } catch (err) {
    console.error('Google auth error:', err)
    return serverError()
  }
}
