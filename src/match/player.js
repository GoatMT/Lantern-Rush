import { FORMATION,FIELD,PLAY,clamp,normalize } from '../config.js';
import { playerAttributes } from './attributes.js';
import { staminaCapacity } from '../ratings.js';
import { preferredFoot } from './shooting.js';
export const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
export class Player {
  constructor(data,team,slot,direction){
    Object.assign(this,{data:{...data},team,slot,role:FORMATION[slot].role,id:data.id,name:data.name,jersey:data.jersey,
      x:0,z:0,vx:0,vz:0,faceX:direction,faceZ:0,stamina:1,cooldown:0,skill:0,animation:'idle',animationTime:0,
      sentOff:false,yellow:0,decision:0,holdTime:0,goals:0,assists:0,passes:0,tackles:0,saves:0,involvement:0,
      gait:0,turn:0,acceleration:0,lookX:direction,lookZ:0,locomotion:'idle',boosting:false,action:null,skillPlan:null,lastSkill:null,keeperState:{},lastReceive:-10});
    const preference=preferredFoot(data);this.dominantFoot=preference.foot;this.footSource=preference.source;this.touchFoot=preference.foot==='left'?'left':'right';
    this.attributes=playerAttributes(data);this.maxStamina=staminaCapacity(data.overall);this.stamina=this.maxStamina;this.exhausted=false;this.reset(direction);
  }
  reset(direction){
    const h=FORMATION[this.slot];this.x=h.x*direction;this.z=h.z;this.vx=this.vz=0;this.faceX=direction;this.faceZ=0;this.lookX=direction;this.lookZ=0;this.cooldown=.35;
    this.action=null;this.skillPlan=null;this.skill=0;this.animationTime=0;this.animation=this.role==='GK'?'ready':'idle';this.locomotion='idle';this.keeperState={};this.gait=0;this.hasBall=false;this.striking=false;this.aiTarget=null;this.cutTime=0;this.receivedFrom=null;
  }
  move(dx,dz,intensity,dt,sprint=false,facing=null){
    if(this.striking){dx=dz=intensity=0;sprint=false;}
    const n=normalize(dx,dz),moving=Math.hypot(dx,dz)>.03&&intensity>.01,previousSpeed=Math.hypot(this.vx,this.vz);
    const recovering=this.action&&['fall','roll-fall','slide-tackle','get-up','keeper-get-up','keeper-dive'].includes(this.action.name);
    const boosting=sprint&&this.stamina>0&&!this.exhausted&&moving&&!recovering;
    const settling=this.hasBall&&this.lastReceive<.24?.74:1;
    const speed=(boosting?PLAY.sprintSpeed:PLAY.runSpeed)*this.attributes.speed*(.88+.12*this.stamina)*clamp(intensity,0,1)*settling;
    let tx=moving?n.x*speed:0,tz=moving?n.z*speed:0;
    if(this.skillPlan){tx+=this.skillPlan.x*this.skillPlan.burst;tz+=this.skillPlan.z*this.skillPlan.burst;}
    if(recovering){tx=this.vx*(this.action.name==='slide-tackle'?.92:.25);tz=this.vz*(this.action.name==='slide-tackle'?.92:.25);}
    const alignment=previousSpeed>.1?(this.vx*n.x+this.vz*n.z)/previousSpeed:1;
    this.cutTime=moving&&alignment<.65?.23:Math.max(0,(this.cutTime||0)-dt);
    const rate=!moving?PLAY.braking:this.cutTime>0?PLAY.turnAcceleration:boosting?PLAY.sprintAcceleration:PLAY.acceleration;
    const dv=Math.hypot(tx-this.vx,tz-this.vz),step=Math.min(1,rate*dt/(dv||1));
    this.vx+=(tx-this.vx)*step;this.vz+=(tz-this.vz)*step;
    this.x=clamp(this.x+this.vx*dt,-FIELD.halfLength-FIELD.playerMargin,FIELD.halfLength+FIELD.playerMargin);
    this.z=clamp(this.z+this.vz*dt,-FIELD.halfWidth-FIELD.playerMargin,FIELD.halfWidth+FIELD.playerMargin);
    const actualSpeed=Math.hypot(this.vx,this.vz),oldAngle=Math.atan2(this.faceX,this.faceZ);
    let desired=facing?normalize(facing.x-this.x,facing.z-this.z):moving?n:{x:this.faceX,z:this.faceZ};
    if(this.action?.context?.aim&&this.action.time<this.action.duration*.6)desired=this.action.context.aim;
    const delta=angleDelta(oldAngle,Math.atan2(desired.x,desired.z)),turnRate=boosting?PLAY.sprintTurnRate:PLAY.turnRate,angle=oldAngle+clamp(delta,-turnRate*dt,turnRate*dt);
    this.faceX=Math.sin(angle);this.faceZ=Math.cos(angle);this.turn+=(delta-this.turn)*(1-Math.exp(-9*dt));
    this.acceleration=(actualSpeed-previousSpeed)/Math.max(dt,.001);this.gait+=actualSpeed*dt*(boosting?1.9:2.4);
    const dot=(this.vx*this.faceX+this.vz*this.faceZ)/(actualSpeed||1);
    this.locomotion=actualSpeed<.15?'idle':facing&&dot<-.45?'backpedal':facing&&Math.abs(dot)<.55?'sidestep':boosting?'sprint':actualSpeed<2.4?'walk':actualSpeed<5?'jog':'run';
    if(boosting&&!this.boosting&&!this.action)this.animate('sprint-start',.32);
    this.boosting=boosting;
    this.updateStamina(dt,boosting);
    if(!this.action)this.animation=this.role==='GK'&&actualSpeed<.2?'ready':this.locomotion;
  }
  updateStamina(dt,sprinting=false){
    if(this.sentOff)return;
    if(sprinting&&!this.exhausted){
      this.stamina=Math.max(0,this.stamina-PLAY.staminaDrain/this.attributes.endurance*dt);
      if(this.stamina===0){this.exhausted=true;this.boosting=false;}
    }else if(!this.exhausted)this.stamina=Math.min(this.maxStamina,this.stamina+PLAY.staminaRecovery*dt);
  }
  allowRecovery(){this.exhausted=false;}
  watch(point){const d=normalize(point.x-this.x,point.z-this.z);this.lookX=d.x;this.lookZ=d.z;}
  tick(dt){
    this.cooldown=Math.max(0,this.cooldown-dt);this.skill=Math.max(0,this.skill-dt);this.decision-=dt;this.lastReceive+=dt;this.footTouch=Math.max(0,(this.footTouch||0)-dt);
    if(this.skillPlan){this.skillPlan.time-=dt;if(this.skillPlan.time<=0)this.skillPlan=null;}
    if(this.action){
      this.action.time+=dt;this.animationTime=Math.max(0,this.action.duration-this.action.time);
      if(this.animationTime<=0){
        const {name,context}=this.action;this.action=null;
        if(['fall','roll-fall','slide-tackle'].includes(name))this.animate('get-up',.65,context);
        else if(name==='keeper-dive')this.animate('keeper-get-up',.85,context);
        else if(name==='stumble')this.animate('recover',.35);
      }
    }
  }
  animate(name,time=.45,context={}){
    this.animation=name;this.animationTime=time;this.action={name,duration:time,time:0,context};
  }
}
