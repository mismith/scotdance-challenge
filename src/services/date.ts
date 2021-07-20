import {
  parse,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
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
