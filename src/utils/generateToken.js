import jwt from 'jsonwebtoken'

export function generateToken(user) {
  const issuer = process.env.JWT_ISSUER || 'john-belvedere-ordering-backend'
  const audience = process.env.JWT_AUDIENCE || 'john-belvedere-ordering-frontend'

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      phone: user.phone || null,
      type: 'access',
    },
    process.env.JWT_SECRET,
    {
      issuer,
      audience,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  )
}
