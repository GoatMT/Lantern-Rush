import { FIELD,PLAY,normalize,clamp,distance } from '../config.js';
export class Ball {
  constructor(){this.flightId=0;this.reset();}
  reset(x=0,z=0){Object.assign(this,{x,z,y:FIELD.ballRadius,vx:0,vz:0,vy:0,owner:null,lastTouch:null,previousTouch:null,lock:0,shot:null,pass:null,
    spin:0,rollX:0,rollZ:0,rotationY:0,touchClock:0,touchCount:0,controlMode:'feet',flightTime:0,inNet:false});}
  touch(player){
    if(this.pass&&player.team!==this.pass.team)this.pass=null;
    if(this.lastTouch!==player)this.previousTouch=this.lastTouch;
    this.lastTouch=player;player.involvement+=.08;
  }
  take(player,{hands=false,pressure=0,random=()=>.5}={}){
    const incomingSpeed=Math.hypot(this.vx,this.vz),moving=Math.hypot(player.vx,player.vz),quality=player.attributes?.dribble??.7;
    if(this.pass){if(this.pass.team===player.team&&this.pass.from!==player){this.pass.from.passes++;this.pass.completed=true;}this.pass=null;}
    this.owner=player;this.touch(player);this.shot=null;this.controlMode=hands?'hands':'feet';this.touchClock=.12;player.holdTime=0;player.lastReceive=0;
    this.spin*=.15;
    if(hands){this.vx=this.vz=this.vy=0;this.holdInHands();return;}
    // Cushion a pass at the contact point; a moving receiver can take it into their stride.
    if(distance(this,player)>2.5){this.x=player.x+player.faceX*.85;this.z=player.z+player.faceZ*.85;}
    this.y=FIELD.ballRadius;this.vy=0;
    const heavy=clamp(incomingSpeed/50*(1-quality)*(.6+pressure*.1),0,.45);
    const carry=moving>.8?normalize(player.vx,player.vz):{x:player.faceX,z:player.faceZ};
    const touchSpeed=moving>.8?moving*.75+1+heavy*4:incomingSpeed<10?0:1.5+heavy*5;
    this.vx=carry.x*touchSpeed;this.vz=carry.z*touchSpeed;
    const across=(player.faceX*carry.z-player.faceZ*carry.x);
    player.animate(moving>.8?(Math.abs(across)>.4?'receive-turn':'receive-run'):incomingSpeed<13?'trap':'cushion',.45,{side:Math.sign(across)||1});
    if(heavy>.3&&random()<heavy*.35){this.vx+=carry.x*3;this.vz+=carry.z*3;this.touchClock=.3;}
  }
  holdInHands(){
    const p=this.owner;if(!p)return;this.x=p.x+p.faceX*.55;this.z=p.z+p.faceZ*.55;this.y=1.64;this.vx=this.vz=this.vy=0;
  }
  kick(player,dx,dz,power,lift=0,{spin=0,height=null}={}){
    const n=normalize(dx,dz),previousHeight=this.y;this.owner=null;this.controlMode='feet';this.touch(player);
    if(distance(this,player)>2.8||this.y>3.4){this.x=player.x+n.x*.9;this.z=player.z+n.z*.9;}
    else if(distance(this,player)<.65){this.x=player.x+n.x*.75;this.z=player.z+n.z*.75;}
    this.y=height??Math.max(FIELD.ballRadius+.04,Math.min(previousHeight,2.6));
    this.vx=n.x*power;this.vz=n.z*power;this.vy=lift;this.spin=spin;this.lock=Math.min(.10,1.5/Math.max(power,1));player.cooldown=.25;
    this.flightId++;this.flightTime=0;this.inNet=false;
  }
  release(vx=this.vx,vz=this.vz,vy=this.vy){this.owner=null;this.controlMode='feet';this.vx=vx;this.vz=vz;this.vy=vy;this.touchClock=0;}
  integrate(dt){
    const airborne=this.y>FIELD.ballRadius+.015||this.vy>.1,speed=Math.hypot(this.vx,this.vz);
    if(airborne){
      const curve=this.spin*.018,oldX=this.vx;this.vx+=-this.vz*curve*dt;this.vz+=oldX*curve*dt;
      const drag=Math.exp(-PLAY.airDrag*dt);this.vx*=drag;this.vz*=drag;this.vy-=PLAY.gravity*dt;
    }else if(speed>0){
      const next=Math.max(0,speed*Math.exp(-PLAY.groundDrag*dt)-PLAY.rollingResistance*dt);
      this.vx*=next/speed;this.vz*=next/speed;
    }
    this.x+=this.vx*dt;this.z+=this.vz*dt;this.y+=this.vy*dt;
    if(this.y<=FIELD.ballRadius){this.y=FIELD.ballRadius;this.vy=Math.abs(this.vy)>1.8?-this.vy*PLAY.bounceDamping:0;}
    this.spin*=Math.exp(-(airborne?.25:1.7)*dt);this.rollX+=this.vz*dt/FIELD.ballRadius;this.rollZ-=this.vx*dt/FIELD.ballRadius;this.rotationY+=this.spin*dt;
    if(Math.hypot(this.vx,this.vz)<PLAY.stopSpeed){this.vx=this.vz=0;if(this.y===FIELD.ballRadius)this.spin=0;}
  }
  update(dt){
    this.lock=Math.max(0,this.lock-dt);this.flightTime+=dt;
    if(this.owner&&this.controlMode==='hands'){this.owner.holdTime+=dt;this.holdInHands();return;}
    this.integrate(dt);
    const p=this.owner;if(!p)return;p.holdTime+=dt;this.touchClock-=dt;
    const speed=Math.hypot(p.vx,p.vz),quality=p.attributes?.dribble??.7,gap=distance(this,p);
    if(gap>3.4+speed*.1||p.sentOff){this.release();return;}
    const skill=p.skillPlan,closeControl=skill?.kind==='close-control'||p.skill>0;
    const reach=closeControl?1.7:1.25+speed*.045;
    if(this.touchClock<=0&&gap<reach){
      const forward=speed>.7?normalize(p.vx,p.vz):{x:p.faceX,z:p.faceZ};
      const extra=closeControl?.9:speed<2.4?.5:speed<5?1.3:speed<8?2.1:3.4;
      const n=skill?normalize(forward.x+skill.x*.8,forward.z+skill.z*.8):forward;
      const lead=.62+(speed/PLAY.sprintSpeed)*(.7+(1-quality)*.5);
      const correctionX=p.x+n.x*lead-this.x,correctionZ=p.z+n.z*lead-this.z;
      this.vx=p.vx+correctionX*4+n.x*extra;this.vz=p.vz+correctionZ*4+n.z*extra;
      if(speed<.15&&gap<.95&&!skill){this.vx=this.vz=0;}
      this.vy=0;this.y=FIELD.ballRadius;this.touchClock=closeControl?.16:clamp(.25+speed*.01,.25,.38);this.touchCount++;
      p.footTouch=.16;
    }
  }
  settleInNet(side){
    this.release(this.vx*.07,this.vz*.09,0);this.x=clamp(this.x,side>0?FIELD.halfLength: -FIELD.halfLength-FIELD.goalDepth,side>0?FIELD.halfLength+FIELD.goalDepth:-FIELD.halfLength);
    this.z=clamp(this.z,-FIELD.goalHalf+.35,FIELD.goalHalf-.35);this.y=FIELD.ballRadius;this.inNet=true;
  }
}
