import { FIELD,PLAY,FORMATION,fieldUnits as u,DIFFICULTY,clamp,distance,normalize } from '../config.js';
import { Player } from './player.js';
import { playerLabel } from '../player-label.js';
import { Ball } from './ball.js';
import { updateAI,bestPass,ballIntercept } from './ai.js';
import { boundaryEvent,goalFrameContact,resolveFrameContact,foulRestart } from './rules.js';
import { playerContact } from './contacts.js';
import { passSpeed,reflectVelocity } from './physics.js';
import { teamStats } from './stats.js';
import { keeperContact } from './goalkeeper.js';
import { chooseShotTarget } from './tactics.js';
import { performSkill } from './skills.js';
import { planShot,shotTechnique,contactFoot } from './shooting.js';
import { startStrike,advanceStrike } from './striking.js';
import { INTRO,PRESENTATION,restartPresentation } from '../presentation.js';

export class Match {
  constructor(teams,settings,{event=()=>{},random=Math.random}={}){
    this.teams=teams;this.settings={...settings};this.event=event;this.random=random;
    this.formations=teams.map(team=>team.formation?.length===7?team.formation:FORMATION);
    this.players=teams.flatMap((team,index)=>team.lineup.map((data,slot)=>new Player(data,index,slot,index===0?1:-1,this.formations[index])));
    this.benches=teams.map(t=>t.bench.map(p=>({...p})));this.used=[[],[]];this.archive=[];this.pending=[];
    this.stats=[teamStats(),teamStats()];this.goalEvents=[];this.subEvents=[];
    this.ball=new Ball();this.controlled=this.players[5];this.phase='intro';this.phaseTime=0;this.elapsed=0;this.half=1;
    this.paused=false;this.charge=0;this.aimZ=0;this.switchCooldown=0;this.receiverAssist=false;this.restart=null;this.message='';
    this.referee=new Player({id:'referee',name:'Referee',jersey:null},-1,3,1);this.referee.x=-u(8);this.referee.z=u(6);
    this.resetFormation();this.passHeldTime=0;this.holdSwitchTime=0;this.curveRequested=false;
    for(const p of this.players){p.x-=this.direction(p.team)*5;p.z+=2;}
  }
  direction(team){return (team===0?1:-1)*(this.half===1?1:-1);}
  aiConfig(team){return DIFFICULTY[team===1?this.settings.difficulty:'normal']||DIFFICULTY.normal;}
  active(team){return this.players.filter(p=>p.team===team&&!p.sentOff);}
  notify(title,subtitle='',seconds=2.5){this.message=title;this.event('notice',{title,subtitle,seconds});}
  setPhase(phase){
    if(this.pendingStrike&&phase!=='playing'){this.pendingStrike.p.striking=false;this.pendingStrike=null;}
    if(phase!=='playing'){this.manualKeeper=false;this.keeperReturn=false;this.defensiveRoles=null;this.kickoffAttack=null;}
    this.phase=phase;this.phaseTime=0;this.charge=0;this.curveRequested=false;
    this.event('phase',phase);
  }
  resetFormation(){this.players.forEach(p=>p.reset(this.direction(p.team)));this.ball.reset();}
  skipIntro(){if(this.phase==='intro'){this.resetFormation();this.beginRestart({type:'KICK OFF',team:0,x:0,z:0});}}
  pause(value=true){if(['intro','playing','restart','goal'].includes(this.phase)){this.paused=value;this.charge=0;this.curveRequested=false;this.event('pause',value);}}
  continueHalf(){
    if(this.phase!=='halftime')return;
    this.applySubstitutions();this.half=2;
    this.resetFormation();this.beginRestart({type:'KICK OFF',team:1,x:0,z:0});this.notify('SECOND HALF','Ends changed · CPU kickoff');
  }
  possessionTeam(){return this.ball.owner?.team??this.ball.pass?.team??this.ball.lastTouch?.team;}
  bestOutfield(){
    const point=ballIntercept(this.ball,.18),dir=this.direction(0);
    const score=p=>{const gap=distance(p,this.ball);return gap<3?gap:gap*.7+distance(p,point)*.3+(p.x*dir>this.ball.x*dir?.45:0)+(p.striking?3:0);};
    return this.active(0).filter(p=>p.role!=='GK').sort((a,b)=>score(a)-score(b))[0];
  }
  toggleGoalkeeper(){
    if(this.phase!=='playing')return;
    const keeper=this.active(0).find(p=>p.role==='GK');if(!keeper)return;
    this.receiverAssist=false;this.charge=0;this.curveRequested=false;
    if(this.controlled===keeper){this.controlled=this.bestOutfield()||keeper;this.manualKeeper=false;this.keeperReturn=true;this.switchCooldown=2.3;}
    else{this.controlled=keeper;this.manualKeeper=true;this.keeperReturn=false;}
  }
  selectPlayer(manual=false){
    if(manual){this.manualKeeper=false;this.keeperReturn=false;}
    if(!manual&&this.manualKeeper&&!this.controlled?.sentOff)return;
    if(!manual&&this.keeperReturn&&this.ball.owner?.team===0&&this.ball.owner.role==='GK')return;
    this.keeperReturn=false;
    if(manual)this.receiverAssist=false;
    if(this.restart&&this.phase==='restart'){if(this.restart.team===0)this.controlled=this.restart.taker;return;}
    if(this.ball.owner?.team===0&&!this.ball.owner.sentOff){this.controlled=this.ball.owner;return;}
    if(!manual&&this.receiverAssist&&this.ball.pass?.team===0&&!this.ball.pass.target?.sentOff&&this.ball.pass.target){this.controlled=this.ball.pass.target;return;}
    const candidates=this.active(0).filter(p=>p.role!=='GK').sort((a,b)=>distance(a,this.ball)-distance(b,this.ball));
    if(!candidates.length)return;
    if(manual){this.controlled=this.bestOutfield()||candidates[0];this.switchCooldown=2.3;}
    else if(this.controlled?.role==='GK'||this.switchCooldown<=0&&(!this.controlled||this.controlled.sentOff||distance(this.controlled,this.ball)>distance(candidates[0],this.ball)+5)){this.controlled=candidates[0];this.switchCooldown=.8;}
  }
  update(dt,input){
    if(this.paused)return;
    this.phaseTime+=dt;this.switchCooldown=Math.max(0,this.switchCooldown-dt);
    this.players.forEach(p=>p.tick(dt));this.referee.tick(dt);
    advanceStrike(this,dt);
    if(this.moment){this.moment.time-=dt;if(this.moment.time<=0)this.moment=null;}
    if(['halftime','fulltime'].includes(this.phase)){this.players.forEach(p=>p.move(0,0,0,dt));return;}
    if(this.phase==='home'){
      for(const p of this.players){p.move(Math.cos(this.phaseTime*.4+p.slot)*.5,Math.sin(this.phaseTime*.4+p.slot)*.5,.25,dt);}
      return;
    }
    if(this.phase==='intro'){
      if(this.phaseTime>=INTRO.walk)for(const p of this.players){const h=this.formations[p.team]?.[p.slot]||FORMATION[p.slot],x=h.x*this.direction(p.team);p.move(x-p.x,h.z-p.z,Math.min(.42,Math.hypot(x-p.x,h.z-p.z)*.6),dt);p.watch({x:0,z:0});}
      if(this.phaseTime>=INTRO.duration)this.skipIntro();return;
    }
    if(this.phase==='goal'){
      this.ball.integrate(dt);
      this.players.forEach(p=>{
        const lead=this.celebratingPlayer;
        if(p===lead&&p.action?.name==='celebrate-slide'){
          p.x=clamp(p.x+p.vx*dt,-FIELD.halfLength+.5,FIELD.halfLength-.5);p.z=clamp(p.z+p.vz*dt,-FIELD.halfWidth+.5,FIELD.halfWidth-.5);p.vx*=Math.exp(-1.4*dt);p.vz*=Math.exp(-1.4*dt);
        }else if(p===lead&&p.action?.name==='celebrate-arms'&&this.phaseTime<2.4)p.move(-this.direction(p.team)*.3,Math.sign(p.z)||1,.35,dt);
        else if(p.team===this.scoringTeam&&p!==lead&&p.role!=='GK'&&lead&&distance(p,lead)>2.3)p.move(lead.x-p.x,lead.z-p.z,.5,dt);
        else p.move(0,0,0,dt);
        if(p.team===this.scoringTeam&&p!==lead&&lead&&distance(p,lead)<3&&!p.action)p.animate('applaud',1);
      });
      if(this.phaseTime>PRESENTATION.goal){this.resetFormation();this.beginRestart({type:'KICK OFF',team:1-this.scoringTeam,x:0,z:0});}
      return;
    }
    if(this.phase==='restart'){this.updateRestart(dt,input);return;}
    if(this.phase!=='playing')return;
    this.elapsed+=dt;
    for(const p of this.players){p.previousX=p.x;p.previousZ=p.z;}
    const touchPass=input?.isTouchHeld?.('pass');
    this.passHeldTime=input?.held.has('pass')&&!touchPass?this.passHeldTime+dt:0;
    const owner=this.ball.owner;if(owner)this.stats[owner.team].possession+=dt;
    this.selectPlayer();const move=input?.movement()||{x:0,z:0,intensity:0};
    if(input?.pressed.has('switch'))this.selectPlayer(true);
    if(input?.pressed.has('goalie'))this.toggleGoalkeeper();
    if(input?.pressed.has('pass')){if(owner?.team===0){this.manualKeeper=false;this.keeperReturn=false;this.controlled=owner;}else this.selectPlayer(true);}
    if(touchPass&&!this.manualKeeper&&this.possessionTeam()!==0&&this.settings.holdAutoSwitch!==false){
      this.holdSwitchTime+=dt;
      if(this.holdSwitchTime>=.22){this.selectPlayer(true);this.holdSwitchTime=0;}
    }else this.holdSwitchTime=0;
    if(this.controlled&&!this.controlled.sentOff){
      if(input?.held.has('pass')&&!touchPass&&owner&&owner.team!==0&&move.intensity<.1){
        const n=normalize(owner.x-this.controlled.x,owner.z-this.controlled.z);this.controlled.move(n.x,n.z,1,dt,input.held.has('sprint'));
      }else if(!owner&&this.ball.pass?.target===this.controlled&&move.intensity<.1){
        const point=(this.ball.y>2||distance(this.ball,this.controlled)>u(7))&&Math.hypot(this.ball.vx,this.ball.vz)>8?this.ball.pass:ballIntercept(this.ball,.35),gap=distance(point,this.controlled);
        this.controlled.move(point.x-this.controlled.x,point.z-this.controlled.z,Math.min(1,gap/2),dt,gap>u(5));
      }else this.controlled.move(move.x,move.z,move.intensity,dt,input?.held.has('sprint'),owner?.team===1&&move.intensity<.7&&distance(this.controlled,this.ball)<10?this.ball:null);
      if(owner===this.controlled&&this.ball.controlMode==='hands'){
        const keeper=this.controlled,dir=this.direction(keeper.team),depth=clamp(keeper.x*dir+FIELD.halfLength,.65,FIELD.boxDepth-.65);
        keeper.x=(depth-FIELD.halfLength)*dir;keeper.z=clamp(keeper.z,-FIELD.boxHalf+.65,FIELD.boxHalf-.65);
        if(!keeper.action)keeper.animate('keeper-hold',.7);
      }
      if(input?.pressed.has('pass')){
        if(owner===this.controlled)this.requestPass(this.controlled,move.intensity>.15?move:null);
      }
      if(input?.pressed.has('skill'))this.skill(this.controlled,move);
      this.chargeShot(dt,input,owner===this.controlled&&!this.cancelShotUntilRelease);
      if(this.charge>0)this.aimZ=clamp(move.z*FIELD.goalHalf*1.15+this.controlled.z*.1,-FIELD.goalHalf*1.08,FIELD.goalHalf*1.08);
      if(input?.pressed.has('shoot')&&owner!==this.controlled){
        if(!owner&&this.ball.y<3.1&&distance(this.ball,this.controlled)<2.2){
          const {y,vy}=this.ball,high=y>2;this.claim(this.controlled);this.ball.y=y;this.ball.vy=vy;this.shoot(this.controlled,.55,null,{firstTime:true,header:high});
        }
      }
      if(input?.released.has('shoot')){if(owner===this.controlled&&!this.cancelShotUntilRelease)this.requestShot(this.controlled,Math.max(.15,this.charge),move.intensity>.1?move:null,{curve:this.curveRequested});this.charge=0;this.curveRequested=false;this.cancelShotUntilRelease=false;}
      if(owner!==this.controlled){this.charge=0;this.curveRequested=false;}
    }
    updateAI(this,dt);if(this.phase!=='playing')return;
    this.autoSteal(this.controlled);if(this.phase!=='playing')return;this.separatePlayers();
    const refX=clamp(this.ball.x-this.direction(this.ball.owner?.team??0)*u(5),-FIELD.halfLength+u(4),FIELD.halfLength-u(4));
    const refZ=clamp(this.ball.z+u(5),-FIELD.halfWidth+u(3),FIELD.halfWidth-u(3));
    this.referee.watch(this.ball);this.referee.move(refX-this.referee.x,refZ-this.referee.z,.9,dt,distance(this.referee,this.ball)>u(18));
    const previous={x:this.ball.x,y:this.ball.y,z:this.ball.z};this.ball.update(dt);
    const frame=goalFrameContact(this.ball,previous),boundary=boundaryEvent(this.ball,previous,[this.direction(0),this.direction(1)]);
    const limit=Math.min(frame?.t??1,boundary?.time??1);
    const contact=(!this.ball.owner||!boundary)&&this.collisions(dt,previous,limit);
    if(!contact&&frame&&frame.t<=(boundary?.time??1))resolveFrameContact(this.ball,frame);
    else if(!contact&&boundary){if(boundary.type==='GOAL')this.goal(boundary.team);else{if(this.ball.shot){this.ball.shot.player.animate('miss',1.6);this.moment={type:'miss',player:this.ball.shot.player,time:1.5};}this.beginRestart(boundary);}return;}
    if(this.half===1&&this.elapsed>=this.settings.duration*30){
      this.elapsed=this.settings.duration*30;this.ball.release();this.applySubstitutions();this.autoSubstitute();this.setPhase('halftime');
    }else if(this.half===2&&this.elapsed>=this.settings.duration*60){
      this.elapsed=this.settings.duration*60;this.setPhase('fulltime');
      this.players.forEach(p=>p.animate(this.stats[p.team].goals>this.stats[1-p.team].goals?'celebrate-arms':this.stats[p.team].goals<this.stats[1-p.team].goals?'concede':'applaud',4));
    }
  }
  separatePlayers(){
    const active=this.players.filter(p=>!p.sentOff);
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
      const a=active[i],b=active[j],gap=distance(a,b);
      if(gap<.82){
        const n=gap>.001?normalize(b.x-a.x,b.z-a.z):{x:(i+j)%2?1:0,z:(i+j)%2?0:1},push=(.82-gap)*.5;
        a.x=clamp(a.x-n.x*push,-FIELD.halfLength-FIELD.playerMargin,FIELD.halfLength+FIELD.playerMargin);
        a.z=clamp(a.z-n.z*push,-FIELD.halfWidth-FIELD.playerMargin,FIELD.halfWidth+FIELD.playerMargin);
        b.x=clamp(b.x+n.x*push,-FIELD.halfLength-FIELD.playerMargin,FIELD.halfLength+FIELD.playerMargin);
        b.z=clamp(b.z+n.z*push,-FIELD.halfWidth-FIELD.playerMargin,FIELD.halfWidth+FIELD.playerMargin);
        const closing=(a.vx-b.vx)*n.x+(a.vz-b.vz)*n.z;
        if(closing>0){const impulse=closing*.5;a.vx-=n.x*impulse;a.vz-=n.z*impulse;b.vx+=n.x*impulse;b.vz+=n.z*impulse;}
      }
    }
  }
  claim(p,options={}){
    p.receivedFrom=this.ball.pass?.team===p.team?this.ball.pass.from:null;
    if(this.ball.pass?.team===p.team&&this.ball.pass.from!==p)this.stats[p.team].completed++;
    const pressure=this.active(1-p.team).filter(o=>distance(o,p)<4).length;
    this.ball.take(p,{pressure,random:this.random,...options});
    this.ball.lock=Math.max(this.ball.lock,.09);
    if(p.team===0&&!this.manualKeeper)this.controlled=p;
  }
  onTarget(){if(this.ball.shot&&!this.ball.shot.counted){this.stats[this.ball.shot.team].onTarget++;this.ball.shot.counted=true;}}
  collisions(dt,previous=null,maxTime=1){
    const b=this.ball;if(b.lock>0)return false;
    if(b.owner){
      const p=b.owner;if(b.controlMode==='hands')return false;
      for(const o of this.active(1-p.team)){
        if(o.role==='GK'&&keeperContact(this,o))return true;
        if(distance(o,b)<(p.skill>0?.43:.7)&&o.cooldown<=0&&p.cooldown<=0){this.claim(o);o.animate('intercept',.45);p.animate('stumble',.4);o.tackles++;o.cooldown=.5;return true;}
      }
      return false;
    }
    const end={x:b.x,y:b.y,z:b.z},start=previous||end,speed=Math.hypot(b.vx,b.vz),candidates=[];
    for(const p of this.players){
      if(p.sentOff||p.cooldown>0)continue;
      const keeper=p.role==='GK'&&p.team!==b.lastTouch?.team&&p.x*this.direction(p.team)<=-FIELD.halfLength+FIELD.boxDepth&&Math.abs(p.z)<=FIELD.boxHalf;
      const add=(kind,radius,height,min=0)=>{const hit=playerContact(p,start,end,radius,height,min,!!previous);if(hit&&hit.t<=maxTime+1e-8)candidates.push({p,kind,hit});};
      if(keeper)add('keeper',p.action?.name==='keeper-dive'?2.45:1.25,3.5);
      else{
        add('feet',1,1.12);
        if(p.role!=='GK'&&((p===this.controlled&&this.passHeldTime>.18)||(p.team===1&&p.x*this.direction(p.team)>FIELD.halfLength-FIELD.boxDepth*1.2)))add('header',1.2,2.85,1.15);
        if(b.lastTouch?.team!==p.team&&(b.shot||speed>26))add('block',.72,2.45,1.12);
      }
    }
    candidates.sort((a,b)=>a.hit.t-b.hit.t);
    for(const {p,kind,hit} of candidates){
      if(p.cooldown>0)continue;
      b.x=hit.x;b.y=hit.y;b.z=hit.z;
      if(kind==='keeper'){
        if(keeperContact(this,p))return true;
        Object.assign(b,end);continue;
      }
      if(kind==='block'||kind==='feet'&&speed>26&&b.lastTouch?.team!==p.team){
        reflectVelocity(b,hit.normal,.33,.72);b.touch(p);b.spin*=.5;b.lock=.10;p.cooldown=.3;p.tackles++;p.animate('block',.5);return true;
      }
      if(kind==='header'){
        if(p===this.controlled)this.pass(p,null,{firstTime:true,header:true});else this.header(p);
        return true;
      }
      const firstTime=p===this.controlled&&this.passHeldTime>.18&&b.pass?.team===p.team;
      this.claim(p);if(firstTime)this.pass(p,null,{firstTime:true});return true;
    }
    Object.assign(b,end);return false;
  }
  requestPass(p,aim=null,options={}){if(!p.striking)this.pass(p,aim,{...options,windup:true});}
  requestShot(p,power=.5,aim=null,options={}){if(!p.striking)this.shoot(p,power,aim,{...options,windup:true});}
  pass(p,aim=null,{firstTime=false,header=false,windup=false}={}){
    let target=bestPass(this,p,aim);if(header)target=this.active(p.team).filter(o=>o!==p&&o.role!=='GK').sort((a,b)=>distance(p,a)-distance(p,b))[0];if(!target)return;
    const direction=this.direction(p.team),d=distance(p,target);
    const cross=(this.restart?.type==='CORNER'||Math.abs(p.z)>FIELD.halfWidth*.64)&&p.x*direction>u(10)&&Math.abs(target.z)<FIELD.boxHalf;
    const through=target.x*direction>p.x*direction+u(3),lead=through?u(3.2)*p.attributes.passLead:0;
    const anticipation=clamp(d/50,.35,.9);
    const tx=clamp(target.x+target.vx*anticipation+direction*lead,-FIELD.halfLength+1.5,FIELD.halfLength-1.5);
    const tz=clamp(target.z+target.vz*anticipation,-FIELD.halfWidth+1.5,FIELD.halfWidth-1.5);
    const travel=Math.hypot(tx-p.x,tz-p.z),flight=clamp(travel/30,1,2);
    // Compensate drag over the requested distance; crosses land near their receiver.
    const hands=this.ball.controlMode==='hands'&&this.ball.owner===p;
    const speed=cross?clamp(travel*PLAY.airDrag/(1-Math.exp(-PLAY.airDrag*flight)),PLAY.passMin,PLAY.passMax)
      :passSpeed(travel,clamp(5+travel*.07,5,10));
    const aimDirection=normalize(tx-p.x,tz-p.z),backheel=p.faceX*aimDirection.x+p.faceZ*aimDirection.z<-.65&&d<13;
    const distribution=hands?(d<24?'keeper-roll':d<45?'keeper-throw':'keeper-punt'):p.role==='GK'?'goal-kick':null;
    const kind=distribution|| (header?'header-pass':firstTime?'first-pass':backheel?'backheel':cross?'cross':through?'through-pass':d>35?'long-pass':d>18?'firm-pass':'short-pass');
    const leg=contactFoot(p,this.ball)==='right'?1:-1;
    startStrike(this,p,kind,distribution?.85:cross?.75:.64,{side:leg,aim:aimDirection},()=>{
    this.ball.kick(p,tx-p.x,tz-p.z,header?Math.min(speed,28):speed,
      header?1:cross?PLAY.gravity*flight*.5:distribution==='keeper-throw'?4:distribution==='keeper-punt'?7:.45,
      {height:header?1.9:distribution==='keeper-throw'?1.65:distribution==='keeper-punt'?1.1:FIELD.ballRadius+.04,spin:cross?Math.sign(p.z)*.7:0});
    this.ball.pass={from:p,team:p.team,target,x:tx,z:tz};this.ball.shot=null;
    this.stats[p.team].passes++;p.involvement+=.4;
    if(p.team===0&&!this.manualKeeper){this.controlled=target;this.switchCooldown=1.4;this.receiverAssist=true;}
    if(this.phase==='restart')this.finishRestart();
    },windup);
  }
  chargeShot(dt,input,allowed=true){
    if(!allowed||input?.cancelled?.has('shoot')||(!input?.held.has('shoot')&&!input?.released.has('shoot'))){this.charge=0;this.curveRequested=false;return;}
    if(input.held.has('shoot'))this.charge=clamp(this.charge+dt/1.2,0,1);
    if(input.held.has('curve')||input.pressed.has('curve')||input.released.has('curve'))this.curveRequested=true;
  }
  previewShot(){return shotTechnique(this.controlled,this.ball,{x:this.direction(0)*FIELD.halfLength,z:this.aimZ},{power:this.charge,curve:this.curveRequested});}
  shoot(p,power=.5,aim=null,{firstTime=false,header=false,curve=false,windup=false}={}){
    if(p.role==='GK'&&this.ball.owner===p){this.distributeKeeper(p,power,aim,windup);return;}
    const direction=this.direction(p.team),goalX=direction*FIELD.halfLength,config=this.aiConfig(p.team);
    let targetZ=this.phase==='restart'?this.aimZ:clamp((aim?.z||0)*FIELD.goalHalf*1.15+p.z*.1,-FIELD.goalHalf*1.08,FIELD.goalHalf*1.08);
    if(p.team===1)targetZ=chooseShotTarget(this,p);
    const shot=planShot(p,this.ball,{x:goalX,z:targetZ},{power,curve,firstTime,header,random:this.random,accuracySpread:p.team===0?u(1.5):(1-config.accuracy)*u(12)});
    startStrike(this,p,shot.kind,power>.8?.85:.72,{side:shot.side,aim:shot.direction,power,skied:shot.skied},()=>{
    this.ball.kick(p,shot.direction.x,shot.direction.z,shot.speed,shot.lift,{height:shot.height,spin:shot.spin});
    this.ball.shot={player:p,team:p.team,counted:false,kind:shot.kind,foot:shot.foot,skied:shot.skied,power,assist:this.ball.previousTouch?.team===p.team?this.ball.previousTouch:null};this.ball.pass=null;this.stats[p.team].shots++;
    p.touchFoot=shot.foot;p.involvement++;if(this.phase==='restart')this.finishRestart();
    },windup);
  }
  distributeKeeper(p,power=.6,aim=null,windup=false){
    const dir=this.direction(p.team),target=bestPass(this,p,aim||{x:dir,z:0}),hands=this.ball.controlMode==='hands';
    const x=clamp(p.x+dir*(38+power*35),-FIELD.halfLength+3,FIELD.halfLength-3),z=clamp(aim?.intensity>.1?p.z+aim.z*24:target?.z||0,-FIELD.halfWidth+3,FIELD.halfWidth-3);
    const flight=1.5+power*.7,travel=Math.hypot(x-p.x,z-p.z),speed=clamp(travel*PLAY.airDrag/(1-Math.exp(-PLAY.airDrag*flight)),26,48);
    startStrike(this,p,hands?'keeper-punt':'goal-kick',.85,{side:p.touchFoot==='left'?-1:1,aim:normalize(x-p.x,z-p.z)},()=>{
    this.ball.kick(p,x-p.x,z-p.z,speed,PLAY.gravity*flight*.5,{height:hands?1.1:FIELD.ballRadius+.04});
    this.ball.pass={from:p,team:p.team,target,x,z};this.ball.shot=null;this.stats[p.team].passes++;
    if(p.team===0&&target&&(!this.manualKeeper||this.controlled===p)){this.manualKeeper=false;this.controlled=target;this.receiverAssist=true;this.switchCooldown=1;}
    if(this.phase==='restart')this.finishRestart();
    },windup);
  }
  header(p){this.shoot(p,.55,null,{firstTime:true,header:true});}
  skill(p,aim=null){if(!p.striking)performSkill(this,p,aim);}
  autoSteal(p){
    if(this.ball.lock>0)return false;
    const b=this.ball,victim=b.owner;
    if(!p||p.sentOff||p.role==='GK'||p.striking||p.cooldown>0||this.paused||this.phase!=='playing'||b.controlMode==='hands')return false;
    if(victim?.team===p.team||b.y>1.2||distance(p,b)>1.55)return false;
    if(p.action&&['fall','roll-fall','get-up','slide-tackle','stumble','recover'].includes(p.action.name))return false;
    if(victim){
      const approach=normalize(p.x-victim.x,p.z-victim.z);
      // Reach for an exposed ball; do not force a dangerous challenge from behind.
      if(distance(p,victim)>2.15||approach.x*victim.faceX+approach.z*victim.faceZ<-.35)return false;
    }else if(Math.hypot(b.vx,b.vz)>22)return false;
    this.tackle(p,{standing:true});p.cooldown=Math.max(p.cooldown,.85);return true;
  }
  tackle(p,{standing=false}={}){
    if(this.ball.lock>0)return;
    if(p.cooldown>0||p.sentOff)return;
    const sliding=!standing&&Math.hypot(p.vx,p.vz)>PLAY.runSpeed*.85;
    p.cooldown=sliding?1.1:.65;p.animate(sliding?'slide-tackle':'standing-tackle',sliding?.55:.45,{side:1});
    const victim=this.ball.owner;
    if(victim&&this.ball.controlMode==='hands')return;
    if(!victim){if(standing&&this.ball.y<1.3&&distance(p,this.ball)<1.65){this.claim(p);p.animate('standing-tackle',.45);p.tackles++;}return;}
    if(victim.team===p.team||distance(p,victim)>(sliding?3.2:2.25))return;
    const toward=normalize(p.x-victim.x,p.z-victim.z),behind=toward.x*victim.faceX+toward.z*victim.faceZ<-.45;
    const late=distance(p,this.ball)>1.95,protectedBall=victim.skill>0;
    const foulChance=behind?.55:late?.35:protectedBall?.28:.06/p.attributes.defending;
    if(this.random()<foulChance){
      const severity=behind&&Math.hypot(p.vx,p.vz)>PLAY.runSpeed*1.15?'red':behind||late?'yellow':'none';
      this.foul(p,victim,severity);return;
    }
    if(protectedBall&&this.random()<.65)return;
    if(sliding){this.ball.release(p.faceX*7,p.faceZ*7,.4);this.ball.touch(p);victim.animate('stumble',.55,{side:1});}
    else{this.claim(p);p.animate(distance(p,victim)<1.1?'shoulder':'standing-tackle',.5);victim.animate('stumble',.4,{side:-1});}
    p.tackles++;p.cooldown=.5;victim.cooldown=.7;
  }
  foul(offender,victim,severity='none'){
    const foulNames=playerLabel(offender)+' · Foul on '+playerLabel(victim);
    this.stats[offender.team].fouls++;
    let title='FOUL';
    if(severity==='yellow'){offender.yellow++;this.stats[offender.team].yellows++;title='YELLOW CARD';}
    if(severity==='red'||offender.yellow>=2){offender.sentOff=true;this.stats[offender.team].reds++;title='RED CARD';}
    if(this.ball.owner===offender)this.ball.release();
    const decisionTime=severity==='none'?PRESENTATION.foul:PRESENTATION.card;
    this.referee.animate('card',decisionTime);
    this.referee.cardColor=title==='RED CARD'?'#f43d38':title==='YELLOW CARD'?'#ffe24b':null;
    this.beginRestart(foulRestart(victim,this.direction(victim.team)));
    victim.animate(severity==='red'?'roll-fall':'fall',.8,{side:Math.sign(victim.z-offender.z)||1});
    this.restart.readyAt=Math.max(this.restart.readyAt,decisionTime);
    offender.animate('card-reaction',decisionTime);this.moment={type:'card',player:this.referee,time:decisionTime-.6};
    this.referee.watch(offender);
    this.notify(title,foulNames,decisionTime);
    this.event('card',{player:offender,card:title});
    if(offender.sentOff&&this.active(offender.team).length<3){
      this.stats[1-offender.team].goals=Math.max(this.stats[1-offender.team].goals,this.stats[offender.team].goals+3);
      this.notify('MATCH AWARDED','Too few players to continue');this.setPhase('fulltime');
    }
  }
  goal(team){
    const last=this.ball.lastTouch,shot=this.ball.shot;
    const scorer=shot?.team===team?shot.player:last,assist=shot?.team===team?shot.assist:this.ball.previousTouch;
    this.stats[team].goals++;this.onTarget();
    if(scorer?.team===team)scorer.goals++;
    const assistant=assist&&assist!==scorer&&assist.team===team&&scorer?.team===team?assist:null;
    if(assistant)assistant.assists++;
    this.goalEvents.push({team,name:scorer?.name||this.teams[team].name,jersey:scorer?.jersey??null,playerId:scorer?.id,assist:assistant?.name||null,assistJersey:assistant?.jersey??null,ownGoal:scorer?.team!==team,time:this.elapsed});
    this.scoringTeam=team;this.ball.settleInNet(this.direction(team));
    this.celebratingPlayer=scorer?.team===team?scorer:this.active(team).find(p=>p.role==='FWD');
    const celebrations=['celebrate-slide','celebrate-jump','celebrate-arms','celebrate-point','celebrate-fist','celebrate-calm'];
    const lateWinner=this.elapsed>this.settings.duration*48&&this.stats[team].goals===this.stats[1-team].goals+1;
    const celebration=lateWinner?'celebrate-jump':this.celebratingPlayer?.data.leadershipRole==='captain'?'celebrate-arms':celebrations[Math.floor(this.random()*celebrations.length)];
    this.celebratingPlayer?.animate(celebration,PRESENTATION.goal-.5);
    if(celebration==='celebrate-slide'&&this.celebratingPlayer){this.celebratingPlayer.vx=this.direction(team)*3.2;this.celebratingPlayer.vz=0;}
    this.players.filter(p=>p.team!==team).forEach(p=>p.animate(p.role==='GK'?'concede':'miss',2.4));
    this.setPhase('goal');this.notify('GOAL!',playerLabel(scorer)+' · '+this.teams[team].name,PRESENTATION.goal);this.event('goal',this.goalEvents.at(-1));
  }
  beginRestart(data){
    this.applySubstitutions();this.autoSubstitute();
    if(data.type==='CORNER')this.stats[data.team].corners++;
    this.ball.reset(data.x,data.z);
    const direction=this.direction(data.team);
    let eligible=this.active(data.team);
    if(data.type==='GOAL KICK')eligible=eligible.filter(p=>p.role==='GK');
    else eligible=eligible.filter(p=>p.role!=='GK');
    const taker=[...eligible].sort((a,b)=>distance(a,data)-distance(b,data))[0]||this.active(data.team)[0];
    if(!taker){this.setPhase('fulltime');return;}
    this.restart={...data,taker,readyAt:Math.max(restartPresentation(data.type),this.moment?.time||0)};this.aimZ=0;
    if(data.type==='KICK OFF')this.resetFormation();
    for(const p of this.players){
      if(p.sentOff||p===taker)continue;
      if(data.type==='PENALTY'){
        if(p.role==='GK'){p.x=-this.direction(p.team)*(FIELD.halfLength-.7);p.z=0;}
        else{p.x=direction*(FIELD.halfLength-FIELD.boxDepth-u(2+p.slot%3*2));p.z=(p.slot%2?1:-1)*u(6+p.slot);}
      }else if(data.type==='CORNER'){
        if(p.role==='GK'){p.reset(this.direction(p.team));}
        else if(p.team===data.team&&p.role==='DEF'){p.x=direction*u(7);p.z=(p.slot%2?1:-1)*u(10);}
        else{p.x=direction*(FIELD.halfLength-u(5+(p.slot%3)*3+(p.team===data.team?0:1)));p.z=(p.slot%2?1:-1)*u(2+p.slot);}
      }else if(data.type==='KICK OFF'){
        if(p.team!==data.team&&distance(p,data)<FIELD.restartClearance)p.x=-this.direction(p.team)*FIELD.restartClearance;
      }else if(p.team!==data.team&&distance(p,data)<FIELD.restartClearance){
        let n=normalize(p.x-data.x||-direction,p.z-data.z||1);
        p.x=clamp(data.x+n.x*FIELD.restartClearance,-FIELD.halfLength+.8,FIELD.halfLength-.8);
        p.z=clamp(data.z+n.z*FIELD.restartClearance,-FIELD.halfWidth+.8,FIELD.halfWidth-.8);
        if(distance(p,data)<FIELD.restartClearance-.1){
          n=normalize(-data.x||-direction,-data.z||1);p.x=data.x+n.x*FIELD.restartClearance;p.z=data.z+n.z*FIELD.restartClearance;
        }
      }
      p.vx=p.vz=0;
    }
    taker.x=data.x-direction*.9;taker.z=data.z;taker.faceX=direction;taker.faceZ=0;taker.vx=taker.vz=0;
    this.ball.x=data.x;this.ball.z=data.z;this.ball.y=FIELD.ballRadius;
    this.ball.owner=taker;taker.hasBall=true;this.ball.lastTouch=taker;taker.holdTime=0;
    if(data.team===0)this.controlled=taker;
    this.setPhase('restart');this.notify(data.type,this.teams[data.team].name,this.restart.readyAt);
  }
  updateRestart(dt,input){
    const r=this.restart;if(!r)return;
    if(this.pendingStrike){r.taker.move(0,0,0,dt);return;}
    if(this.phaseTime<r.readyAt){this.charge=0;this.curveRequested=false;return;}
    const move=input?.movement()||{x:0,z:0,intensity:0};
    if(r.team===0){
      this.aimZ=clamp(this.aimZ+(move.z||move.x)*dt*FIELD.goalHalf*.9,-FIELD.goalHalf*1.08,FIELD.goalHalf*1.08);
      this.chargeShot(dt,input);
      if(this.phaseTime>.7){
        if(input?.pressed.has('pass')){this.requestPass(r.taker,move.intensity>.1?move:null);return;}
        if(input?.released.has('shoot')){this.requestShot(r.taker,Math.max(.15,this.charge),null,{curve:this.curveRequested});this.charge=0;this.curveRequested=false;return;}
      }
    }
    const automatic=r.readyAt+(r.team===1?2.4:({'KICK OFF':4,'THROW-IN':6,'GOAL KICK':8,'CORNER':12,'FREE KICK':14,'PENALTY':16}[r.type]||10));
    if(this.phaseTime>automatic){
      if(r.type==='PENALTY'||(r.type==='FREE KICK'&&FIELD.halfLength-r.x*this.direction(r.team)<PLAY.shootingRange))this.requestShot(r.taker,.65);
      else this.requestPass(r.taker);
    }
  }
  finishRestart(){
    const r=this.restart;
    if(r?.type==='THROW-IN'){this.ball.y=2;this.ball.vy=3;r.taker.animate('keeper-throw',.6);}
    this.restart=null;this.setPhase('playing');
    if(r?.type==='KICK OFF'&&r.team===1)this.kickoffAttack={armed:this.random()<this.aiConfig(1).kickoffShot,used:false,until:this.elapsed+12};
  }
  queueSubstitution(outId,inId,team=0){
    const out=this.active(team).find(p=>p.id===outId),incoming=this.benches[team].find(p=>p.id===inId);
    if(!out||!incoming)throw Error('Select one active player and one available substitute.');
    if(this.pending.some(s=>s.out===out||s.incoming.id===inId))throw Error('That player is already part of a pending substitution.');
    this.pending.push({out,incoming,team});
    if(this.phase==='halftime'||this.phase==='restart')this.applySubstitutions();
    else this.notify('SUBSTITUTION QUEUED','At the next stoppage');
  }
  applySubstitutions(){
    for(const sub of this.pending){
      const {out,incoming,team}=sub;if(out.sentOff)continue;
      if(this.pendingStrike?.p===out){out.striking=false;this.pendingStrike=null;this.charge=0;this.curveRequested=false;}
      this.archive.push({...out});this.used[team].push(out.data);
      const saved={x:out.x,z:out.z,slot:out.slot,team:out.team,role:out.role};
      const next=new Player(incoming,team,out.slot,this.direction(team),this.formations[team]);Object.assign(out,next,saved);out.hasBall=this.ball.owner===out;
      this.benches[team]=this.benches[team].filter(p=>p.id!==incoming.id);
      this.stats[team].substitutions++;const event={team,out:this.archive.at(-1).name,outJersey:this.archive.at(-1).jersey??null,in:incoming.name,inJersey:incoming.jersey??null,time:this.elapsed};this.subEvents.push(event);
      this.event('substitution',{player:out,...event});
      out.animate('wave',3.5);this.moment={type:'substitution',player:out,time:PRESENTATION.substitution};
      if(this.phase==='restart'&&this.restart)this.restart.readyAt=Math.max(this.restart.readyAt,this.phaseTime+PRESENTATION.substitution);
    }this.pending=[];
  }
  autoSubstitute(){
    if(this.stats[1].substitutions>=3||!this.benches[1].length)return;
    // Rotate at spaced second-half stoppages, prioritizing cautioned players.
    const threshold=this.settings.duration*60*(.5+this.stats[1].substitutions*.16);
    if(this.elapsed<threshold)return;
    const out=this.active(1).filter(p=>p.role!=='GK'&&!this.used[1].some(q=>q.id===p.id))
      .sort((a,b)=>b.yellow-a.yellow||a.involvement-b.involvement)[0];
    if(!out)return;
    const options=this.benches[1].filter(p=>!/goal|keeper/i.test(p.position));
    const role=p=>/def/i.test(p.position)?'DEF':/mid/i.test(p.position)?'MID':'FWD';
    const incoming=options.find(p=>role(p)===out.role)||options[0];if(!incoming)return;
    this.pending.push({out,incoming,team:1});this.applySubstitutions();
  }
}
