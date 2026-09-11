import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {staminaCapacity,teamOverall} from '../src/ratings.js';
import {Player} from '../src/match/player.js';
import {Match} from '../src/match/match.js';
import {Settings,DEFAULT_KEYS,CONTROL_NAMES} from '../src/settings.js';
import {createLineup} from '../src/data.js';
const player=(overall=75,team=0,slot=5)=>new Player({id:'p-'+overall,name:'Player',overall},team,slot,team===0?1:-1);
const data=JSON.parse(fs.readFileSync(new URL('../data/2026.json',import.meta.url)));
const teams=data.teams.slice(2,4).map(t=>{const lineup=createLineup(t.roster);return {...t,lineup,bench:t.roster.filter(p=>!lineup.some(l=>l.id===p.id))};});
const idle={held:new Set(),pressed:new Set(),released:new Set(),movement:()=>({x:0,z:0,intensity:0})};
const match=()=>{const m=new Match(teams,{duration:3,difficulty:'normal'},{random:()=>.51});m.resetFormation();m.phase='playing';return m;};
const exhaust=p=>{p.stamina=.01;p.move(1,0,1,.3,true);assert.equal(p.stamina,0);assert.equal(p.exhausted,true);};
test('OVR scales stamina from 70% through 85% to 100% for all teams and positions',()=>{
 for(const team of [0,1])for(const slot of [0,3,5])for(const [rating,cap] of [[60,.7],[74,.7],[75,.7],[87,.85],[99,1]]){
  const p=player(rating,team,slot);assert(Math.abs(p.maxStamina-cap)<1e-10);assert.equal(p.stamina,p.maxStamina);
  p.updateStamina(1000);assert.equal(p.stamina,p.maxStamina);
 }
 assert.equal(staminaCapacity(120),1);assert.equal(staminaCapacity(0),.7);
});
test('unexhausted players replenish slowly without exceeding their personal maximum',()=>{
 const p=player(75);p.stamina=.4;p.move(0,0,0,10);assert(Math.abs(p.stamina-.52)<1e-8);
 p.move(0,0,0,100);assert.equal(p.stamina,.7);
});
test('zero stamina disables sprint and stays locked during play or a pause',()=>{
 const p=player(99);exhaust(p);const x=p.x;p.move(1,0,1,.1,true);assert.equal(p.boosting,false);assert(p.x>x);
 p.move(0,0,0,30);assert.equal(p.stamina,0);
 const m=match(),a=m.controlled;exhaust(a);m.pause();m.update(30,idle);assert.equal(a.stamina,0);assert(a.exhausted);
 m.pause(false);m.update(1/120,idle);assert.equal(a.stamina,0);assert(a.exhausted);
});
test('all restart types unlock exhausted players without instantly refilling stamina',()=>{
 for(const type of ['KICK OFF','THROW-IN','CORNER','GOAL KICK','FREE KICK','PENALTY']){
  const m=match();m.benches[1]=[];for(const p of [m.players[3],m.players[10],m.players[0]])exhaust(p);
  m.beginRestart({type,team:0,x:type==='PENALTY'?48:0,z:0});
  for(const p of [m.players[3],m.players[10],m.players[0]]){assert.equal(p.exhausted,false);assert.equal(p.stamina,0);}
  m.update(.5,idle);assert(m.players[3].stamina>0&&m.players[3].stamina<.01);
 }
});
test('goals and halftime resume slow recovery; continuing the half gives no instant refill',()=>{
 const m=match(),p=m.players[3];exhaust(p);m.goal(1);assert(!p.exhausted);assert.equal(p.stamina,0);m.update(.5,idle);assert(p.stamina>0&&p.stamina<.02);
 const n=match(),q=n.players[3];exhaust(q);n.elapsed=89.999;n.update(1/120,idle);assert.equal(n.phase,'halftime');assert(!q.exhausted);assert.equal(q.stamina,0);
 n.update(5,idle);const recovered=q.stamina;assert(Math.abs(recovered-.06)<1e-8);n.continueHalf();assert.equal(q.stamina,recovered);assert(q.stamina<=q.maxStamina);
});
test('substitutes start fresh at their own capacity and update the current team OVR',()=>{
 const m=match(),p=m.players[5];exhaust(p);const incoming={...m.benches[0][0],overall:61};m.benches[0][0]=incoming;m.phase='halftime';
 m.queueSubstitution(p.id,incoming.id);assert.equal(p.maxStamina,.7);assert.equal(p.stamina,.7);assert(!p.exhausted);
 const expected=Math.max(60,Math.min(99,Math.round(m.active(0).reduce((sum,p)=>sum+p.data.overall,0)/7)));
 assert.equal(teamOverall(m.active(0)),expected);
});
test('team OVR uses the selected lineup ratings and is bounded between 60 and 99',()=>{
 assert.equal(teamOverall([{overall:1},{overall:2}]),60);assert.equal(teamOverall([{overall:120}]),99);
 assert.equal(teamOverall([{overall:80},{data:{overall:90}},{overall:99,sentOff:true}]),85);assert.equal(teamOverall([]),null);
 for(const year of [2024,2025,2026])for(const team of JSON.parse(fs.readFileSync(new URL('../data/'+year+'.json',import.meta.url))).teams){
  const value=teamOverall(createLineup(team.roster));assert(value>=60&&value<=99);
 }
});
test('legacy Q switching is removed and M is the sole pass/switch binding',()=>{
 let json=JSON.stringify({keys:{...DEFAULT_KEYS,pass:'KeyL',switch:'KeyQ'},difficulty:'hard',camera:'low',duration:4});
 const storage={getItem:()=>json,setItem:(_,v)=>json=v},s=new Settings(storage);
 assert.equal(s.value.keys.pass,'KeyM');assert(!Object.hasOwn(s.value.keys,'switch'));assert(!Object.values(s.value.keys).includes('KeyQ'));
 assert(!Object.hasOwn(CONTROL_NAMES,'switch'));assert.equal(s.value.difficulty,'hard');assert.equal(s.value.camera,'low');assert.equal(s.value.duration,4);
 s.bind('pass','KeyB');assert.equal(new Settings(storage).value.keys.pass,'KeyB');
});
test('touch switch and M choose the closest eligible outfield player',()=>{
 const m=match();m.ball.x=5;m.ball.z=2;m.controlled=m.players[4];const near=m.players[1];near.x=5.5;near.z=2;
 m.selectPlayer(true);assert.equal(m.controlled,near);
 m.controlled=m.players[4];m.update(1/120,{...idle,pressed:new Set(['pass'])});assert.equal(m.controlled,near);
});
