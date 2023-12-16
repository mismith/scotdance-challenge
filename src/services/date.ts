import {
  parse,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
  subWeeks,
  addDays,
} from 'date-fns';
import { Challenge } from '@/plugins/firebase';

export function getChallengeStartDate(challenge: Challenge) {
  if (challenge && challenge.startAt) {
    return startOfDay(parse(challenge.startAt, 'yyyy-MM-dd', new Date()));
  }
  return null;
}

export function getChallengeEndDate(challenge: Challenge) {
  if (challenge && challenge.endAt) {
    return endOfDay(parse(challenge.endAt, 'yyyy-MM-dd', new Date()));
  }
  return null;
}

export function isChallengeActive(challenge: Challenge) {
  if (challenge) {
    const startDate = getChallengeStartDate(challenge);
    const endDate = getChallengeEndDate(challenge);
    return (startDate ? isBefore(startDate, new Date()) : true)
      && (endDate ? isAfter(endDate, new Date()) : true);
  }
  return false;
}

export function isChallengeUpcoming(challenge: Challenge) {
  if (challenge) {
    const startDate = getChallengeStartDate(challenge);
    return startDate ? isAfter(startDate, new Date()) : false;
  }
  return false;
}
export function isChallengeRecentlyEnded(challenge: Challenge) {
  if (challenge) {
    const endDate = getChallengeEndDate(challenge);
    return endDate ? isAfter(endDate, subWeeks(new Date(), 2)) : false;
  }
  return false;
}
export function isChallengeInFinalCountdown(challenge: Challenge) {
  if (challenge && challenge.hasFinalCountdown) {
    const endDate = getChallengeEndDate(challenge);
    if (!endDate) return false;
    return isChallengeActive(challenge) && isBefore(endDate, addDays(new Date(), 7));
  }
  return false;
}
