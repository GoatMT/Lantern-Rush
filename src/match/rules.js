import { FIELD,clamp } from '../config.js';
// Small-sided arcade rules deliberately have no offside state or offside checks.
export function boundaryEvent(ball,previous,teamsDirection){
  const L=FIELD.halfLength,W=FIELD.halfWidth,R=FIELD.ballRadius;
  const crossings=[];
  if(Math.abs(ball.x)>L+R&&Math.abs(previous.x)<=L+R){
    const side=Math.sign(ball.x),t=(side*(L+R)-previous.x)/(ball.x-previous.x);
    crossings.push({axis:'x',side,t,z:previous.z+(ball.z-previous.z)*t,y:previous.y+(ball.y-previous.y)*t});
  }
  if(Math.abs(ball.z)>W+R&&Math.abs(previous.z)<=W+R){
    const side=Math.sign(ball.z),t=(side*(W+R)-previous.z)/(ball.z-previous.z);
    crossings.push({axis:'z',side,t,x:previous.x+(ball.x-previous.x)*t});
  }
  crossings.sort((a,b)=>a.t-b.t);const crossing=crossings[0];if(!crossing)return null;
  const last=ball.lastTouch?.team??0;
  if(crossing.axis==='z')return {type:'THROW-IN',team:1-last,x:clamp(crossing.x,-L+.6,L-.6),z:crossing.side*(W-.2)};
  const attacking=teamsDirection.findIndex(d=>d===crossing.side),defending=1-attacking;
  if(Math.abs(crossing.z)<FIELD.goalHalf-R&&crossing.y<FIELD.goalHeight-R)
    return {type:'GOAL',team:attacking,side:crossing.side};
  return last===defending
    ?{type:'CORNER',team:attacking,x:crossing.side*(L-.3),z:Math.sign(crossing.z||1)*(W-.3)}
    :{type:'GOAL KICK',team:defending,x:crossing.side*(L-FIELD.goalBoxDepth),z:0};
}
export function goalFrameCollision(ball,previous){
  if(ball.owner)return false;
  for(const side of [-1,1]){
    const plane=side*FIELD.halfLength;
    const reach=FIELD.ballRadius+FIELD.postRadius;
    if((previous.x-plane)*(ball.x-plane)>0 && Math.abs(ball.x-plane)>reach+.06)continue;
    const dx=ball.x-previous.x,t=Math.abs(dx)>.0001?clamp((plane-previous.x)/dx,0,1):1;
    const z=previous.z+(ball.z-previous.z)*t,y=previous.y+(ball.y-previous.y)*t;
    if((Math.abs(Math.abs(z)-FIELD.goalHalf)<reach&&y<FIELD.goalHeight+reach)||(Math.abs(y-FIELD.goalHeight)<reach&&Math.abs(z)<FIELD.goalHalf+reach)){
      ball.x=plane-side*(reach+.1);ball.vx=-ball.vx*.72;ball.vz+=Math.sign(z||1)*1.5;return true;
    }
  }
  return false;
}
export function foulRestart(victim,direction){
  const inBox=victim.x*direction>FIELD.halfLength-FIELD.boxDepth&&Math.abs(victim.z)<FIELD.boxHalf;
  return {type:inBox?'PENALTY':'FREE KICK',team:victim.team,
    x:inBox?direction*(FIELD.halfLength-FIELD.penaltyDistance):clamp(victim.x,-FIELD.halfLength+.5,FIELD.halfLength-.5),
    z:inBox?0:clamp(victim.z,-FIELD.halfWidth+.5,FIELD.halfWidth-.5)};
}
