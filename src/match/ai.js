import { updateKeeper } from './goalkeeper.js';
import { FORMATION,FIELD,PLAY,fieldUnits as u,clamp,distance,normalize } from '../config.js';

export function bestPass(match,player,aim=null){
  const direction=match.direction(player.team),opponents=match.active(1-player.team);
  let best=null,bestScore=-Infinity,fallback=null;
  for(const mate of match.active(player.team)){
    if(mate===player||(mate.role==='GK'&&(player.role==='GK'||player.x*direction>0)))continue;
    const dist=distance(player,mate);
    if(!fallback||dist<distance(player,fallback))fallback=mate;
    if(dist<3||dist>u(49))continue;
    const dx=mate.x-player.x,dz=mate.z-player.z,n=normalize(dx,dz);
    let openness=u(8);
    for(const opp of opponents){
      const t=clamp(((opp.x-player.x)*dx+(opp.z-player.z)*dz)/(dist*dist),0,1);
      const gap=Math.hypot(opp.x-player.x-dx*t,opp.z-player.z-dz*t);
      if(t>.06&&t<.97)openness=Math.min(openness,gap);
    }
    const alignment=aim?(n.x*aim.x+n.z*aim.z)*18:dx*direction/u(1)*.2;
    const nextLine=(player.role==='GK'&&mate.role==='DEF')||(player.role==='DEF'&&mate.role==='MID')||(player.role==='MID'&&mate.role==='FWD');
    const switchWing=Math.abs(player.z)>u(9)&&mate.z*player.z<0&&openness>u(4);
    const score=alignment+Math.min(openness,u(6))/u(1)*2.8-dist*.12+(dx*direction>0?2:0)+(nextLine?4:0)+(switchWing?5:0);
    if(score>bestScore){bestScore=score;best=mate;}
  }
  return best||fallback;
}

export function ballIntercept(ball,seconds=.24){
  const drag=ball.y>FIELD.ballRadius+.1?PLAY.airDrag:PLAY.groundDrag;
  const travel=(1-Math.exp(-drag*seconds))/drag;
  return {x:clamp(ball.x+ball.vx*travel,-FIELD.halfLength+.8,FIELD.halfLength-.8),
    z:clamp(ball.z+ball.vz*travel,-FIELD.halfWidth+.8,FIELD.halfWidth-.8)};
}

