const validNodeEnvs = new Set(['development', 'test', 'production'])
const validSameSiteValues = new Set(['lax', 'strict', 'none'])

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

export function validateEnv() {
  const {
    NODE_ENV = 'development',
    JWT_SECRET,
    JWT_COOKIE_NAME,
    JWT_COOKIE_SAME_SITE,
    JWT_COOKIE_DOMAIN,
    CLIENT_URL,
  } = process.env

  assert(validNodeEnvs.has(NODE_ENV), 'NODE_ENV must be development, test, or production.')
  assert(JWT_SECRET && JWT_SECRET.trim().length >= 32, 'JWT_SECRET must be set and at least 32 characters long.')
  assert(
    JWT_SECRET !== 'change-this-to-a-long-random-secret',
    'JWT_SECRET must not use the default placeholder value.',
  )

  if (JWT_COOKIE_NAME) {
    assert(
      /^[A-Za-z0-9_-]+$/.test(JWT_COOKIE_NAME),
      'JWT_COOKIE_NAME may only contain letters, numbers, underscores, and hyphens.',
    )
  }

  if (JWT_COOKIE_SAME_SITE) {
    const sameSite = JWT_COOKIE_SAME_SITE.trim().toLowerCase()
    assert(
      validSameSiteValues.has(sameSite),
      'JWT_COOKIE_SAME_SITE must be one of: lax, strict, none.',
    )

    if (sameSite === 'none') {
      assert(
        NODE_ENV === 'production' || Boolean(CLIENT_URL),
        'JWT_COOKIE_SAME_SITE=none requires a valid CLIENT_URL and should be used for cross-site cookie setups.',
      )
    }
  }

  if (JWT_COOKIE_DOMAIN) {
    assert(
      !/\s/.test(JWT_COOKIE_DOMAIN) && !JWT_COOKIE_DOMAIN.includes('/'),
      'JWT_COOKIE_DOMAIN must be a plain domain without spaces or slashes.',
    )
  }
}
