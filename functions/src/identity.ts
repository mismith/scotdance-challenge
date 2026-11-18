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

/** The ScotDance.app uid to sign out: from the body, believed because the hub's service proof checks out. */
export async function unlinkUid(data: any, emulator: boolean): Promise<string> {
  await verifyService(data?.service, UNLINK_AUDIENCE, [SERVICES.hub], emulator)
  const uid = data.uid
  if (typeof uid !== 'string' || !uid || uid.length > 200) throw new Error('Invalid uid')
  return uid
}

/** The signature on an emailed approve/reject link. */
export const signLink = (secret: string, id: string, action: string) =>
  createHmac('sha256', secret).update(`compliments:${id}:${action}`).digest('base64url')

export function isSignedLink(secret: string, id: string, action: string, signature: string) {
  const actual = Buffer.from(signature)
  const expected = Buffer.from(signLink(secret, id, action))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
