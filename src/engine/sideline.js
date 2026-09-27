import * as T from '../../vendor/three.module.js';
import {Player} from '../match/player.js';
import {PlayerModel} from './models.js';
import {sidelineAnchor,SIDELINE_RETURN} from '../match/sideline.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export class SidelineCast{
  constructor(scene){this.scene=scene;this.staff=[];this.visitor=null;this.cueId=null;}
  setMatch(match,scale){
    this.dispose();this.match=match;this.scale=scale;
    for(const team of [0,1])for(const assistant of [false,true]){
      const data={id:`${match.teams[team].id}-${assistant?'assistant':'coach'}`,name:assistant?'Assistant Coach':'Coach',jersey:null,staff:true};
      const player=new Player(data,team,3,1);player.role='STAFF';
      const anchor=sidelineAnchor(team);player.x=anchor.x+(assistant?2.2:0);player.z=anchor.z+(assistant?-.3:0);player.faceX=0;player.faceZ=1;
      const tint=match.teams[team].kit||match.teams[team].uniform?.primary||'#dbc783';
      const kit={primary:assistant?'#334951':'#172d35',secondary:'#172d35',shorts:'#1c2d35',socks:'#1c2d35',trim:tint,pattern:'solid'};
      const model=new PlayerModel(player,kit);model.setVisualScale(scale);this.scene.add(model.root);
      if(assistant){const clipboard=new T.Mesh(new T.BoxGeometry(.24,.32,.035),new T.MeshStandardMaterial({color:'#c6c8bb',roughness:.9}));clipboard.position.set(0,-.27,.055);model.elbows[0].add(clipboard);}
      this.staff.push({player,model,assistant,anchor});
    }
  }
  setVisualScale(scale){this.scale=scale;for(const s of this.staff)s.model.setVisualScale(scale);this.visitor?.model.setVisualScale(scale);}
  clearVisitor(){if(this.visitor){this.scene.remove(this.visitor.model.root);this.visitor.model.dispose();this.visitor=null;}}
  update(dt,time,match,quality,camera){
    const cue=match?.sideline;
    if(cue?.id!==this.cueId){
      this.cueId=cue?.id;this.clearVisitor();
      if(cue?.kind==='substitution'&&cue.outPlayer){
        const p=new Player(cue.outPlayer,cue.team,3,1);p.role=cue.outPlayer.role||'MID';
        const m=new PlayerModel(p,match.teams[cue.team].uniform||match.teams[cue.team].kit);m.setVisualScale(this.scale);this.scene.add(m.root);this.visitor={player:p,model:m};
      }
    }
    for(const staff of this.staff){
      const {player:p,model,assistant,anchor}=staff;
      const active=cue?.team===p.team,t=cue?.time||0;
      let action=assistant?'staff-listen':'staff-instructions';
      if(active){
        const v=cue.variant;
        if(v==='heated'){action=assistant?(t<1.6?'staff-argue':'staff-shout'):(t<1.6?'staff-shout':'staff-argue');}
        else if(v==='discussion')action=assistant?(t<2.1?'staff-talk':'staff-listen'):(t<2.1?'staff-listen':'staff-instructions');
        else if(v==='welcome')action=assistant?'staff-talk':'staff-welcome';
        else if(v==='appeal'||v==='urgent')action=assistant?'staff-argue':'staff-shout';
        else if(v==='celebrate')action=assistant?'staff-applaud':'staff-celebrate';
        else if(v==='applaud')action='staff-applaud';
        else if(v==='reflection')action=assistant?'staff-talk':'staff-reflect';
        const talking=['heated','discussion','reflection','welcome'].includes(v);
        const target=talking&&t<cue.duration*.66?{x:anchor.x+(assistant?0:2.2),z:anchor.z}:{x:anchor.x,z:anchor.z+12};
        const desired=Math.atan2(target.x-p.x,target.z-p.z),angle=Math.atan2(p.faceX,p.faceZ),delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle)),next=angle+delta*(1-Math.exp(-dt*5));
        p.faceX=Math.sin(next);p.faceZ=Math.cos(next);p.watch(target);
        p.action={name:action,duration:cue.duration,time:Math.min(t,cue.duration),context:{}};
      }else{p.action=null;p.watch(match?.ball||{x:0,z:0});}
      model.update(time,false,dt,quality,camera.position.distanceTo(model.root.position));
    }
    if(this.visitor&&cue){
      const {player:p,model}=this.visitor,a=sidelineAnchor(cue.team),walk=smooth((cue.time-.35)/3.6);
      p.x=a.x-3.8+walk*1.1;p.z=a.z+6-walk*7;p.faceX=.15;p.faceZ=-1;p.lookX=.3;p.lookZ=-1;p.vx=.3;p.vz=walk<.995?-1.8:0;p.gait=cue.time*4.6;
      p.action=walk>.78?{name:'wave',duration:1.8,time:Math.min(1.7,(walk-.78)*7),context:{}}:null;
      model.update(time,false,dt,quality,camera.position.distanceTo(model.root.position));
    }
  }
  dispose(){for(const s of this.staff){this.scene.remove(s.model.root);s.model.dispose();}this.staff=[];this.clearVisitor();this.cueId=null;}
}
export function sidelineCamera(camera,cue){
  const a=sidelineAnchor(cue.team),t=cue.time;
  const weight=smooth(t/.8)*(1-smooth((t-cue.duration)/SIDELINE_RETURN));
  const change=smooth((t-1.3)/1.8),sub=cue.kind==='substitution';
  camera.position.lerp(new T.Vector3(a.x+(sub?-5:6)-change*1.4,4.2,a.z+10.8-change),weight);
  camera.target.lerp(new T.Vector3(a.x+(sub?-.7:1.1),2.05,a.z+.4),weight);
  return weight;
}
