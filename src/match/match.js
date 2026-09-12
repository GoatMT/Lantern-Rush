import { FIELD,PLAY,FORMATION,fieldUnits as u,DIFFICULTY,clamp,distance,normalize } from '../config.js';
import { Player } from './player.js';
import { playerLabel } from '../player-label.js';
import { Ball } from './ball.js';
import { updateAI,bestPass,ballIntercept } from './ai.js';
import { boundaryEvent,goalFrameCollision,foulRestart } from './rules.js';
import { teamStats } from './stats.js';
import { keeperContact } from './goalkeeper.js';
import { performSkill } from './skills.js';

export class Match {
  constructor(teams,settings,{event=()=>{},random=Math.random}={}){
    this.teams=teams;this.settings={...settings};this.event=event;this.random=random;
    this.players=teams.flatMap((team,index)=>team.lineup.map((data,slot)=>new Player(data,index,slot,index===0?1:-1)));
    this.benches=teams.map(t=>t.bench.map(p=>({...p})));this.used=[[],[]];this.archive=[];this.pending=[];
    this.stats=[teamStats(),teamStats()];this.goalEvents=[];this.subEvents=[];
    this.ball=new Ball();this.controlled=this.players[5];this.phase='intro';this.phaseTime=0;this.elapsed=0;this.half=1;
    this.paused=false;this.charge=0;this.aimZ=0;this.switchCooldown=0;this.receiverAssist=false;this.restart=null;this.message='';
    this.referee=new Player({id:'referee',name:'Referee',jersey:null},-1,3,1);this.referee.x=-u(8);this.referee.z=u(6);
    this.resetFormation();this.passHeldTime=0;
    for(const p of this.players){p.x-=this.direction(p.team)*5;p.z+=2;}
  }
  direction(team){return (team===0?1:-1)*(this.half===1?1:-1);}
  aiConfig(team){return DIFFICULTY[team===1?this.settings.difficulty:'normal'];}
  active(team){return this.players.filter(p=>p.team===team&&!p.sentOff);}
  notify(title,subtitle='',seconds=2.5){this.message=title;this.event('notice',{title,subtitle,seconds});}
  setPhase(phase){
    this.phase=phase;this.phaseTime=0;this.charge=0;
    if(['restart','goal','halftime'].includes(phase))this.players.forEach(p=>p.allowRecovery());
    this.event('phase',phase);
  }
  resetFormation(){this.players.forEach(p=>p.reset(this.direction(p.team)));this.ball.reset();}
  skipIntro(){if(this.phase==='intro'){this.resetFormation();this.beginRestart({type:'KICK OFF',team:0,x:0,z:0});}}
  pause(value=true){if(['intro','playing','restart','goal'].includes(this.phase)){this.paused=value;this.charge=0;this.event('pause',value);}}
  continueHalf(){
    if(this.phase!=='halftime')return;
    this.applySubstitutions();this.half=2;
    this.resetFormation();this.beginRestart({type:'KICK OFF',team:1,x:0,z:0});this.notify('SECOND HALF','Ends changed · CPU kickoff');
  }
  selectPlayer(manual=false){
    if(manual)this.receiverAssist=false;
    if(this.restart&&this.phase==='restart'){if(this.restart.team===0)this.controlled=this.restart.taker;return;}
    if(this.ball.owner?.team===0&&this.ball.owner.role!=='GK'&&!this.ball.owner.sentOff){this.controlled=this.ball.owner;return;}
    if(!manual&&this.receiverAssist&&this.ball.pass?.team===0&&!this.ball.pass.target?.sentOff&&this.ball.pass.target){this.controlled=this.ball.pass.target;return;}
    const candidates=this.active(0).filter(p=>p.role!=='GK').sort((a,b)=>distance(a,this.ball)-distance(b,this.ball));
    if(!candidates.length)return;
    if(manual){this.controlled=candidates[0];this.switchCooldown=2.3;}
    else if(this.switchCooldown<=0&&(!this.controlled||this.controlled.sentOff||distance(this.controlled,this.ball)>distance(candidates[0],this.ball)+5)){this.controlled=candidates[0];this.switchCooldown=.8;}
  }
  update(dt,input){
    if(this.paused)return;
    this.phaseTime+=dt;this.switchCooldown=Math.max(0,this.switchCooldown-dt);
    this.players.forEach(p=>p.tick(dt));this.referee.tick(dt);
    if(this.moment){this.moment.time-=dt;if(this.moment.time<=0)this.moment=null;}
    if(['halftime','fulltime'].includes(this.phase)){this.players.forEach(p=>p.move(0,0,0,dt));return;}
    if(this.phase==='home'){
      for(const p of this.players){p.move(Math.cos(this.phaseTime*.4+p.slot)*.5,Math.sin(this.phaseTime*.4+p.slot)*.5,.25,dt);}
      return;
    }
    if(this.phase==='intro'){
      if(this.phaseTime>=9.8)for(const p of this.players){const h=FORMATION[p.slot],x=h.x*this.direction(p.team);p.move(x-p.x,h.z-p.z,Math.min(.42,Math.hypot(x-p.x,h.z-p.z)*.6),dt);p.watch({x:0,z:0});}
      if(this.phaseTime>=14)this.skipIntro();return;
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
      if(this.phaseTime>4){this.resetFormation();this.beginRestart({type:'KICK OFF',team:1-this.scoringTeam,x:0,z:0});}
      return;
    }
    if(this.phase==='restart'){this.players.forEach(p=>p.updateStamina(dt));this.updateRestart(dt,input);return;}
    if(this.phase!=='playing')return;
    this.elapsed+=dt;
    this.passHeldTime=input?.held.has('pass')?this.passHeldTime+dt:0;
    const owner=this.ball.owner;if(owner)this.stats[owner.team].possession+=dt;
    this.selectPlayer();const move=input?.movement()||{x:0,z:0,intensity:0};
    if(input?.pressed.has('switch'))this.selectPlayer(true);
    if(input?.pressed.has('pass')&&owner!==this.controlled)this.selectPlayer(true);
    if(this.controlled&&!this.controlled.sentOff){
      if(input?.held.has('pass')&&owner&&owner.team!==0&&move.intensity<.1){
        const n=normalize(owner.x-this.controlled.x,owner.z-this.controlled.z);this.controlled.move(n.x,n.z,1,dt,input.held.has('sprint'));
      }else if(!owner&&this.ball.pass?.target===this.controlled&&move.intensity<.1){
        const point=(this.ball.y>2||distance(this.ball,this.controlled)>u(7))&&Math.hypot(this.ball.vx,this.ball.vz)>8?this.ball.pass:ballIntercept(this.ball,.35),gap=distance(point,this.controlled);
        this.controlled.move(point.x-this.controlled.x,point.z-this.controlled.z,Math.min(1,gap/2),dt,gap>u(5));
      }else this.controlled.move(move.x,move.z,move.intensity,dt,input?.held.has('sprint'),owner?.team===1&&move.intensity<.7&&distance(this.controlled,this.ball)<10?this.ball:null);
      if(input?.pressed.has('pass')){
        if(owner===this.controlled)this.pass(this.controlled,move.intensity>.15?move:null);
      }
      if(input?.pressed.has('skill'))this.skill(this.controlled,move);
      if(input?.held.has('shoot')&&owner===this.controlled&&!this.cancelShotUntilRelease)this.charge=clamp(this.charge+dt/1.2,0,1);
      if(this.charge>0)this.aimZ=clamp(move.z*FIELD.goalHalf*1.15+this.controlled.z*.1,-FIELD.goalHalf*1.08,FIELD.goalHalf*1.08);
      if(input?.pressed.has('shoot')&&owner!==this.controlled){
        if(!owner&&this.ball.y<3.1&&distance(this.ball,this.controlled)<2.2){
          const {y,vy}=this.ball,high=y>2;this.claim(this.controlled);this.ball.y=y;this.ball.vy=vy;this.shoot(this.controlled,.55,null,{firstTime:true,header:high});
        }
        else this.tackle(this.controlled);
      }
      if(input?.released.has('shoot')){if(owner===this.controlled&&!this.cancelShotUntilRelease)this.shoot(this.controlled,Math.max(.15,this.charge),move.intensity>.1?move:null);this.charge=0;this.cancelShotUntilRelease=false;}
      if(owner!==this.controlled)this.charge=0;
    }
    updateAI(this,dt);if(this.phase!=='playing')return;this.separatePlayers();
    const refX=clamp(this.ball.x-this.direction(this.ball.owner?.team??0)*u(5),-FIELD.halfLength+u(4),FIELD.halfLength-u(4));
    const refZ=clamp(this.ball.z+u(5),-FIELD.halfWidth+u(3),FIELD.halfWidth-u(3));
    this.referee.watch(this.ball);this.referee.move(refX-this.referee.x,refZ-this.referee.z,.9,dt,distance(this.referee,this.ball)>u(18));
    const previous={x:this.ball.x,y:this.ball.y,z:this.ball.z};this.ball.update(dt);
    goalFrameCollision(this.ball,previous);
    const boundary=boundaryEvent(this.ball,previous,[this.direction(0),this.direction(1)]);
    if(boundary){if(boundary.type==='GOAL')this.goal(boundary.team);else{if(this.ball.shot){this.ball.shot.player.animate('miss',1.6);this.moment={type:'miss',player:this.ball.shot.player,time:1.5};}this.beginRestart(boundary);}return;}
    this.collisions(dt);
    if(this.half===1&&this.elapsed>=this.settings.duration*30){
      this.elapsed=this.settings.duration*30;this.ball.owner=null;this.applySubstitutions();this.autoSubstitute();this.setPhase('halftime');
    }else if(this.half===2&&this.elapsed>=this.settings.duration*60){
      this.elapsed=this.settings.duration*60;this.setPhase('fulltime');
      this.players.forEach(p=>p.animate(this.stats[p.team].goals>this.stats[1-p.team].goals?'celebrate-arms':this.stats[p.team].goals<this.stats[1-p.team].goals?'concede':'applaud',4));
    }
  }
  separatePlayers(){
    const active=this.players.filter(p=>!p.sentOff);
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
      const a=active[i],b=active[j],gap=distance(a,b);
      if(gap<.82&&gap>.001){const n=normalize(b.x-a.x,b.z-a.z),push=(.82-gap)*.5;a.x-=n.x*push;a.z-=n.z*push;b.x+=n.x*push;b.z+=n.z*push;}
    }
  }
  claim(p,options={}){
    if(this.ball.pass?.team===p.team&&this.ball.pass.from!==p)this.stats[p.team].completed++;
    const pressure=this.active(1-p.team).filter(o=>distance(o,p)<4).length;
    this.ball.take(p,{pressure,random:this.random,...options});
    if(p.team===0&&p.role!=='GK')this.controlled=p;
  }
  onTarget(){if(this.ball.shot&&!this.ball.shot.counted){this.stats[this.ball.shot.team].onTarget++;this.ball.shot.counted=true;}}
  collisions(dt){
    const b=this.ball;if(b.lock>0)return;
    if(b.owner){
      // Possession can be lost through a close interception, but skilled dribbles protect briefly.
      const p=b.owner;
      if(b.controlMode==='hands')return;
      for(const o of this.active(1-p.team)){
        if(o.role==='GK'&&keeperContact(this,o))return;
        if(distance(o,b)<(p.skill>0?.43:.7)&&o.cooldown<=0&&p.cooldown<=0){this.claim(o);o.animate('intercept',.45);p.animate('stumble',.4);o.tackles++;o.cooldown=.5;return;}
      }
      return;
    }
    const candidates=this.players.filter(p=>!p.sentOff&&p.cooldown<=0).sort((a,c)=>distance(a,b)-distance(c,b));
    for(const p of candidates){
      const gap=distance(p,b),speed=Math.hypot(b.vx,b.vz),isKeeper=p.role==='GK'&&p.team!==b.lastTouch?.team;
      if(isKeeper&&keeperContact(this,p))return;
      if(gap<1&&b.y<1.12){
        if(speed>26&&b.lastTouch?.team!==p.team){b.touch(p);b.vx*=-.25;b.vz+=(p.z-b.z)*5;b.vy=1.3;b.lock=.12;p.cooldown=.3;p.tackles++;p.animate('block',.5);return;}
        const firstTime=p===this.controlled&&this.passHeldTime>.18&&b.pass?.team===p.team;
        this.claim(p);if(firstTime)this.pass(p,null,{firstTime:true});return;
      }
      if(gap<1.2&&b.y>1.15&&b.y<2.85&&p.role!=='GK'){
        if(p===this.controlled&&this.passHeldTime>.18){this.pass(p,null,{firstTime:true,header:true});return;}
        if(p.team===1&&p.x*this.direction(p.team)>FIELD.halfLength-FIELD.boxDepth*1.2){this.header(p);return;}
      }
    }
  }
  pass(p,aim=null,{firstTime=false,header=false}={}){
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
      :clamp(Math.sqrt(2*PLAY.rollingResistance*travel+100)+travel*PLAY.groundDrag*.92,PLAY.passMin,PLAY.passMax);
    const aimDirection=normalize(tx-p.x,tz-p.z),backheel=p.faceX*aimDirection.x+p.faceZ*aimDirection.z<-.65&&d<13;
    const distribution=hands?(d<24?'keeper-roll':d<45?'keeper-throw':'keeper-punt'):p.role==='GK'?'goal-kick':null;
    const kind=distribution|| (header?'header-pass':firstTime?'first-pass':backheel?'backheel':cross?'cross':through?'through-pass':d>35?'long-pass':d>18?'firm-pass':'short-pass');
    const leg=Math.sign((this.ball.x-p.x)*p.faceZ-(this.ball.z-p.z)*p.faceX)||1;
    this.ball.kick(p,tx-p.x,tz-p.z,header?Math.min(speed,28):speed,
      header?1:cross?PLAY.gravity*flight*.5:distribution==='keeper-throw'?4:distribution==='keeper-punt'?7:.45,
      {height:header?1.9:distribution==='keeper-throw'?1.65:distribution==='keeper-punt'?1.1:FIELD.ballRadius+.04,spin:cross?Math.sign(p.z)*.7:0});
    this.ball.pass={from:p,team:p.team,target,x:tx,z:tz};this.ball.shot=null;
    this.stats[p.team].passes++;p.animate(kind,distribution?.85:cross?.75:.52,{side:leg,aim:aimDirection});p.involvement+=.4;
    if(p.team===0){this.controlled=target;this.switchCooldown=1.4;this.receiverAssist=true;}
    if(this.phase==='restart')this.finishRestart();
  }
  shoot(p,power=.5,aim=null,{firstTime=false,header=false}={}){
    const direction=this.direction(p.team),goalX=direction*FIELD.halfLength,config=this.aiConfig(p.team);
    const error=(this.random()-.5)*(p.team===0?u(1.5):(1-config.accuracy)*u(12))*p.attributes.shotError;
    let targetZ=this.phase==='restart'?this.aimZ:clamp((aim?.z||0)*FIELD.goalHalf*1.15+p.z*.1,-FIELD.goalHalf*1.08,FIELD.goalHalf*1.08);
    if(p.team===1)targetZ=(this.random()>.5?1:-1)*FIELD.goalHalf*(.4+this.random()*.36);
    targetZ+=error;
    const close=Math.abs(goalX-p.x)<u(8),shotSpeed=((close?PLAY.shotBase-5:PLAY.shotBase)+power*PLAY.shotPower)*p.attributes.shotPower;
    const height=this.ball.y,incomingY=this.ball.vy,shotDirection=normalize(goalX-p.x,targetZ-p.z);
    const leg=Math.sign((this.ball.x-p.x)*p.faceZ-(this.ball.z-p.z)*p.faceX)||1;
    const kind=header?'header':this.restart?.type==='PENALTY'?'penalty':this.restart?.type==='FREE KICK'?'free-kick':
      firstTime&&height>1.1?'volley':firstTime&&height>.5&&incomingY>0?'half-volley':firstTime?'first-shot':
      close&&power<.65?'side-foot':power>.82?'power-shot':power<.4?'driven-shot':Math.abs(goalX-p.x)>25?'long-shot':'shot';
    this.ball.kick(p,goalX-p.x,targetZ-p.z,header?25+power*8:shotSpeed,
      header?1:kind==='driven-shot'?.5:(close?1.7:2.5)+power*2,
      {height:header?1.95:firstTime?Math.min(height,2.2):FIELD.ballRadius+.04,spin:(aim?.z||0)*power*1.6});
    this.ball.shot={player:p,team:p.team,counted:false,assist:this.ball.previousTouch?.team===p.team?this.ball.previousTouch:null};this.ball.pass=null;this.stats[p.team].shots++;
    p.animate(kind,power>.8?.8:.65,{side:leg,aim:shotDirection,power});p.involvement++;if(this.phase==='restart')this.finishRestart();
  }
  header(p){this.shoot(p,.55,null,{firstTime:true,header:true});}
  skill(p,aim=null){performSkill(this,p,aim);}
  tackle(p){
    if(p.cooldown>0||p.sentOff)return;
    const sliding=Math.hypot(p.vx,p.vz)>PLAY.runSpeed*.85;
    p.cooldown=sliding?1.1:.65;p.animate(sliding?'slide-tackle':'standing-tackle',sliding?.55:.45,{side:1});
    const victim=this.ball.owner;
    if(!victim||victim.team===p.team||distance(p,victim)>(sliding?3.2:2.25))return;
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
    if(this.ball.owner===offender)this.ball.owner=null;
    this.referee.animate('card',2);
    this.referee.cardColor=title==='RED CARD'?'#f43d38':title==='YELLOW CARD'?'#ffe24b':null;
    this.beginRestart(foulRestart(victim,this.direction(victim.team)));
    victim.animate(severity==='red'?'roll-fall':'fall',.8,{side:Math.sign(victim.z-offender.z)||1});
    offender.animate('card-reaction',2);this.moment={type:'card',player:this.referee,time:1.6};
    this.referee.watch(offender);
    this.notify(title,foulNames,3);
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
    this.scoringTeam=team;this.ball.owner=null;this.ball.settleInNet(this.direction(team));
    this.celebratingPlayer=scorer?.team===team?scorer:this.active(team).find(p=>p.role==='FWD');
    const celebrations=['celebrate-slide','celebrate-jump','celebrate-arms','celebrate-point','celebrate-fist','celebrate-calm'];
    const lateWinner=this.elapsed>this.settings.duration*48&&this.stats[team].goals===this.stats[1-team].goals+1;
    const celebration=lateWinner?'celebrate-jump':this.celebratingPlayer?.data.leadershipRole==='captain'?'celebrate-arms':celebrations[Math.floor(this.random()*celebrations.length)];
    this.celebratingPlayer?.animate(celebration,3.8);
    if(celebration==='celebrate-slide'&&this.celebratingPlayer){this.celebratingPlayer.vx=this.direction(team)*3.2;this.celebratingPlayer.vz=0;}
    this.players.filter(p=>p.team!==team).forEach(p=>p.animate(p.role==='GK'?'concede':'miss',2.4));
    this.setPhase('goal');this.notify('GOAL!',playerLabel(scorer)+' · '+this.teams[team].name,4);this.event('goal',this.goalEvents.at(-1));
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
    this.restart={...data,taker};this.aimZ=0;
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
    this.ball.owner=taker;this.ball.lastTouch=taker;taker.holdTime=0;
    if(data.team===0)this.controlled=taker;
    this.setPhase('restart');this.notify(data.type,this.teams[data.team].name,2);
  }
  updateRestart(dt,input){
    const r=this.restart;if(!r)return;
    const move=input?.movement()||{x:0,z:0,intensity:0};
    if(r.team===0){
      this.aimZ=clamp(this.aimZ+(move.z||move.x)*dt*FIELD.goalHalf*.9,-FIELD.goalHalf*1.08,FIELD.goalHalf*1.08);
      if(input?.held.has('shoot'))this.charge=clamp(this.charge+dt/1.2,0,1);
      if(this.phaseTime>.7){
        if(input?.pressed.has('pass')){this.pass(r.taker,move.intensity>.1?move:null);return;}
        if(input?.released.has('shoot')){this.shoot(r.taker,Math.max(.15,this.charge));this.charge=0;return;}
      }
    }
    const automatic=r.team===1?1.8:({'KICK OFF':3,'THROW-IN':5,'GOAL KICK':5,'CORNER':8,'FREE KICK':10,'PENALTY':12}[r.type]||8);
    if(this.phaseTime>automatic){
      if(r.type==='PENALTY'||(r.type==='FREE KICK'&&FIELD.halfLength-r.x*this.direction(r.team)<PLAY.shootingRange))this.shoot(r.taker,.65);
      else this.pass(r.taker);
    }
  }
  finishRestart(){
    const r=this.restart;
    if(r?.type==='THROW-IN'){this.ball.y=2;this.ball.vy=3;r.taker.animate('keeper-throw',.6);}
    this.restart=null;this.setPhase('playing');
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
      this.archive.push({...out});this.used[team].push(out.data);
      const saved={x:out.x,z:out.z,slot:out.slot,team:out.team,role:out.role};
      const next=new Player(incoming,team,out.slot,this.direction(team));Object.assign(out,next,saved);
      this.benches[team]=this.benches[team].filter(p=>p.id!==incoming.id);
      this.stats[team].substitutions++;const event={team,out:this.archive.at(-1).name,outJersey:this.archive.at(-1).jersey??null,in:incoming.name,inJersey:incoming.jersey??null,time:this.elapsed};this.subEvents.push(event);
      this.event('substitution',{player:out,...event});
      out.animate('wave',1.2);this.moment={type:'substitution',player:out,time:1.2};
    }this.pending=[];
  }
  autoSubstitute(){
    if(this.stats[1].substitutions>=3||!this.benches[1].length)return;
    const tired=this.active(1).filter(p=>p.role!=='GK'&&p.stamina<p.maxStamina*.52).sort((a,b)=>a.stamina/a.maxStamina-b.stamina/b.maxStamina)[0];
    if(!tired)return;
    const incoming=this.benches[1].find(p=>!/goal|keeper/i.test(p.position))||this.benches[1][0];
    this.pending.push({out:tired,incoming,team:1});this.applySubstitutions();
  }
}
