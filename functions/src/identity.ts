import { createHmac, timingSafeEqual } from 'node:crypto'
import { SERVICES, verifyService } from './service'

// The small rules behind sign-in, unlinking and the compliment links, kept apart from the functions so tests can call them.

/** Where ScotDance.app's server calls unlinkScotDance: the audience of its service proof. */
export const UNLINK_AUDIENCE = 'https://us-central1-scotdance-challenge.cloudfunctions.net/unlinkScotDance'

/** Admin needs a listed email that ScotDance.app has verified. */
export function isAdminPass(
  pass: { email: string | null; emailVerified?: boolean },
  adminEmails: readonly string[],
) {
  return Boolean(pass.email) && pass.emailVerified === true && adminEmails.includes(pass.email!.toLowerCase())
}

/** A listed admin email that is not verified yet: tell them how to get admin access. */
export function needsEmailVerified(
  pass: { email: string | null; emailVerified?: boolean },
  adminEmails: readonly string[],
) {
  return Boolean(pass.email) && pass.emailVerified !== true && adminEmails.includes(pass.email!.toLowerCase())
}

/**
 * The ScotDance.app uid to sign out. With `service` it comes from the body, believed because of who sent it;
 * without, from the old signed pass. `verifyLegacyPass` throws if the pass is bad.
 */
export async function unlinkUid(
  data: any,
  emulator: boolean,
  verifyLegacyPass: (pass: unknown) => { sub: string },
): Promise<string> {
  if (data?.service !== undefined && data?.service !== null) {
    await verifyService(data.service, UNLINK_AUDIENCE, [SERVICES.hub], emulator)
    const uid = data.uid
    if (typeof uid !== 'string' || !uid || uid.length > 200) throw new Error('Invalid uid')
    return uid
  }
  // LEGACY(tool-pass-secret)
  return verifyLegacyPass(data?.pass).sub
}

/** The signature on an emailed approve/reject link. */
export const signLink = (secret: string, id: string, action: string) =>
  createHmac('sha256', secret).update(`compliments:${id}:${action}`).digest('base64url')

/** `secrets` is the new secret, then (LEGACY(tool-pass-secret)) the old one, so links already emailed still work. */
export function isSignedLink(secrets: readonly string[], id: string, action: string, signature: string) {
  const actual = Buffer.from(signature)
  return secrets.some((secret) => {
    const expected = Buffer.from(signLink(secret, id, action))
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  })
}
