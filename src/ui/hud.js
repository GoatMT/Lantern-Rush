import { $ } from './menus.js';
import { FIELD,clockText,clamp } from '../config.js';
import { MatchIntro } from './intro.js';
import { teamOverall } from '../ratings.js';
import { playerLabel } from '../player-label.js';
export class HUD{
  constructor(app){this.app=app;this.labels=new Map();this.ctx=$('minimap').getContext('2d');this.acc=0;this.intro=new MatchIntro();}
  reset(){this.labels.clear();$('player-labels').replaceChildren();}
  update(dt){
    const m=this.app.match;if(!m||this.app.menus.screen!=='match')return;const p=m.controlled;
    $('match-hud').dataset.phase=m.phase;
    $('score-user').textContent=m.stats[0].goals;$('score-cpu').textContent=m.stats[1].goals;
    $('hud-user-ovr').textContent=(teamOverall(m.active(0))??'—')+' OVR';$('hud-cpu-ovr').textContent=(teamOverall(m.active(1))??'—')+' OVR';
    $('match-clock').textContent=clockText(m.elapsed);$('half-label').textContent=m.half===1?'FIRST HALF':'SECOND HALF';
    $('controlled-name').textContent=playerLabel(p);$('stamina-fill').style.width=Math.round(p.stamina*100)+'%';
    $('stamina-status').textContent=p.exhausted?'EXHAUSTED · NEXT STOPPAGE':Math.round(p.stamina*100)+'% / '+Math.round(p.maxStamina*100)+'% STAMINA';
    $('stamina-fill').classList.toggle('exhausted',p.exhausted);
    $('controlled-profile').textContent=p.role+' · '+(p.data.overall??'—')+' OVR · '+(p.data.playstyle?.label||'');
    $('power-meter').hidden=m.charge<=0;$('power-fill').style.width=Math.round(m.charge*100)+'%';
    const defending=m.ball.owner&&m.ball.owner.team===1;$('touch-shoot').textContent=defending?'TACKLE':'SHOOT';$('touch-pass').textContent=m.ball.owner===p?'PASS':'SWITCH';
    $('set-piece-hint').hidden=m.phase!=='restart';
    if(m.phase==='restart'){const r=m.restart;$('set-piece-hint').innerHTML='<strong>'+r.type+' · '+(r.team===0?'YOU':'CPU')+'</strong>'+(r.team===0?'Aim with movement · Hold Shoot or tap Pass':'Finding the restart…');}
    const intro=m.phase==='intro';this.intro.update(m);
    const controlledPos=this.app.renderer.project(p.x,this.app.renderer.playerLabelHeight(),p.z);
    $('touch-controls').hidden=intro||m.phase==='goal';
    for(const player of m.players){
      let label=this.labels.get(player);
      if(!label){label=document.createElement('div');label.className='pitch-label';$('player-labels').append(label);this.labels.set(player,label);}
      const show=!player.sentOff&&(intro?m.phaseTime>=9.8:m.phase==='goal'?player===m.celebratingPlayer:player===m.controlled||player===m.ball.owner);label.hidden=!show;if(!show)continue;
      label.classList.toggle('you',player.team===0);
      label.textContent=(intro?player.role+' · ':m.phase==='goal'?'SCORER · ':player===m.controlled?'YOU · ':'')+playerLabel(player);
      const pos=this.app.renderer.project(player.x,this.app.renderer.playerLabelHeight(),player.z);
      if(!intro&&m.phase!=='goal'&&player!==p&&Math.abs(pos.x-controlledPos.x)<160&&Math.abs(pos.y-controlledPos.y)<26)pos.y=controlledPos.y-27;
      label.hidden=!pos.visible;label.style.left=pos.x+'px';label.style.top=pos.y+'px';
    }
    this.acc+=dt;if(this.acc>.1){this.acc=0;this.radar();}
  }
  radar(){
    const c=this.ctx,m=this.app.match;c.clearRect(0,0,240,156);c.strokeStyle='#d8e0be80';c.lineWidth=1;c.strokeRect(6,6,228,144);c.beginPath();c.moveTo(120,6);c.lineTo(120,150);c.stroke();c.beginPath();c.arc(120,78,17,0,Math.PI*2);c.stroke();
    const sx=114/FIELD.halfLength,sz=72/FIELD.halfWidth;
    for(const p of m.players){if(p.sentOff)continue;c.fillStyle=p===m.controlled?'#edff81':m.teams[p.team].kit;c.beginPath();c.arc(120+clamp(p.x,-FIELD.halfLength,FIELD.halfLength)*sx,78+clamp(p.z,-FIELD.halfWidth,FIELD.halfWidth)*sz,p===m.controlled?5:3,0,Math.PI*2);c.fill();}
    c.fillStyle='#fff';c.beginPath();c.arc(120+clamp(m.ball.x,-FIELD.halfLength,FIELD.halfLength)*sx,78+clamp(m.ball.z,-FIELD.halfWidth,FIELD.halfWidth)*sz,2.7,0,Math.PI*2);c.fill();
  }
}
