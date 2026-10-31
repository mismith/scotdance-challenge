import { getFirestore } from 'firebase-admin/firestore'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import {
  APP_URL,
  adminEmailsSecret,
  escapeHtml,
  getAdminEmails,
  postmarkTokenSecret,
  sendEmail,
} from './email'

/** Tell the admins (only) about a flagged entry */
export const onFlagCreated = onDocumentCreated(
  { document: 'flags/{flagId}', secrets: [adminEmailsSecret, postmarkTokenSecret] },
  async (event) => {
    const flag = event.data?.data()
    if (!flag) return
    const db = getFirestore()
    const get = async (collection: string, id?: string) =>
      id ? (await db.collection(collection).doc(id).get()).data() : undefined

    const entry = await get('entries', flag.entryId)
    const challenge = await get('challenges', flag.challengeId)
    if (!challenge) return
    const participant = await get('participants', entry?.participantId)
    const group = await get('groups', entry?.groupId)

    const link = `${APP_URL}/${challenge.private ? 'private' : 'public'}/${flag.challengeId}?to=activity#entry-${flag.entryId}`
    const what = entry
      ? `+${entry.value} by ${participant?.name ?? '?'} of ${group?.name ?? '?'}`
      : 'an entry that has since been deleted'

    await sendEmail(
      getAdminEmails(),
      `Flagged in ${challenge.name}`,
      `<p>Someone flagged ${escapeHtml(what)} in <strong>${escapeHtml(challenge.name)}</strong>:</p>
<blockquote>${escapeHtml(flag.reason || '(no reason given)')}</blockquote>
<p><a href="${link}">Open it</a> to fix or delete the entry, or dismiss the flag.</p>`,
    )
  },
)
