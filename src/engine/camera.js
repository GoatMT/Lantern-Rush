import * as T from '../../vendor/three.module.js';
import {FIELD,clamp,distance} from '../config.js';
export const CAMERA_MODES=Object.freeze({
  low:{height:31,back:29},medium:{height:49,back:44},high:{height:73,back:58},broadcast:{height:44,back:54}
});
export class BroadcastCamera{
  constructor(camera){this.camera=camera;this.look=new T.Vector3();this.target=new T.Vector3();this.position=new T.Vector3(64,43,91);this.compact=false;this.introDestination=new T.Vector3();camera.position.copy(this.position);}
  update(dt,time,match){
    const aspect=this.camera.aspect;let fov=49;
    if(!match||match.phase==='home'){
      this.position.set(58+Math.sin(time*.045)*13,39+Math.sin(time*.04)*3,85+Math.cos(time*.045)*10);this.target.set(-4,2,-8);fov=53;
    }else{
      const b=match.ball,p=match.controlled,mode=CAMERA_MODES[match.settings.camera]||CAMERA_MODES.medium;
      const x=clamp(b.x*.84+(p?.x||0)*.13+clamp(b.vx*.11,-3.5,3.5),-FIELD.halfLength+5,FIELD.halfLength-5);
      const z=clamp(b.z*.83,-FIELD.halfWidth*.9,FIELD.halfWidth*.9);
      const mates=match.active(p?.team??0).filter(m=>m!==p&&m.role!=='GK').sort((a,c)=>distance(a,b)-distance(c,b));
      const spread=mates[2]?distance(mates[2],b):24;
      const zoom=clamp((spread-20)*.17,0,10)+clamp(Math.hypot(b.vx,b.vz)*.13,0,6)+Math.min(b.y,8)*.3;
      const portrait=aspect<1.3?1.45:1,wide=this.compact&&aspect>1.3?.88:aspect>1.9?.95:1;
      this.position.set(x,(mode.height+zoom)*portrait*wide,z+(mode.back+zoom*.7)*portrait*wide);this.target.set(x,0,z);
      if(match.settings.camera==='broadcast'){
        const midfield=1-Math.abs(x)/FIELD.halfLength;
        this.position.set(x,(mode.height+midfield*5+zoom*.45)*portrait*wide,z+(mode.back+zoom*.45)*portrait*wide);
        this.target.set(x,.4,b.z*.91);
      }
      if(match.phase==='intro'){
        const t=match.phaseTime;
        this.position.set(48-t*2.5,aspect<1.4?92:47,aspect<1.4?99:83);this.target.set(0,1,-3);fov=53;
        if(t>3.9&&t<9.8){this.position.set(t<6.9?-38:38,26,53);this.target.set(t<6.9?-21:21,1,0);}
        // The broadcast reveals both formations, then blends into the saved view.
        if(t>12.5){const f=clamp((t-12.5)/1.5,0,1);this.introDestination.set(0,mode.height*portrait*wide,mode.back*portrait*wide);this.position.lerp(this.introDestination,f);}
      }
      if(match.phase==='goal'){
        const lead=match.celebratingPlayer||b;
        const orbit=Math.sin(match.phaseTime*.32)*2;this.position.set(lead.x-Math.sign(b.x)*10+orbit,5.4,lead.z+13);this.target.set(lead.x,2.0,lead.z);fov=43;
      }
      if(['halftime','fulltime'].includes(match.phase)){
        this.position.set(Math.sin(time*.035)*12,43,77);this.target.set(0,0,-3);fov=53;
      }
      if(match.phase==='restart'&&match.restart){
        const r=match.restart,d=match.direction(r.team);
        if(r.type==='PENALTY'){this.position.set(r.x-d*19,10,r.z+13);this.target.set(r.x+d*10,1.5,0);fov=48;}
        else if(r.type==='CORNER'){const cx=r.x-d*12;this.position.set(cx,49,r.z+(r.z>0?26:50));this.target.set(cx,0,r.z*.52);}
        else if(r.type==='FREE KICK'&&FIELD.halfLength-r.x*d<42){this.position.set(r.x-d*19,25,r.z+27);this.target.set(r.x+d*12,0,r.z*.6);}
        else if(r.type==='KICK OFF'){this.position.set(0,mode.height*portrait*wide,mode.back*portrait*wide);this.target.set(0,.4,0);}
        if(match.moment?.player&&match.moment.type!=='miss'){
          const focus=match.moment.player;this.position.set(focus.x-7,5,focus.z+10);this.target.set(focus.x,2,focus.z);fov=45;
        }
      }
    }
    const blend=1-Math.exp(-Math.min(dt,.1)*(match?.phase==='playing'?3.6:2.1));
    this.camera.position.lerp(this.position,blend);this.look.lerp(this.target,blend);this.camera.lookAt(this.look);
    if(Math.abs(this.camera.fov-fov)>.015){this.camera.fov+=(fov-this.camera.fov)*blend;this.camera.updateProjectionMatrix();}
  }
}
