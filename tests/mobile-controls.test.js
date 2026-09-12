import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Controls } from '../src/input/controls.js';
import { MobileControls } from '../src/input/mobile.js';
import { Settings } from '../src/settings.js';
import { Match } from '../src/match/match.js';
import { createLineup } from '../src/data.js';
class Element extends EventTarget{
  constructor(action){super();this.dataset={touch:action};this.style={};this.captures=new Set();this.classes=new Set();this.classList={add:(...s)=>s.forEach(x=>this.classes.add(x)),remove:(...s)=>s.forEach(x=>this.classes.delete(x))};}
  setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
  getBoundingClientRect(){return {left:0,top:0,width:this.dataset.touch?56:112,height:this.dataset.touch?56:112};}
  pointer(type,id,x=28,y=28){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y});this.dispatchEvent(e);}
}
function setup(){
  const doc=new EventTarget(),win=new EventTarget(),buttons=['shoot','pass','skill','sprint'].map(x=>new Element(x)),root=new Element(),pad=new Element(),thumb=new Element();
  root.querySelectorAll=()=>buttons;doc.querySelector=s=>({'#touch-controls':root,'#joystick':pad,'#joystick-thumb':thumb})[s];
  globalThis.document=doc;globalThis.addEventListener=win.addEventListener.bind(win);
  const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},settings=new Settings(storage),controls=new Controls(settings),mobile=new MobileControls(controls);controls.enabled=true;
  return {controls,mobile,settings,storage,root,pad,buttons:Object.fromEntries(buttons.map(b=>[b.dataset.touch,b]))};
}
const teams=JSON.parse(fs.readFileSync(new URL('../data/2026.json',import.meta.url))).teams.slice(2,4).map(t=>({...t,lineup:createLineup(t.roster),bench:[]}));
test('left joystick is default; mirroring is immediate, saved and clears active fingers',()=>{
  const {controls,mobile,root,pad,settings,storage}=setup();assert.equal(root.dataset.layout,'left');assert.equal(settings.value.holdAutoSwitch,true);
  pad.pointer('pointerdown',8,90,40);settings.set('mobileLayout','right');mobile.applyLayout();assert.equal(root.dataset.layout,'right');assert.deepEqual(controls.joystick,{x:0,z:0});assert.equal(pad.captures.size,0);
  settings.set('holdAutoSwitch',false);const restored=new Settings(storage);assert.equal(restored.value.mobileLayout,'right');assert.equal(restored.value.holdAutoSwitch,false);
  assert.equal(new Settings({getItem:()=>'{"mobileLayout":"broken","holdAutoSwitch":"false"}',setItem:()=>{}}).value.mobileLayout,'left');
});
test('joystick, sprint and charge work simultaneously with proportional 360 degree movement',()=>{
  const {controls,pad,buttons}=setup();pad.pointer('pointerdown',1,70,42);const partial=controls.movement();assert(partial.intensity>0&&partial.intensity<1&&partial.x>0&&partial.z<0);
  buttons.sprint.pointer('pointerdown',2);buttons.shoot.pointer('pointerdown',3);assert(controls.held.has('shoot')&&controls.held.has('sprint'));
  pad.pointer('pointermove',1,120,-10);assert(Math.abs(controls.movement().intensity-1)<1e-9);
  buttons.shoot.pointer('pointerup',3);assert(controls.released.has('shoot')&&controls.held.has('sprint'));assert(controls.movement().intensity>.99);
  pad.pointer('pointerup',1);assert.equal(controls.movement().intensity,0);
});
test('two fingers and a keyboard can own the same action without early release',()=>{
  const {controls,buttons}=setup();controls.down('shoot','keyboard:KeyK');buttons.shoot.pointer('pointerdown',1);buttons.shoot.pointer('pointerdown',2);
  buttons.shoot.pointer('pointerup',1);assert(controls.held.has('shoot'));assert(!controls.released.has('shoot'));assert(buttons.shoot.classes.has('held'));
  buttons.shoot.pointer('pointerup',2);assert(controls.held.has('shoot'));controls.up('shoot','keyboard:KeyK');assert(controls.released.has('shoot'));
});
test('canceled charge and lost capture never fire; blur releases all captures',()=>{
  const {controls,buttons,pad}=setup();buttons.shoot.pointer('pointerdown',2);buttons.shoot.pointer('pointercancel',2);
  assert(controls.cancelled.has('shoot'));assert(!controls.released.has('shoot'));buttons.shoot.pointer('lostpointercapture',2);assert(!controls.released.has('shoot'));
  controls.frame();buttons.shoot.pointer('pointerdown',3);buttons.shoot.pointer('lostpointercapture',3);assert(controls.cancelled.has('shoot'));
  buttons.sprint.pointer('pointerdown',4);pad.pointer('pointerdown',5);controls.clear();assert.equal(controls.held.size,0);assert.equal(buttons.sprint.captures.size,0);assert.equal(pad.captures.size,0);
});
test('upward sprint gesture and upper-edge hold arm curves in either press order',()=>{
  for(const order of ['shoot-first','sprint-first']){
    const {controls,buttons}=setup();
    if(order==='shoot-first'){buttons.shoot.pointer('pointerdown',1);buttons.sprint.pointer('pointerdown',2);buttons.sprint.pointer('pointermove',2,28,5);}
    else{buttons.sprint.pointer('pointerdown',2,28,4);buttons.shoot.pointer('pointerdown',1);}
    assert(controls.held.has('curve'));assert(!controls.pressed.has('skill'));assert(buttons.sprint.classes.has('curve-armed'));
    buttons.sprint.pointer('pointerup',2);buttons.shoot.pointer('pointerup',1);assert(controls.released.has('curve')&&controls.released.has('shoot'));
  }
});
test('a single shooting thumb can swipe up; tiny drifts do not request a curve',()=>{
  const {controls,buttons}=setup();buttons.shoot.pointer('pointerdown',1);buttons.shoot.pointer('pointermove',1,28,15);assert(!controls.held.has('curve'));
  buttons.shoot.pointer('pointermove',1,28,-10);assert(controls.held.has('curve'));buttons.shoot.pointer('pointerup',1);assert(controls.released.has('shoot'));assert.equal(controls.held.size,0);
  controls.frame();buttons.sprint.pointer('pointerdown',2);buttons.sprint.pointer('pointermove',2,28,0);assert(controls.pressed.has('skill'));assert(!controls.held.has('curve'));
});
test('held mobile Switch follows nearest player only when enabled; a tap always works',()=>{
  for(const enabled of [true,false]){
    const {controls,buttons}=setup(),m=new Match(teams,{duration:3,difficulty:'normal',holdAutoSwitch:enabled},{random:()=>.5});
    m.phase='playing';m.restart=null;m.ball.reset(0,0);const [first,second]=m.active(0).filter(p=>p.role!=='GK');
    m.players.forEach((p,i)=>{p.x=35+i;p.z=28;});first.x=-5;first.z=0;second.x=10;second.z=0;
    buttons.pass.pointer('pointerdown',1);m.update(1/120,controls);controls.frame();assert.equal(m.controlled,first);
    m.ball.reset(10,2);first.x=-10;second.x=10;second.z=0;m.update(.24,controls);
    assert.equal(m.controlled,enabled?second:first);assert.equal(m.passHeldTime,0,'Touch switching must not arm a first-time pass');
    buttons.pass.pointer('pointerup',1);controls.frame();buttons.pass.pointer('pointerdown',2);m.update(.01,controls);assert.equal(m.controlled,second);
  }
});
test('holding mobile Switch while receiving keeps possession instead of auto-passing',()=>{
  const {controls,buttons}=setup(),m=new Match(teams,{duration:3,difficulty:'normal'},{random:()=>.5});m.phase='playing';m.restart=null;
  const p=m.players[5],from=m.players[3];m.controlled=p;m.players.forEach(o=>o.cooldown=5);p.cooldown=0;
  Object.assign(m.ball,{x:p.x,z:p.z,y:.32,vx:2,vz:0,lock:0,owner:null,pass:{team:0,from,target:p}});
  buttons.pass.pointer('pointerdown',1);m.passHeldTime=0;m.collisions(1/120);controls.frame();m.update(.25,controls);
  assert.equal(m.ball.owner,p);assert.equal(m.stats[0].passes,0);
});
