import {
  addDays,
  endOfDay,
  isAfter,
  isBefore,
  parse,
  startOfDay,
  subDays,
  subWeeks,
} from 'date-fns'
import type { Challenge } from '@/lib/firebase'

type Dates = Pick<Challenge, 'startAt' | 'endAt' | 'hasFinalCountdown' | '$lastEntryAt'>

export function getChallengeStartDate(challenge?: Dates | null) {
  if (challenge?.startAt) {
    return startOfDay(parse(challenge.startAt, 'yyyy-MM-dd', new Date()))
  }
  return null
}

export function getChallengeEndDate(challenge?: Dates | null) {
  if (challenge?.endAt) {
    return endOfDay(parse(challenge.endAt, 'yyyy-MM-dd', new Date()))
  }
  return null
}

export function isChallengeActive(challenge?: Dates | null) {
  if (!challenge) return false
  const startDate = getChallengeStartDate(challenge)
  const endDate = getChallengeEndDate(challenge)
  return (
    (startDate ? isBefore(startDate, new Date()) : true) &&
    (endDate ? isAfter(endDate, new Date()) : true)
  )
}

export function isChallengeUpcoming(challenge?: Dates | null) {
  const startDate = getChallengeStartDate(challenge)
  return startDate ? isAfter(startDate, new Date()) : false
}

export function isChallengeRecentlyEnded(challenge?: Dates | null) {
  const endDate = getChallengeEndDate(challenge)
  const now = new Date()
  return endDate ? isBefore(endDate, now) && isAfter(endDate, subWeeks(now, 2)) : false
}

export function isChallengeInFinalCountdown(challenge?: Dates | null) {
  if (!challenge?.hasFinalCountdown) return false
  const endDate = getChallengeEndDate(challenge)
  if (!endDate) return false
  return isChallengeActive(challenge) && isBefore(endDate, addDays(new Date(), 7))
}

// an open-ended challenge with no new entries for this long stops showing as live
const DORMANT_DAYS = 60

/** Running now: dated and in range, or open-ended with a recent entry */
export function isChallengeLive(challenge?: Dates | null) {
  if (!isChallengeActive(challenge)) return false
  if (challenge?.endAt) return true
  const lastEntryAt = challenge?.$lastEntryAt?.toDate()
  return Boolean(lastEntryAt && isAfter(lastEntryAt, subDays(new Date(), DORMANT_DAYS)))
}

/** The year a challenge belongs to in the hall of fame */
export function getChallengeYear(challenge?: Dates | null) {
  const date =
    getChallengeEndDate(challenge) ??
    challenge?.$lastEntryAt?.toDate() ??
    getChallengeStartDate(challenge)
  return date?.getFullYear() ?? null
}