export function updateAI(match,dt){
  const b=match.ball,owner=b.owner,possession=owner?.team??b.pass?.team;
  match.tacticalTime=(match.tacticalTime||0)+dt;
  for(const p of match.players)p.watch(b);
  for(let team=0;team<2;team++){
    const direction=match.direction(team),squad=match.active(team),field=squad.filter(p=>p.role!=='GK');
    const nearest=[...field].sort((a,c)=>distance(a,b)-distance(c,b));
    const chasers=nearest.slice(0,possession===team?0:2);
    // Each nearby threat gets at most one marker; two players press and cover.
    const marks=new Map(),available=field.filter(p=>!chasers.includes(p));
    const threats=match.active(1-team).filter(p=>p.role!=='GK'&&p!==owner)
      .sort((a,c)=>a.x*direction-c.x*direction);
    if(possession!==team)for(const threat of threats){
      const marker=available.filter(p=>!marks.has(p)&&Math.abs(threat.z-FORMATION[p.slot].z)<u(13))
        .sort((a,c)=>distance(a,threat)-distance(c,threat))[0];
      if(marker&&distance(marker,threat)<u(13))marks.set(marker,threat);
    }
    for(const p of squad){
      if(match.phase!=='playing')return;
      if(p===match.controlled&&p.role!=='GK')continue;
      const home=FORMATION[p.slot];let tx=home.x*direction,tz=home.z,sprint=false;
      if(p.role==='GK'){updateKeeper(match,p,dt);continue;
      }else if(owner===p){
        const goalDistance=FIELD.halfLength-p.x*direction;
        const defenders=match.active(1-team).filter(o=>distance(p,o)<5);
        tx=direction*FIELD.halfLength;tz=clamp(p.z*.6,-FIELD.boxHalf*.65,FIELD.boxHalf*.65);
        if(distance(p,b)>2.3){tx=b.x;tz=b.z;}
        p.move(tx-p.x,tz-p.z,defenders.length?.72:1,dt,defenders.length===0&&goalDistance>u(8));
        if(p.decision<=0){
          const config=match.aiConfig(team);p.decision=config.reaction*(.8+match.random()*.55);
          const target=bestPass(match,p),angle=Math.abs(p.z)/Math.max(goalDistance,1);
          const lane=match.active(1-team).filter(o=>o.role!=='GK'&&(o.x-p.x)*direction>0&&Math.abs(o.z-p.z*.5)<2.5&&distance(o,p)<18);
          const clearChance=goalDistance<14&&angle<.85&&!lane.length;
          const longChance=goalDistance<PLAY.shootingRange&&angle<.55&&!lane.length&&p.holdTime>1.5&&match.random()<.32;
          if(distance(p,b)<2.5&&p.holdTime>.45&&(clearChance||longChance))
            match.shoot(p,clamp(goalDistance/PLAY.shootingRange*.7+match.random()*.3,.35,1));
          else if(target&&p.holdTime>1.05&&(defenders.length||p.holdTime>2.6||Math.abs(p.z)>FIELD.halfWidth*.66)&&match.random()<.9)match.pass(p);
          else if(defenders.length&&p.cooldown<=0&&match.random()<.45)match.skill(p,{...normalize(direction,-Math.sign(p.z)*.7),intensity:1});
        }
        continue;
      }else if(b.pass?.target===p){
        const point=ballIntercept(b,clamp(distance(p,b)/PLAY.runSpeed*.25,.15,.65));
        const meetAtTarget=(b.y>2||distance(p,b)>u(7))&&Math.hypot(b.vx,b.vz)>8;
        tx=meetAtTarget?b.pass.x:point.x;tz=meetAtTarget?b.pass.z:point.z;sprint=distance(p,b)>u(5);
      }else if(chasers.includes(p)){
        const first=chasers[0]===p,point=ballIntercept(b);
        if(first){tx=point.x;tz=point.z;sprint=distance(p,b)>5;}
        else{tx=b.x-direction*PLAY.pressureCover;tz=b.z+Math.sign(home.z-b.z||1)*PLAY.supportGap;}
        if(first&&owner&&owner.team!==team&&distance(p,owner)<1.65&&p.cooldown<=0&&p.decision<=0){
          p.decision=match.aiConfig(team).reaction;
          const approach=normalize(p.x-owner.x,p.z-owner.z);
          if(approach.x*owner.faceX+approach.z*owner.faceZ>-.3&&match.random()<match.aiConfig(team).pressure*.68)match.tackle(p);
        }
      }else if(possession===team){
        const progress=clamp(b.x*direction+u(14),-u(4),u(29));
        tx=clamp(home.x+progress*.7,-u(25),FIELD.halfLength-u(3))*direction;
        tz=clamp(home.z+(b.z-home.z)*.12,-FIELD.halfWidth+u(2),FIELD.halfWidth-u(2));
        if(p.role==='FWD'){
          tx=clamp(b.x*direction+u(11)*p.attributes.forwardRun,-u(4),FIELD.halfLength-u(2.5))*direction;
          const nearWing=Math.sign(home.z)===Math.sign(b.z),boxAttack=b.x*direction>FIELD.halfLength-FIELD.boxDepth*1.6;
          tz=boxAttack?(nearWing?Math.sign(b.z)*FIELD.goalHalf*.6:-Math.sign(b.z||1)*FIELD.goalHalf*.8):home.z*1.85;
          tx-=u(1.5)*(1+Math.sin(match.tacticalTime*.6+p.slot));sprint=tx*direction-p.x*direction>u(6)&&p.stamina>.35;
        }
        if(p.role==='MID'){
          const onBallSide=home.z*b.z>0,overlap=onBallSide&&owner?.role==='FWD'&&b.x*direction>0;
          tz=Math.sign(home.z)*FIELD.halfWidth*(overlap?.82:.67)+Math.sin(match.tacticalTime*.45+p.slot)*u(1.5);
          if(overlap)tx=clamp(b.x*direction+u(6),-u(20),FIELD.halfLength-u(4))*direction;
          else if(Math.abs(p.x-b.x)<u(5))tx=b.x-direction*u(6);
          sprint=overlap&&distance(p,b)>u(8);
        }
      }else{
        tx=clamp(home.x+b.x*direction*.32,-FIELD.halfLength+u(3),u(24))*direction;
        tz=clamp(home.z+b.z*.2,-FIELD.halfWidth+u(3),FIELD.halfWidth-u(3));
        const threat=marks.get(p);
        if(threat){tx=tx*.25+(threat.x-direction*u(2))*.75;tz=tz*.25+threat.z*.75;}
        sprint=p.role==='DEF'&&(p.x-b.x)*direction>u(4);
      }
      if(possession===team&&p.role==='DEF'){
        // The back line also offers a moving outlet when play is on the opposite wing.
        tz+=Math.sin(match.tacticalTime*.4+p.slot)*u(1.2);tx+=Math.sin(match.tacticalTime*.28+p.slot)*u(1.4)*direction;
      }
      tx=clamp(tx,-FIELD.halfLength+.7,FIELD.halfLength-.7);tz=clamp(tz,-FIELD.halfWidth+.7,FIELD.halfWidth-.7);
      const gap=Math.hypot(tx-p.x,tz-p.z);
      let sx=0,sz=0;
      for(const mate of squad){
        if(mate===p)continue;const dist=distance(p,mate),space=p.role==='GK'?2:PLAY.supportGap;
        if(dist<space&&dist>.01){sx+=(p.x-mate.x)/dist*(space-dist);sz+=(p.z-mate.z)/dist*(space-dist);}
      }
      p.move(tx-p.x+sx,tz-p.z+sz,gap>.3?Math.min(1,gap/2):0,dt,sprint,((possession!==team&&distance(p,b)<u(8))||(b.pass?.target===p&&distance(p,b)<12))?b:null);
    }
  }
}
