export const runtime = 'nodejs'

import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateCustomerTokenPair } from '@/lib/customer-jwt'

const schema = z.object({
  accessToken: z.string().min(1, 'Facebook access token is required'),
})

interface FacebookUser {
  id: string
  name: string
  email?: string
  picture?: { data?: { url?: string } }
}

async function verifyFacebookToken(token: string): Promise<FacebookUser> {
  const res = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${token}`
  )
  if (!res.ok) throw new Error('Invalid Facebook token')
  return res.json()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid request', parsed.error.flatten())

    const { accessToken: fbToken } = parsed.data

    // Verify Facebook token
    const fbUser = await verifyFacebookToken(fbToken)

    if (!fbUser.email) {
      return badRequest('Facebook email permission is required. Please grant email access.')
    }

    const fbPicture = fbUser.picture?.data?.url || null

    // Check if user exists by email
    let user = await db.user.findUnique({ where: { email: fbUser.email } })

    if (user?.isBlocked) {
      return forbidden('Your account has been suspended. Please contact support.')
    }

    if (user) {
      // Update profile picture from Facebook
      await db.user.update({
        where: { id: user.id },
        data: {
          image: fbPicture || user.image,
          name: user.name || fbUser.name,
        },
      })

      // Upsert the Facebook account link
      await db.account.upsert({
        where: { provider_providerAccountId: { provider: 'facebook', providerAccountId: fbUser.id } },
        update: {},
        create: {
          userId: user.id,
          type: 'oauth',
          provider: 'facebook',
          providerAccountId: fbUser.id,
        },
      })
    } else {
      // Create new user with Facebook profile
      user = await db.user.create({
        data: {
          email: fbUser.email,
          name: fbUser.name,
          image: fbPicture,
          role: 'CUSTOMER',
          accounts: {
            create: {
              type: 'oauth',
              provider: 'facebook',
              providerAccountId: fbUser.id,
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
    console.error('Facebook auth error:', err)
    return serverError()
  }
}
