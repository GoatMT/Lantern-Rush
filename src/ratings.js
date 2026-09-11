import { clamp } from './config.js';

// Derived game values use the website's player OVR; no new source ratings are invented.
export function staminaCapacity(overall){
  const rating=Number.isFinite(overall)?overall:75;
  return .7+.3*clamp((rating-75)/24,0,1);
}
export function teamOverall(players){
  const values=players.filter(p=>!p.sentOff).map(p=>p.data?.overall??p.overall).filter(Number.isFinite);
  return values.length?clamp(Math.round(values.reduce((sum,rating)=>sum+rating,0)/values.length),60,99):null;
}
