import { createHmac, timingSafeEqual } from 'node:crypto'

export interface Pass {
  iss: string
  aud: string
  sub: string
  email: string
  name?: string | null
  iat: number
  exp: number
  jti: string
}

const ISSUER = 'https://scotdance.app'
const AUDIENCE = 'challenge'
const SKEW_SECONDS = 30

function decode(part: string) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
}

/**
 * Verify a ScotDance.app pass (a compact HS256 JWT) and return its payload, or throw.
 * `audience` is this tool for a sign-in; ScotDance.app's unlink passes say `<tool>:unlink`.
 */
export function verifyPass(token: string, secret: string, now = Date.now() / 1000, audience = AUDIENCE): Pass {
  const parts = String(token).split('.')
  if (parts.length !== 3) throw new Error('Malformed pass')
  const [header, payload, signature] = parts as [string, string, string]

  if (decode(header).alg !== 'HS256') throw new Error('Unexpected algorithm')

  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Bad signature')
  }

  const pass = decode(payload) as Pass
  if (pass.iss !== ISSUER) throw new Error('Unexpected issuer')
  if (pass.aud !== audience) throw new Error('Unexpected audience')
  if (typeof pass.exp !== 'number' || pass.exp + SKEW_SECONDS < now) throw new Error('Expired')
  if (typeof pass.iat === 'number' && pass.iat - SKEW_SECONDS > now) throw new Error('Issued in the future')
  if (!pass.sub || typeof pass.sub !== 'string') throw new Error('Missing subject')
  return pass
}
