import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyRoomAction,personalReport} from '../functions/policy.js';
import {LiveSimulation,replayTrace,buildSquad,idlePacket} from '../src/h2h/simulation.js';
import {captureMatch} from '../src/match-history.js';
import {snapshot,SnapshotView} from '../src/h2h/snapshots.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../functions/catalog.json',import.meta.url),'utf8'));
const now=100000,raw=catalog['2026'],choices={host:{team:raw[0].id,formation:'2-2-2',lineup:raw[0].lineup.map(p=>p.id)},guest:{team:raw[1].id,formation:'3-2-1',lineup:raw[1].lineup.map(p=>p.id)}};
const room=()=>({code:'LR-123456',host:'host',guest:null,members:['host'],names:{host:'MT'},options:{season:'2026',duration:1,difficulty:'normal'},choices:{},ready:{},requests:{},status:'OPEN',expiresAt:now+7200000,score:[0,0],elapsed:0,epoch:0});
const action=(r,id,data)=>applyRoomAction(r,id,id,data,catalog,now);
const teams=()=>raw.slice(0,2).map((t,i)=>buildSquad(t,choices[i?'guest':'host']));
test('join approval is host-only and every closed status refuses new requests',()=>{
 let r=action(room(),'guest',{action:'request'});assert.equal(r.guest,null);assert.throws(()=>action(r,'guest',{action:'accept',uid:'guest'}),/host/);r=action(r,'host',{action:'accept',uid:'guest'});assert.deepEqual(r.members,['host','guest']);assert.equal(r.status,'FULL');
 for(const status of ['LOCKED','FULL','STARTING','LIVE','CLOSE TO END','FULL TIME'])assert.throws(()=>action({...room(),status},'intruder',{action:'request'}),/not accepting/);
});
test('room lock, independent lineups and both-ready start enforce their invariants',()=>{
 let r=action(room(),'host',{action:'lock'});assert.equal(r.status,'LOCKED');assert.throws(()=>action(r,'guest',{action:'unlock'}));r=action(r,'host',{action:'unlock'});r=action(r,'guest',{action:'request'});r=action(r,'host',{action:'accept',uid:'guest'});
 for(const uid of ['host','guest'])r=action(r,uid,{action:'choose',...choices[uid]});
 assert.throws(()=>action(r,'host',{action:'start'}),/Both/);r=action(r,'host',{action:'ready',ready:true});assert.throws(()=>action(r,'host',{action:'start'}));r=action(r,'guest',{action:'ready',ready:true});r=action(r,'host',{action:'start'});assert.equal(r.status,'STARTING');assert.throws(()=>action(r,'guest',{action:'choose',...choices.guest}));
});
test('two human teams move independently and guest can pass and take a restart',()=>{
 const sim=new LiveSimulation(teams(),{duration:1,difficulty:'normal'},55),m=sim.match;m.skipIntro();m.phaseTime=10;
 sim.input(0,{...idlePacket(),pressed:['pass']});sim.step();for(let n=0;n<120;n++)sim.step();
 const p=m.humanSeats[1].controlled,start=p.z;sim.input(1,{...idlePacket(),z:1});for(let n=0;n<30;n++)sim.step();assert.ok(p.z>start+.01);
 m.beginRestart({type:'FREE KICK',team:1,x:5,z:0});m.phaseTime=100;sim.input(1,{...idlePacket(),pressed:['pass']});sim.step();for(let n=0;n<120;n++)sim.step();assert.ok(m.stats[1].passes>0);assert.equal(m.phase,'playing');assert.ok(m.humanSeats[1].controlled.team===1);
});
test('full match input replay produces identical stats and snapshots on the server',()=>{
 const sim=new LiveSimulation(teams(),{duration:1,difficulty:'normal'},872),trace=[];
 const command=(side,c)=>{sim.command(side,c);trace.push({t:sim.tick,side,command:c});};command(0,{type:'skipIntro'});
 for(let n=0;n<50000&&sim.match.phase!=='fulltime';n++){
  if(sim.match.phase==='halftime'){command(0,{type:'continue'});command(1,{type:'continue'});}
  if(sim.match.phase==='goal'&&sim.match.replayActive)command(1,{type:'skipReplay'});
  if(sim.tick%60===0)for(const side of [0,1]){const input={...idlePacket(),x:side?-1:1,z:Math.sin(n*.03)*.5,held:['sprint'],pressed:['pass']};sim.input(side,input);trace.push({t:sim.tick,side,input});}
  sim.step();
 }
 assert.equal(sim.match.phase,'fulltime');assert.equal(sim.match.elapsed,60);const verified=replayTrace(teams(),{duration:1,difficulty:'normal'},872,trace,sim.tick);assert.deepEqual(verified.stats,sim.match.stats);assert.deepEqual(snapshot(verified,sim.tick),snapshot(sim.match,sim.tick));assert.throws(()=>replayTrace(teams(),{duration:1},872,trace,20));
});
test('both history records name the actual opponent and mirror team-indexed fields',()=>{
 const m=new LiveSimulation(teams(),{duration:1},1).match,r={...room(),members:['host','guest'],names:{host:'MT',guest:'Ahmed'},startedAt:now};m.stats[0].goals=4;m.stats[1].goals=3;m.goalEvents=[{team:0,name:'Player',time:5}];
 const captured=captureMatch(m),a=personalReport(captured,r,0,now),b=personalReport(captured,r,1,now);assert.equal(a.opponent.accountName,'Ahmed');assert.equal(b.accountName,'Ahmed');assert.deepEqual(a.score,[4,3]);assert.deepEqual(b.score,[3,4]);assert.equal(b.goals[0].team,1);assert.equal(b.startingLineups[0][0].team,0);assert.equal(a.mode,'h2h');assert.equal(b.verified,true);
});

test('wire snapshots survive JSON encoding and update the guest, including referee signals',()=>{
 const host=new LiveSimulation(teams(),{duration:1},33),guest=new LiveSimulation(teams(),{duration:1},33);
 host.match.skipIntro();host.match.ball.x=12;host.match.referee.animate('card',3);host.match.moment={type:'card',player:host.match.referee,time:3};
 const wire=JSON.parse(JSON.stringify(snapshot(host.match,1))),view=new SnapshotView(guest.match,1);
 view.push(wire);view.update();assert.equal(guest.match.ball.x,12);assert.equal(guest.match.controlled.team,1);assert.equal(guest.match.referee.action.name,'card');assert.equal(guest.match.moment.player,guest.match.referee);
});

