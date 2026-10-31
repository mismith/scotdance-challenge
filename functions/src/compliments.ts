import { createHmac, timingSafeEqual } from 'node:crypto'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'
import {
  APP_URL,
  adminEmailsSecret,
  escapeHtml,
  getAdminEmails,
  postmarkTokenSecret,
  sendEmail,
} from './email'

// the approve/reject links are signed with a key derived from this, so it needs no secret of its own
const toolPassSecret = defineSecret('TOOL_PASS_SECRET')

const profanity = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

/** What two compliments that only differ in emoji, punctuation or spacing have in common */
export const toKey = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

type Action = 'approve' | 'reject'
const sign = (id: string, action: Action) =>
  createHmac('sha256', toolPassSecret.value())
    .update(`compliments:${id}:${action}`)
    .digest('base64url')
function isSigned(id: string, action: Action, signature: string) {
  const expected = Buffer.from(sign(id, action))
  const actual = Buffer.from(signature)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
const approvedRef = () => getFirestore().collection('compliments').doc('approved')

/** Drop duplicates and swearing; email the admins one-tap links for the rest */
export const onComplimentSubmitted = onDocumentCreated(
  {
    document: 'complimentsSubmitted/{id}',
    secrets: [adminEmailsSecret, postmarkTokenSecret, toolPassSecret],
  },
  async (event) => {
    const snapshot = event.data
    const text = String(snapshot?.get('text') ?? '').trim()
    if (!snapshot || !text) return
    const key = toKey(text)

    const approved: string[] = (await approvedRef().get()).get('texts') ?? []
    const submitted = await snapshot.ref.parent.where('key', '==', key).limit(1).get()
    const isDuplicate =
      !key || approved.some((other) => toKey(other) === key) || !submitted.empty
    const status = isDuplicate ? 'duplicate' : profanity.hasMatch(text) ? 'rejected' : 'pending'
    await snapshot.ref.update({ key, status })
    if (status !== 'pending') return

    const url = (action: Action) =>
      `${APP_URL}/api/moderate-compliment?id=${snapshot.id}&action=${action}&sig=${sign(snapshot.id, action)}`
    await sendEmail(
      getAdminEmails(),
      `New compliment: ${text}`,
      `<p>Someone submitted a compliment:</p>
<p style="font-size: 1.5em; text-transform: capitalize"><strong>${escapeHtml(text)}!</strong></p>
<p><a href="${url('approve')}">Approve</a> &nbsp;·&nbsp; <a href="${url('reject')}">Reject</a></p>`,
    )
  },
)

const page = (body: string) =>
  `<!doctype html><meta name="viewport" content="width=device-width"><body style="font: 18px system-ui; text-align: center; padding: 48px 16px">${body}</body>`

/**
 * The emailed links: GET asks to confirm (so link scanners can't approve anything), POST does it.
 * Served at /api/moderate-compliment by a Hosting rewrite.
 */
export const moderateCompliment = onRequest({ secrets: [toolPassSecret] }, async (req, res) => {
  const { id, action, sig } = { ...req.query, ...req.body } as Record<string, string>
  if (!id || (action !== 'approve' && action !== 'reject') || !sig || !isSigned(id, action, sig)) {
    res.status(403).send(page('That link has expired or is broken.'))
    return
  }
  const ref = getFirestore().collection('complimentsSubmitted').doc(id)
  const text = String((await ref.get()).get('text') ?? '')

  if (req.method !== 'POST') {
    res.send(
      page(`<p style="text-transform: capitalize"><strong>${escapeHtml(text)}!</strong></p>
<form method="post">
  <input type="hidden" name="id" value="${escapeHtml(id)}">
  <input type="hidden" name="action" value="${action}">
  <input type="hidden" name="sig" value="${escapeHtml(sig)}">
  <button style="font: inherit; padding: 12px 32px">${action === 'approve' ? 'Approve' : 'Reject'}</button>
</form>`),
    )
    return
  }

  if (action === 'approve') {
    await approvedRef().set({ texts: FieldValue.arrayUnion(text) }, { merge: true })
  }
  await ref.update({ status: action === 'approve' ? 'approved' : 'rejected' })
  res.send(page(`${action === 'approve' ? 'Approved' : 'Rejected'} 👍`))
})
