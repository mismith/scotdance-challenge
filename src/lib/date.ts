import { addDays, endOfDay, isAfter, isBefore, parse, startOfDay, subWeeks } from 'date-fns'
import type { Challenge } from '@/lib/firebase'

type Dates = Pick<Challenge, 'startAt' | 'endAt' | 'hasFinalCountdown'>

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
  return endDate ? isAfter(endDate, subWeeks(new Date(), 2)) : false
}

export function isChallengeInFinalCountdown(challenge?: Dates | null) {
  if (!challenge?.hasFinalCountdown) return false
  const endDate = getChallengeEndDate(challenge)
  if (!endDate) return false
  return isChallengeActive(challenge) && isBefore(endDate, addDays(new Date(), 7))
}
