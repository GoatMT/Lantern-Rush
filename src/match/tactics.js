import { FIELD,clamp,distance,normalize } from '../config.js';

export function laneClearance(match,player,target){
  const dx=target.x-player.x,dz=target.z-player.z,length2=dx*dx+dz*dz;let clearance=20;
  for(const opponent of match.active(1-player.team)){
    if(opponent.role==='GK')continue;
    const t=((opponent.x-player.x)*dx+(opponent.z-player.z)*dz)/(length2||1);
    if(t>.035&&t<.98)clearance=Math.min(clearance,Math.hypot(opponent.x-player.x-dx*t,opponent.z-player.z-dz*t));
  }
  return clearance;
}

export function chooseShotTarget(match,player){
  const x=match.direction(player.team)*FIELD.halfLength,keeper=match.active(1-player.team).find(p=>p.role==='GK');
  const targets=[-FIELD.goalHalf*.72,FIELD.goalHalf*.72,0];
  const score=z=>Math.min(laneClearance(match,player,{x,z}),4)*2+Math.abs(z-(keeper?.z||0))*.8-Math.abs(z-player.z)*.035;
  targets.sort((a,b)=>score(b)-score(a));
  return match.random()<match.aiConfig(player.team).awareness?targets[0]:targets[Math.floor(match.random()*targets.length)];
}

export function defensivePair(match,team,players,ball){
  if(!players.length)return [];
  match.defensiveRoles??=[null,null];const previous=match.defensiveRoles[team],direction=match.direction(team);
  const score=p=>distance(p,ball)+(p.x*direction>ball.x*direction?1.4:0)+(p.action&&['fall','get-up','slide-tackle'].includes(p.action.name)?6:0);
  const ranked=[...players].sort((a,b)=>score(a)-score(b));
  // Commit to pressure until another defender is meaningfully better placed.
  const press=previous&&players.includes(previous.press)&&score(previous.press)<score(ranked[0])+1.6?previous.press:ranked[0];
  const cover=ranked.filter(p=>p!==press).sort((a,b)=>score(a)-score(b)+(a.role==='DEF'?-.4:0)-(b.role==='DEF'?-.4:0))[0];
  match.defensiveRoles[team]={press,cover};return cover?[press,cover]:[press];
}

export function coverPoint(match,team,press){
  const ball=match.ball,owner=ball.owner,config=match.aiConfig(team),direction=match.direction(team);
  const point={x:ball.x+(owner?.vx||0)*.22,z:ball.z+(owner?.vz||0)*.22};
  const goal=normalize(-direction*FIELD.halfLength-point.x,-point.z);
  const depth=Math.min(config.coverGap,Math.max(2.5,(FIELD.halfLength+point.x*direction)*.28));
  const flank=-Math.sign((press?.z??ball.z)-ball.z||1)*1.15;
  return {x:point.x+goal.x*depth,z:point.z+goal.z*depth+flank};
}

export function attackingDecision(match,p,target){
  const config=match.aiConfig(p.team),direction=match.direction(p.team),ball=match.ball;
  const goalDistance=FIELD.halfLength-p.x*direction,angle=Math.abs(p.z)/Math.max(goalDistance,1);
  const opponents=match.active(1-p.team),pressure=opponents.filter(o=>distance(p,o)<4.2);
  if(p.holdTime<.3+config.reaction*.15||distance(p,ball)>2.5)return 'dribble';
  const shotLane=laneClearance(match,p,{x:direction*FIELD.halfLength,z:0});
  const kickoff=match.kickoffAttack;
  if(p.team===1&&kickoff?.armed&&!kickoff.used&&match.elapsed<=kickoff.until&&Math.abs(p.x)<14&&Math.abs(p.z)<14&&p.holdTime>.65&&pressure.length===0&&shotLane>2){
    kickoff.used=true;return 'surprise-shot';
  }
  const closeChance=goalDistance<16&&angle<.95;
  const shootingChance=goalDistance<config.shotRange&&angle<.62&&p.holdTime>.7;
  if(shotLane>1.45&&(closeChance||shootingChance)&&(!shootingChance||closeChance||match.random()<config.awareness))return 'shoot';
  if(target&&p.holdTime>.6){
    const lane=laneClearance(match,p,target),progress=(target.x-p.x)*direction;
    const targetSpace=Math.min(20,...opponents.map(o=>distance(o,target)));
    const returnPass=target===p.receivedFrom&&p.holdTime<3;
    const releasePressure=pressure.length>0&&lane>1.25&&targetSpace>3;
    const improveAttack=progress>8&&targetSpace>5&&lane>2.2&&!returnPass&&p.holdTime>1.4;
    const crossFromWing=Math.abs(p.z)>FIELD.halfWidth*.65&&goalDistance<25&&Math.abs(target.z)<FIELD.boxHalf&&lane>2;
    if((releasePressure||improveAttack||crossFromWing)&&match.random()<.65+config.awareness*.35)return 'pass';
  }
  if(pressure.length&&p.cooldown<=0&&match.random()<.25+config.awareness*.35)return 'skill';
  return 'dribble';
}
