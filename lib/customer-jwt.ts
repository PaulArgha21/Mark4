import jwt from 'jsonwebtoken'

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export function generateCustomerTokenPair(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'customer_access' },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  )
  const refreshToken = jwt.sign(
    { userId, type: 'customer_refresh' },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  )
  return { accessToken, refreshToken }
}

export function verifyCustomerToken(token: string): { userId: string } {
  return jwt.verify(token, ACCESS_SECRET) as { userId: string }
}

export function verifyCustomerRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string }
}
