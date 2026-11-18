import assert from 'node:assert/strict'
import { createHmac, generateKeyPairSync } from 'node:crypto'
import { test } from 'node:test'
import { SERVICES, serviceToken } from './service'
import {
  isAdminPass,
  isSignedLink,
  needsEmailVerified,
  signLink,
  unlinkUid,
  UNLINK_AUDIENCE,
} from './identity'
import { verifyPass, signPass } from './pass'
import { emulatorKey, trustedKeys } from './passKeys'

const claims = { aud: 'challenge', sub: 'abc', email: 'a@example.com', emailVerified: true }
const check = (emulator: boolean) => ({ keys: trustedKeys(emulator), audience: 'challenge' })
const legacy = (pass: unknown) => verifyPass(pass, { keys: [], audience: 'challenge:unlink', legacySecret: 'old' })

test('a pass for this tool signed with the emulator key is accepted on the emulator', () => {
  const pass = verifyPass(signPass(claims, emulatorKey().privateKey), check(true))
  assert.equal(pass.sub, 'abc')
})

test('a pass for another tool is refused', () => {
  const token = signPass({ ...claims, aud: 'binder' }, emulatorKey().privateKey)
  assert.throws(() => verifyPass(token, check(true)), /audience/)
})

test('the emulator key is refused when not on the emulator', () => {
  assert.throws(() => verifyPass(signPass(claims, emulatorKey().privateKey), check(false)), /Unknown key/)
})

test('a pass signed with some other key is refused', () => {
  const { privateKey } = generateKeyPairSync('ed25519')
  assert.throws(() => verifyPass(signPass(claims, privateKey), check(true)), /Unknown key/)
})

test('admin needs a listed email and a verified one', () => {
  const admins = ['a@example.com']
  assert.equal(isAdminPass({ email: 'A@example.com', emailVerified: true }, admins), true)
  assert.equal(isAdminPass({ email: 'a@example.com', emailVerified: false }, admins), false)
  assert.equal(isAdminPass({ email: 'a@example.com' }, admins), false)
  assert.equal(isAdminPass({ email: 'b@example.com', emailVerified: true }, admins), false)
  assert.equal(isAdminPass({ email: null, emailVerified: true }, admins), false)
})

test('only a listed, unverified email is asked to verify', () => {
  const admins = ['a@example.com']
  assert.equal(needsEmailVerified({ email: 'a@example.com', emailVerified: false }, admins), true)
  assert.equal(needsEmailVerified({ email: 'a@example.com', emailVerified: true }, admins), false)
  assert.equal(needsEmailVerified({ email: 'b@example.com', emailVerified: false }, admins), false)
})

test('unlink accepts the hub and reads the uid from the body', async () => {
  const service = await serviceToken(UNLINK_AUDIENCE, SERVICES.hub, true)
  assert.equal(await unlinkUid({ service, uid: 'abc' }, true, legacy), 'abc')
})

test('unlink refuses an unknown account', async () => {
  const service = await serviceToken(UNLINK_AUDIENCE, SERVICES.entries, true)
  await assert.rejects(unlinkUid({ service, uid: 'abc' }, true, legacy), /Unknown service/)
})

test('unlink refuses a token for another audience', async () => {
  const service = await serviceToken('https://example.com/other', SERVICES.hub, true)
  await assert.rejects(unlinkUid({ service, uid: 'abc' }, true, legacy), /elsewhere/)
})

test('unlink refuses a bad uid', async () => {
  const service = await serviceToken(UNLINK_AUDIENCE, SERVICES.hub, true)
  for (const uid of [undefined, '', 5, 'x'.repeat(201)]) {
    await assert.rejects(unlinkUid({ service, uid }, true, legacy), /Invalid uid/)
  }
})

test('unlink never falls back to the pass when a service proof is present but bad', async () => {
  const pass = signLegacy('challenge:unlink')
  await assert.rejects(unlinkUid({ service: 'nonsense', pass }, true, legacy))
  await assert.rejects(unlinkUid({ service: 5, pass }, true, legacy))
})

test('unlink still accepts the legacy pass when there is no service proof', async () => {
  assert.equal(await unlinkUid({ pass: signLegacy('challenge:unlink') }, true, legacy), 'abc')
  await assert.rejects(unlinkUid({ pass: signLegacy('challenge') }, true, legacy), /audience/)
  // a new-style pass is not a legacy one
  const modern = signPass({ ...claims, aud: 'challenge:unlink' }, emulatorKey().privateKey)
  await assert.rejects(unlinkUid({ pass: modern }, true, legacy), /Unknown key/)
})

test('compliment links verify with the new secret and the legacy one, not a wrong one', () => {
  const secrets = ['new-secret', 'old-secret']
  assert.equal(isSignedLink(secrets, 'id1', 'approve', signLink('new-secret', 'id1', 'approve')), true)
  assert.equal(isSignedLink(secrets, 'id1', 'approve', signLink('old-secret', 'id1', 'approve')), true)
  assert.equal(isSignedLink(secrets, 'id1', 'approve', signLink('wrong', 'id1', 'approve')), false)
  assert.equal(isSignedLink(secrets, 'id1', 'reject', signLink('new-secret', 'id1', 'approve')), false)
  assert.equal(isSignedLink(secrets, 'id2', 'approve', signLink('new-secret', 'id1', 'approve')), false)
})

/** LEGACY(tool-pass-secret): an HS256 pass as the old ScotDance.app signed it */
function signLegacy(aud: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const iat = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    iss: 'https://scotdance.app',
    aud,
    sub: 'abc',
    email: 'a@example.com',
    iat,
    exp: iat + 120,
    jti: 'j',
  })
  return `${header}.${payload}.${createHmac('sha256', 'old').update(`${header}.${payload}`).digest('base64url')}`
}
