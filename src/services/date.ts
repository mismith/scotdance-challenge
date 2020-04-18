import { parse, startOfDay, endOfDay } from 'date-fns';
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
