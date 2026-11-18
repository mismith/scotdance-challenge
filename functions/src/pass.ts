import { randomUUID, sign, verify, type KeyObject } from 'node:crypto'
import { keyId } from './passKeys'

// A ScotDance.app sign-in pass: a two-minute JWT saying who someone is, for one tool alone. ScotDance.app signs
// it with its private key (EdDSA); a tool checks it with the public key in passKeys.ts. This file is the same
// in Entries, Binder and Challenge: change all three together.

export interface Pass {
  iss: string
  aud: string
  sub: string
  email: string | null
  emailVerified?: boolean
  name?: string | null
  iat: number
  exp: number
  jti: string
}

export interface PassCheck {
  /** `trustedKeys(emulator)` */
  keys: readonly KeyObject[]
  /** Exactly who the pass must be for. More than one only while an audience is being renamed. */
  audience: string | readonly string[]
  /** Seconds. */
  now?: number
}

const ISSUER = 'https://scotdance.app'
const SKEW_SECONDS = 30
const MAX_SECONDS = 120

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** The pass's claims, or throws. `T` adds the claims a tool expects beyond who the person is. */
export function verifyPass<T extends Pass = Pass>(token: unknown, check: PassCheck): T {
  if (typeof token !== 'string' || token.length > 100_000) throw new Error('Malformed pass')
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed pass')
  const [header, payload, signature] = parts as [string, string, string]
  const signed = Buffer.from(`${header}.${payload}`)
  const given = Buffer.from(signature, 'base64url')
  // One pass, one spelling: receipts keyed on a pass must not be dodged by re-encoding its signature
  if (given.toString('base64url') !== signature) throw new Error('Bad signature')

  // Only ever a signature made with one of ScotDance.app's keys: no other algorithm, and no shared secrets
  const head = decode(header)
  if (head.alg !== 'EdDSA') throw new Error('Unexpected algorithm')
  const key = check.keys.find((candidate) => keyId(candidate) === head.kid)
  if (!key || key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') throw new Error('Unknown key')
  if (!verify(null, signed, key, given)) throw new Error('Bad signature')

  const pass = decode(payload) as T
  const now = check.now ?? Date.now() / 1000
  const audiences = typeof check.audience === 'string' ? [check.audience] : check.audience
  if (pass.iss !== ISSUER) throw new Error('Unexpected issuer')
  if (typeof pass.aud !== 'string' || !audiences.includes(pass.aud)) throw new Error('Unexpected audience')
  if (!Number.isFinite(pass.iat) || !Number.isFinite(pass.exp)) throw new Error('Invalid lifetime')
  if (pass.exp <= pass.iat || pass.exp - pass.iat > MAX_SECONDS) throw new Error('Invalid lifetime')
  if (pass.exp + SKEW_SECONDS < now) throw new Error('Expired')
  if (pass.iat - SKEW_SECONDS > now) throw new Error('Issued in the future')
  if (typeof pass.jti !== 'string' || !pass.jti) throw new Error('Missing pass id')
  if (typeof pass.sub !== 'string' || !pass.sub) throw new Error('Missing subject')
  return pass
}

/** Mint a pass the way ScotDance.app does. Only for the emulator's devPass and tests. */
export function signPass(
  claims: Pick<Pass, 'aud' | 'sub' | 'email'> & Partial<Pass> & Record<string, unknown>,
  privateKey: KeyObject,
  now = Date.now() / 1000,
): string {
  const iat = Math.floor(now)
  const header = encode({ alg: 'EdDSA', typ: 'JWT', kid: keyId(privateKey) })
  const payload = encode({ iss: ISSUER, iat, exp: iat + MAX_SECONDS, jti: randomUUID(), ...claims })
  const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString('base64url')
  return `${header}.${payload}.${signature}`
}
