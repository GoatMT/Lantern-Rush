import { escapeHTML as e,clockText } from '../config.js';
import { DEFAULT_KEYS,CONTROL_NAMES,keyLabel } from '../settings.js';
import { statRows,playerOfMatch } from '../match/stats.js';
import { kitSwatch,teamKit } from '../kits.js';
import { teamOverall } from '../ratings.js';
import { playerLabel } from '../player-label.js';
export const $=id=>document.getElementById(id);
export class Menus {
  constructor(app){this.app=app;this.returnToPause=false;this.bind();}
  bind(){
    const a=this.app,on=(id,fn)=>$(id).addEventListener('click',fn);
    on('play-now',()=>a.selectTeams('quick'));on('selection-back',()=>a.home());
    on('start-match',()=>a.start());on('home-settings',()=>this.settings());on('match-options',()=>this.settings('game'));
    for(const side of ['user','cpu']){
      on(side+'-bench',()=>this.squad(side));
      $(side+'-lineup').addEventListener('click',ev=>{const row=ev.target.closest('[data-profile]');if(row)this.squad(side,row.dataset.profile);});
    }
    for(const side of ['user','cpu'])for(const direction of ['prev','next'])on(side+'-'+direction,()=>a.cycle(side,direction==='next'?1:-1));
    $('season-select').addEventListener('change',ev=>a.changeSeason(ev.target.value));
    $('setting-lighting').addEventListener('change',ev=>{a.settings.set('lighting',ev.target.value);a.renderer.setLighting(ev.target.value);this.renderSettings();});
    $('setting-mobile-layout').addEventListener('change',ev=>{a.settings.set('mobileLayout',ev.target.checked?'right':'left');a.mobile.applyLayout();this.renderSettings();});
    $('setting-hold-switch').addEventListener('change',ev=>{a.settings.set('holdAutoSwitch',ev.target.checked);if(a.match)a.match.settings.holdAutoSwitch=ev.target.checked;});
    on('pause-button',()=>a.pause());on('resume',()=>this.resume());on('skip-intro',()=>a.match.skipIntro());
    on('open-subs',()=>this.subs());on('pause-settings',()=>this.settings());on('open-controls',()=>this.settings('controls'));
    on('restart-match',()=>this.confirm('RESTART MATCH?',()=>a.start()));on('quit-home',()=>this.confirm('QUIT TO HOME?',()=>a.home()));
    on('confirm-cancel',()=>{$('confirm-dialog').close();$('pause-dialog').showModal();});
    on('confirm-yes',()=>{$('confirm-dialog').close();this.confirmAction?.();});
    on('rotate-dismiss',()=>$('rotate-hint').classList.add('dismissed'));
    on('confirm-sub',()=>this.confirmSub());
    on('reset-bindings',()=>{a.settings.set('keys',{...DEFAULT_KEYS});this.renderBindings();this.keyboardHint();});
    document.addEventListener('bindings-changed',()=>{this.renderBindings();this.keyboardHint();});
    document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>this.closeDialog(b.dataset.close)));
    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>this.tab(b.dataset.tab)));
    for(const kind of ['graphics','difficulty','duration','camera'])document.querySelectorAll('[data-'+kind+']').forEach(b=>b.addEventListener('click',()=>{
      a.settings.set(kind,kind==='duration'?Number(b.dataset[kind]):b.dataset[kind]);
      if(kind==='graphics')a.renderer.applyGraphics(a.settings.value.graphics);
      if(kind==='camera'&&a.match)a.match.settings.camera=a.settings.value.camera;
      this.renderSettings();this.matchSummary();
    }));
    $('bindings').addEventListener('click',ev=>{
      const button=ev.target.closest('[data-bind]');if(!button)return;
      a.controls.clear();a.controls.rebinding=button.dataset.bind;this.renderBindings();
    });
    $('sub-out').addEventListener('click',ev=>{const b=ev.target.closest('[data-player]');if(b){this.out=b.dataset.player;this.renderSubs();}});
    $('sub-in').addEventListener('click',ev=>{const b=ev.target.closest('[data-player]');if(b){this.in=b.dataset.player;this.renderSubs();}});
    $('result-actions').addEventListener('click',ev=>{
      const action=ev.target.closest('[data-result]')?.dataset.result;
      if(action==='continue'){a.controls.clear();a.match.continueHalf();}
      if(action==='subs')this.subs();if(action==='rematch')a.start();if(action==='teams')a.selectTeams();if(action==='tournament')a.returnToTournament();if(action==='home')a.home();
    });
    for(const id of ['settings-dialog','subs-dialog','squad-dialog'])$(id).addEventListener('cancel',ev=>{ev.preventDefault();this.closeDialog(id);});
    $('pause-dialog').addEventListener('cancel',ev=>{ev.preventDefault();this.resume();});
    $('confirm-dialog').addEventListener('cancel',ev=>{ev.preventDefault();$('confirm-dialog').close();$('pause-dialog').showModal();});
  }
  closeAll(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());this.app.controls.rebinding=null;this.returnToPause=false;}
  closeDialog(id){$(id).close();this.app.controls.rebinding=null;this.app.controls.clear();if(this.returnToPause){$('pause-dialog').showModal();this.returnToPause=false;}else if(id==='subs-dialog'&&this.app.match.phase==='halftime')this.results();}
  show(screen){
    for(const id of ['home','selection','stats-screen'])$(id).hidden=id!==screen;
    $('match-hud').hidden=screen!=='match';$('intro-overlay').hidden=true;$('notice').hidden=true;
    this.screen=screen;this.app.controls.enabled=screen==='match';this.app.controls.clear();
    if(screen==='stats-screen')$('stats-screen').scrollTop=0;
  }
  selection(){
    this.show('selection');const a=this.app;
    $('season-select').innerHTML=a.data.seasons.map(s=>'<option value="'+e(s.year)+'">'+e(s.year)+'</option>').join('');
    $('season-select').value=a.settings.value.season;this.renderTeams();this.matchSummary();
  }
  renderTeams(){
    for(const side of ['user','cpu']){
      const rawTeam=this.app.selected[side],team=side==='user'?(this.app.formation?.teamForMatch(rawTeam)||rawTeam):rawTeam;if(!team)continue;
      $(side+'-name').textContent=team.name;$(side+'-division').textContent=team.division;
      $(side+'-team-ovr').textContent='TEAM OVR '+(teamOverall(team)??'—');
      $(side+'-logo').src=team.logo;$(side+'-logo').alt=team.logoFallback?'Lantern Soccer League':team.name+' badge';
      const color=side==='cpu'?this.app.cpuKit():team.kit;
      document.querySelector('.'+(side==='user'?'you':'cpu')+'-card').style.setProperty('--team-color',color);
      $(side+'-kit').style.background=kitSwatch(color===team.kit?team.uniform:teamKit('',team.id,color));
      $(side+'-lineup').innerHTML=team.lineup.map(p=>'<li><button class="lineup-player" data-profile="'+e(p.id)+'"><span class="position">'+p.role+'</span><span class="name">'+e(playerLabel(p))+'<small>'+e(p.playstyle?.label||'Profile unavailable')+'</small></span><span class="ovr" title="LSL Website career overall">'+(p.overall??'—')+'<small>OVR</small></span></button></li>').join('');
      $(side+'-formation-label').textContent=this.app.formation?.labelFor(team)||'2 — 2 — 2';
      $(side+'-bench').textContent='VIEW SQUAD · '+team.bench.length+' SUBSTITUTES ↗';
    }
    this.app.modes.render();this.app.tournament.render();
    $('cpu-kit-label').textContent=this.app.cpuKit()!==this.app.selected.cpu.kit?'CONTRAST KIT':'AWAY';
  }
  squad(side,playerId=null){
    const team=this.app.selected[side];this.returnToPause=false;$('squad-title').textContent=team.name+' · '+(teamOverall(team)??'—')+' TEAM OVR';
    $('squad-profiles').innerHTML=[...team.lineup,...team.bench].map(p=>'<details class="profile-card" '+(p.id===playerId?'open':'')+'><summary><span class="ovr">'+(p.overall??'—')+'<small>OVR</small></span><span><strong>'+e(playerLabel(p))+'</strong><small>'+e(p.role||p.position)+' · '+(team.lineup.some(s=>s.id===p.id)?'STARTER':'BENCH')+(p.leadershipRole==='captain'?' · CAPTAIN':'')+'</small><em>'+e(p.playstyle?.label||'Profile unavailable')+'</em></span></summary><p>'+e(p.playstyle?.description||'No website profile is available.')+'</p><div class="profile-traits">'+(p.playstyle?.traits||[]).map(t=>'<span>'+e(t)+'</span>').join('')+'</div></details>').join('');
    $('squad-dialog').showModal();
    if(playerId)$('squad-profiles').querySelector('details[open]')?.scrollIntoView({block:'nearest'});
  }
  matchSummary(){$('match-summary').textContent=this.app.settings.value.difficulty.toUpperCase()+' · '+this.app.settings.value.duration+' MINUTES';}
  settings(tab='graphics'){
    this.returnToPause=$('pause-dialog').open;if(this.returnToPause)$('pause-dialog').close();
    this.app.controls.clear();this.renderSettings();this.tab(tab);$('settings-dialog').showModal();
  }
  tab(tab){document.querySelectorAll('[data-settings-panel]').forEach(el=>el.hidden=el.dataset.settingsPanel!==tab);document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));}
  renderSettings(){
    for(const kind of ['graphics','difficulty','duration','camera'])document.querySelectorAll('[data-'+kind+']').forEach(b=>b.classList.toggle('active',String(this.app.settings.value[kind])===b.dataset[kind]));
    $('setting-lighting').value=this.app.settings.value.lighting||'evening';
    $('setting-mobile-layout').checked=this.app.settings.value.mobileLayout==='right';
    $('mobile-layout-description').textContent=this.app.settings.value.mobileLayout==='right'?'Joystick Right / Buttons Left':'Joystick Left / Buttons Right · Default';
    $('setting-hold-switch').checked=this.app.settings.value.holdAutoSwitch;
    $('home-venue').textContent='GRENOBLE FIELD · '+$('setting-lighting').value.toUpperCase()+' MATCH';
    $('graphics-note').textContent='Current quality: '+this.app.settings.value.graphics.toUpperCase();this.renderBindings();
  }
  renderBindings(){$('bindings').innerHTML=Object.entries(CONTROL_NAMES).map(([action,label])=>'<div class="binding-row"><span>'+label+'</span><button class="key-binding '+(this.app.controls.rebinding===action?'listening':'')+'" data-bind="'+action+'">'+(this.app.controls.rebinding===action?'PRESS KEY':e(keyLabel(this.app.settings.value.keys[action])))+'</button></div>').join('');}
  keyboardHint(){const keys=this.app.settings.value.keys;$('keyboard-hint').innerHTML=[['pass','PASS / SWITCH'],['shoot','SHOOT'],['skill','SKILL'],['sprint','SPRINT'],['goalie','GOALIE']].map(([k,v])=>'<span><kbd>'+e(keyLabel(keys[k]))+'</kbd>'+v+'</span>').join('');}
  pause(){this.app.controls.clear();$('pause-dialog').showModal();}
  resume(){this.closeAll();this.app.controls.clear();this.app.match.pause(false);}
  confirm(title,action){$('pause-dialog').close();$('confirm-title').textContent=title;this.confirmAction=action;$('confirm-dialog').showModal();}
  enterMatch(){
    this.closeAll();this.show('match');const m=this.app.match;
    $('hud-user').textContent=m.teams[0].name.toUpperCase();$('hud-cpu').textContent=m.teams[1].name.toUpperCase();this.keyboardHint();
    for(const [i,side] of ['user','cpu'].entries()){
      $('hud-'+side+'-logo').src=m.teams[i].logo;
      $('hud-'+side+'-logo').alt=m.teams[i].logoFallback?'Lantern Soccer League':m.teams[i].name+' badge';
      $('hud-'+side+'-logo').closest('.hud-team').style.setProperty('--team-color',m.teams[i].kit);
    }
    $('match-hud').dataset.rivalry=String(!!m.rivalry);$('match-hud').dataset.tournament=String(!!m.tournament);
    document.querySelector('.broadcast-mark b').textContent=m.rivalry?'RIVALRY MATCH':m.tournament?'INTER-MADRASAH':'LANTERN RUSH';
    $('intro-overlay').hidden=false;
  }
  phase(phase){if(phase==='halftime'||phase==='fulltime'){this.results();return;}if(phase==='home')return;if(this.screen!=='match')this.show('match');$('intro-overlay').hidden=phase!=='intro';}
  notice({title,subtitle,seconds}){
    const root=$('notice'),goal=title==='GOAL!',m=this.app.match;
    root.querySelector('strong').textContent=title;root.querySelector('span').textContent=subtitle;
    root.querySelector('.notice-kicker').textContent=m?.rivalry?'RIVALRY MATCH · '+m.rivalry.title.toUpperCase():m?.tournament?'INTER-MADRASAH · '+m.tournament.season:'LANTERN RUSH · MATCHDAY';
    root.dataset.kind=goal?'goal':title.includes('RED')?'red':title.includes('YELLOW')?'yellow':'match';
    $('notice-score').hidden=!goal;
    if(goal)$('notice-score').innerHTML='<img src="'+e(m.teams[0].logo)+'" alt=""><b>'+m.stats[0].goals+' <i>—</i> '+m.stats[1].goals+'</b><img src="'+e(m.teams[1].logo)+'" alt="">';
    root.hidden=false;this.noticeTime=seconds;
  }
  updateNotice(dt){if(this.noticeTime>0){this.noticeTime-=dt;if(this.noticeTime<=0)$('notice').hidden=true;}}
  subs(){this.returnToPause=$('pause-dialog').open;if(this.returnToPause)$('pause-dialog').close();this.out=this.in=null;$('sub-feedback').textContent='';this.renderSubs();$('subs-dialog').showModal();}
  renderSubs(){
    const m=this.app.match;
    $('subs-team-ovr').textContent=(teamOverall(m.teams[0])??'—')+' TEAM OVR · LSL Website';
    $('sub-out').innerHTML=m.active(0).map(p=>'<button class="sub-player '+(this.out===p.id?'selected':'')+'" data-player="'+e(p.id)+'"><span>'+e(playerLabel(p))+'</span><small>'+p.role+' · '+(p.data.overall??'—')+' OVR</small><small>'+e(p.data.playstyle?.label||'')+'</small></button>').join('');
    $('sub-in').innerHTML=m.benches[0].length?m.benches[0].map(p=>'<button class="sub-player '+(this.in===p.id?'selected':'')+'" data-player="'+e(p.id)+'"><span>'+e(playerLabel(p))+'</span><small>'+e(p.position)+' · '+(p.overall??'—')+' OVR</small><small>'+e(p.playstyle?.label||'')+'</small></button>').join(''):'<p class="muted-copy">All substitutes have been used.</p>';
    $('confirm-sub').disabled=!this.out||!this.in;
    if(m.pending.length)$('sub-feedback').textContent=m.pending.map(s=>playerLabel(s.out)+' → '+playerLabel(s.incoming)).join(' · ')+' · Next stoppage';
  }
  confirmSub(){
    try{const instant=['halftime','restart'].includes(this.app.match.phase);this.app.match.queueSubstitution(this.out,this.in);this.out=this.in=null;this.renderSubs();$('sub-feedback').textContent=instant?'Substitution complete.':'Substitution queued for the next stoppage.';}catch(error){$('sub-feedback').textContent=error.message;}
  }
  results(){
    const m=this.app.match,half=m.phase==='halftime';this.closeAll();this.show('stats-screen');
    $('result-title').textContent=half?'HALFTIME':'FULL TIME';
    $('result-kicker').textContent=half?'TIME TO REGROUP':m.stats[0].goals===m.stats[1].goals?'HONOURS EVEN':m.stats[0].goals>m.stats[1].goals?'VICTORY':'CPU WINS';
    $('result-season').textContent=this.app.settings.value.season+' · '+(m.rivalry?'RIVALRY MATCH · ':m.tournament?'INTER-MADRASAH · ':'')+m.settings.duration+' MIN MATCH';
    $('result-score').innerHTML='<div><span>'+e(m.teams[0].name)+'<small>YOU · '+(teamOverall(m.teams[0])??'—')+' OVR</small></span><img src="'+e(m.teams[0].logo)+'" alt=""></div><strong>'+m.stats[0].goals+' <i>—</i> '+m.stats[1].goals+'</strong><div><img src="'+e(m.teams[1].logo)+'" alt=""><span>'+e(m.teams[1].name)+'<small>CPU · '+(teamOverall(m.teams[1])??'—')+' OVR</small></span></div>';
    const potm=playerOfMatch([...m.players,...m.archive]);
    $('result-highlight').innerHTML=half?'<p class="halftime-copy">A new half. A new direction.<span>Make your changes. CPU takes the second-half kickoff.</span></p>':potm?'<div class="potm"><img src="'+e(m.teams[potm.team].logo)+'" alt=""><span><small>PLAYER OF THE MATCH</small><strong>'+e(playerLabel(potm))+'</strong><span>'+e(potm.role)+' · '+e(m.teams[potm.team].name)+'</span></span><b>'+(potm.data.overall??'—')+'<small>OVR</small></b></div>':'';
    $('stats-table').innerHTML=statRows(m).map(([label,a,b])=>{
      const va=parseFloat(a)||0,vb=parseFloat(b)||0,total=va+vb;
      return '<div class="stat-row"><b>'+a+'</b><span>'+label+'</span><b>'+b+'</b><div class="stat-bars" aria-hidden="true"><span><i style="width:'+(total?va/total*100:0)+'%"></i></span><span><i style="width:'+(total?vb/total*100:0)+'%"></i></span></div></div>';
    }).join('');
    $('goal-list').innerHTML=m.goalEvents.length?m.goalEvents.map(g=>'<div class="moment">⚽ '+e(playerLabel(g))+(g.ownGoal?' (OG)':'')+' <small>'+clockText(g.time)+' · '+e(m.teams[g.team].name)+(g.assist?' · Assist: '+e(playerLabel({name:g.assist,jersey:g.assistJersey})):'')+'</small></div>').join(''):'<p class="muted-copy">No goals yet.</p>';
    $('sub-list').innerHTML=m.subEvents.map(s=>'<div class="moment">↔ '+e(playerLabel({name:s.in,jersey:s.inJersey}))+'<small>Replaced '+e(playerLabel({name:s.out,jersey:s.outJersey}))+' · '+clockText(s.time)+'</small></div>').join('')||'No substitutions';
    $('result-actions').innerHTML=half?'<button data-result="subs" class="secondary">SUBSTITUTIONS</button><button data-result="continue" class="primary">CONTINUE →</button>':m.tournament?'<button data-result="tournament" class="primary">TOURNAMENT SCHEDULE →</button><button data-result="rematch" class="secondary">REMATCH</button><button data-result="home" class="secondary">HOME</button>':'<button data-result="rematch" class="primary">REMATCH ↗</button><button data-result="teams" class="secondary">CHANGE TEAMS</button><button data-result="home" class="secondary">HOME</button>';
  }
}
