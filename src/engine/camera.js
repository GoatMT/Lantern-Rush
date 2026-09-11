import * as T from '../../vendor/three.module.js';
import {FIELD,clamp,distance} from '../config.js';
export const CAMERA_MODES=Object.freeze({
  low:{height:31,back:29},medium:{height:49,back:44},high:{height:73,back:58},broadcast:{height:47,back:60}
});
export class BroadcastCamera{
  constructor(camera){this.camera=camera;this.look=new T.Vector3();this.target=new T.Vector3();this.position=new T.Vector3(70,64,98);camera.position.copy(this.position);}
  update(dt,time,match){
    const aspect=this.camera.aspect;
    if(!match||match.phase==='home'){
      this.position.set(68+Math.sin(time*.08)*16,62,88+Math.cos(time*.08)*12);this.target.set(0,0,-1);
    }else{
      const b=match.ball,p=match.controlled,mode=CAMERA_MODES[match.settings.camera]||CAMERA_MODES.medium;
      const x=clamp(b.x*.84+(p?.x||0)*.13,-FIELD.halfLength+5,FIELD.halfLength-5);
      const z=clamp(b.z*.83,-FIELD.halfWidth*.9,FIELD.halfWidth*.9);
      const mates=match.active(p?.team??0).filter(m=>m!==p&&m.role!=='GK').sort((a,c)=>distance(a,b)-distance(c,b));
      const spread=mates[2]?distance(mates[2],b):24;
      const zoom=clamp((spread-20)*.17,0,10)+clamp(Math.hypot(b.vx,b.vz)*.13,0,6)+Math.min(b.y,8)*.3;
      const portrait=aspect<1.3?1.45:1,wide=aspect>1.9?.93:1;
      this.position.set(x,(mode.height+zoom)*portrait*wide,z+(mode.back+zoom*.7)*portrait*wide);this.target.set(x,0,z);
      if(match.settings.camera==='broadcast'){
        const midfield=1-Math.abs(x)/FIELD.halfLength;
        this.position.set(x,mode.height*portrait+midfield*9+zoom*.35,FIELD.halfWidth+mode.back*.45);
        this.target.set(x,0,b.z*.64);
      }
      if(match.phase==='intro'){
        const t=match.phaseTime;
        this.position.set(Math.sin(t*.18)*7,aspect<1.4?123:94,aspect<1.4?100:84);this.target.set(0,0,0);
        // The broadcast reveals both formations, then blends into the saved view.
        if(t>12.5){const f=clamp((t-12.5)/1.5,0,1);this.position.lerp(new T.Vector3(0,mode.height*portrait,mode.back*portrait),f);}
      }
      if(match.phase==='goal'){
        const lead=match.celebratingPlayer||b;
        this.position.set(lead.x-Math.sign(b.x)*11,7,lead.z+12);this.target.set(lead.x,1.1,lead.z);
      }
      if(['halftime','fulltime'].includes(match.phase)){
        this.position.set(Math.sin(time*.06)*15,62,72);this.target.set(0,0,0);
      }
      if(match.phase==='restart'&&match.restart){
        const r=match.restart,d=match.direction(r.team);
        if(r.type==='PENALTY'){this.position.set(r.x-d*21,15,r.z+17);this.target.set(r.x+d*10,1,0);}
        else if(r.type==='CORNER'){const cx=r.x-d*12;this.position.set(cx,49,r.z+(r.z>0?26:50));this.target.set(cx,0,r.z*.52);}
        else if(r.type==='FREE KICK'&&FIELD.halfLength-r.x*d<42){this.position.set(r.x-d*19,25,r.z+27);this.target.set(r.x+d*12,0,r.z*.6);}
        else if(r.type==='KICK OFF'){this.position.set(0,mode.height*portrait,mode.back*portrait);this.target.set(0,0,0);}
        if(match.moment?.player&&match.moment.type!=='miss'){
          const focus=match.moment.player;this.position.set(focus.x-7,6,focus.z+9);this.target.set(focus.x,1.3,focus.z);
        }
      }
    }
    const blend=1-Math.exp(-Math.min(dt,.1)*(match?.phase==='playing'?3:2));
    this.camera.position.lerp(this.position,blend);this.look.lerp(this.target,blend);this.camera.lookAt(this.look);
  }
}
