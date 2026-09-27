import {FIELD} from '../config.js';
export const SIDELINE_RETURN=.85;
const durations={substitution:4.8,foul:3.4,'late-goal':3.6,halftime:3.8,fulltime:4.2};
const variants={substitution:['instructions','welcome','discussion'],foul:['appeal','heated'],
  'late-goal':['celebrate','urgent'],halftime:['discussion','instructions'],fulltime:['applaud','reflection']};
export function queueSideline(match,kind,team,details={}){
  if(!durations[kind]||![0,1].includes(team)||['playing','intro','home','fulltime'].includes(match.phase))return false;
  match.sidelineQueue||=[];
  if(kind==='halftime'&&match.sidelineQueue.some(c=>c.kind==='substitution'))return false;
  const existing=match.sidelineQueue.find(c=>c.kind===kind&&c.team===team);
  if(existing){if(kind==='substitution')existing.changes.push(details);return true;}
  match.sidelineSerial=(match.sidelineSerial||0)+1;
  const options=variants[kind],last=match.sidelineVariants?.[kind],available=options.filter(v=>v!==last);
  const variant=available[(match.sidelineSerial+team)%available.length];
  (match.sidelineVariants||={})[kind]=variant;
  match.sidelineQueue.push({id:match.sidelineSerial,kind,team,variant,duration:durations[kind],time:0,after:0,...details,changes:kind==='substitution'?[details]:[]});
  return true;
}
export function advanceSideline(match,dt){
  if(['playing','home','intro'].includes(match.phase)){match.sideline=null;match.sidelineQueue=[];return false;}
  // Half-time changes wait until Continue. Goal cutaways wait until the replay ends.
  if(match.phase==='halftime'||match.phase==='fulltime'||match.replayActive)return false;
  if(!match.sideline){
    const next=match.sidelineQueue?.[0];if(!next||match.phaseTime<next.after)return false;
    match.sideline=match.sidelineQueue.shift();match.sideline.time=0;
    match.players.forEach(p=>{p.vx=p.vz=0;});match.charge=0;
  }
  const cue=match.sideline;cue.time+=dt;match.phaseTime+=dt;
  if(cue.time>=cue.duration+SIDELINE_RETURN){
    if(cue.kind==='substitution'&&match.moment?.type==='substitution')match.moment=null;
    match.sideline=null;
  }
  return true;
}
export function skipSideline(match){
  if(!match.sideline||match.paused)return;
  // Skip the acting, retain the camera's gentle return to the restart.
  match.sideline.time=Math.max(match.sideline.time,match.sideline.duration);
}
export function sidelineAnchor(team){return {x:team===0?-18:18,z:-FIELD.halfWidth-2.2};}
