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
  assert.equal(await unlinkUid({ service, uid: 'abc' }, true), 'abc')
})

test('unlink refuses an unknown account', async () => {
  const service = await serviceToken(UNLINK_AUDIENCE, SERVICES.entries, true)
  await assert.rejects(unlinkUid({ service, uid: 'abc' }, true), /Unknown service/)
})

test('unlink refuses a token for another audience', async () => {
  const service = await serviceToken('https://example.com/other', SERVICES.hub, true)
  await assert.rejects(unlinkUid({ service, uid: 'abc' }, true), /elsewhere/)
})

test('unlink refuses a bad uid', async () => {
  const service = await serviceToken(UNLINK_AUDIENCE, SERVICES.hub, true)
  for (const uid of [undefined, '', 5, 'x'.repeat(201)]) {
    await assert.rejects(unlinkUid({ service, uid }, true), /Invalid uid/)
  }
})

test('unlink refuses a call with no proof', async () => {
  for (const data of [{ uid: 'abc' }, { uid: 'abc', service: 5 }, { uid: 'abc', pass: 'x' }]) {
    await assert.rejects(unlinkUid(data, true))
  }
})

test('compliment links verify with their secret only', () => {
  assert.equal(isSignedLink('secret', 'id1', 'approve', signLink('secret', 'id1', 'approve')), true)
  assert.equal(isSignedLink('secret', 'id1', 'approve', signLink('wrong', 'id1', 'approve')), false)
  assert.equal(isSignedLink('secret', 'id1', 'reject', signLink('secret', 'id1', 'approve')), false)
  assert.equal(isSignedLink('secret', 'id2', 'approve', signLink('secret', 'id1', 'approve')), false)
})

/** A pass signed some other way than EdDSA, with a valid-looking body */
function forge(header: object, secret?: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const iat = Math.floor(Date.now() / 1000)
  const head = encode(header)
  const payload = encode({ iss: 'https://scotdance.app', ...claims, iat, exp: iat + 120, jti: 'j' })
  const signature = secret ? createHmac('sha256', secret).update(`${head}.${payload}`).digest('base64url') : ''
  return `${head}.${payload}.${signature}`
}

test('a pass that is not EdDSA is refused: HS256 and alg none', () => {
  assert.throws(() => verifyPass(forge({ alg: 'HS256', typ: 'JWT' }, 'old'), check(true)), /Unexpected algorithm/)
  assert.throws(() => verifyPass(forge({ alg: 'none', typ: 'JWT' }), check(true)), /Unexpected algorithm/)
})

test('an expired pass and an unknown key id are refused', () => {
  const token = signPass(claims, emulatorKey().privateKey, Date.now() / 1000 - 3600)
  assert.throws(() => verifyPass(token, check(true)), /Expired/)
  const [, payload, signature] = signPass(claims, emulatorKey().privateKey).split('.')
  const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: 'nope' })).toString('base64url')
  assert.throws(() => verifyPass(`${header}.${payload}.${signature}`, check(true)), /Unknown key/)
})
