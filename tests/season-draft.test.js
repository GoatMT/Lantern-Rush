import test from 'node:test';
import assert from 'node:assert/strict';
import {SeasonMenu,draftPickError} from '../src/ui/season-mode.js';

test('fantasy draft final pick follows the actual goalkeeper/outfield balance',()=>{
  assert.equal(draftPickError(6,1,5,false),'');
  assert.equal(draftPickError(6,1,5,true),'Your lineup already has a goalkeeper.');
  assert.equal(draftPickError(6,0,6,false),'Your final pick must be a goalkeeper.');
  assert.equal(draftPickError(6,0,6,true),'');
  assert.equal(draftPickError(5,1,4,false),'');
  assert.equal(draftPickError(5,0,5,true),'');
  assert.equal(draftPickError(7,1,6,false),'Your seven-player lineup is already full.');
  const menu=new SeasonMenu({settings:{value:{season:'2026'}}});
  assert.equal(menu.isDraftKeeper({position:'Player',role:'Goalkeeper'}),true);
});

test('fantasy draft board lays out every club by round and marks the active pick',()=>{
  const teams=[{id:'cpu',name:'CPU Club',division:'SENIORS'},{id:'user',name:'Your Club',division:'SENIORS'}];
  const menu=new SeasonMenu({settings:{value:{season:'2026'}}});
  menu.state={draft:{picks:[{pickNumber:1,round:1,teamId:'cpu',playerName:'CPU Keeper',position:'Goalie',overall:84}]}};
  menu.teamId='user';
  menu.draftTeams=()=>teams;
  menu.draftPlayers=()=>[];
  menu.draftPool=()=>[{id:'available',name:'Available Player',position:'Forward',overall:77,originTeamName:'CPU Club'}];
  menu.draftComplete=()=>false;
  menu.draftOrder=()=>teams[1];
  menu.team=()=>teams[1];
  const markup=menu.draftMarkup();
  assert.match(markup,/THE DRAFT BOARD/);
  assert.match(markup,/CPU Club/);
  assert.match(markup,/Your Club/);
  assert.match(markup,/CPU Keeper/);
  assert.match(markup,/draft-board-avatar[^>]*>CK<\/span>/);
  assert.match(markup,/class="season-draft-matrix-cell pick-cell is-user is-open is-on-clock"/);
  assert.match(markup,/ON THE CLOCK/);
});

test('fantasy draft squad tells the player exactly which role remains',()=>{
  const user={id:'user',name:'Your Club',division:'SENIORS'};
  const menu=new SeasonMenu({settings:{value:{season:'2026'}}});
  menu.state={draft:{picks:[]}};
  menu.teamId='user';
  menu.draftTeams=()=>[user];
  menu.draftPool=()=>[];
  menu.draftComplete=()=>false;
  menu.draftOrder=()=>user;
  menu.team=()=>user;
  menu.draftPlayers=()=>Array.from({length:6},(_,index)=>({id:'p'+index,name:'Outfield '+index,position:'Forward',overall:70}));
  assert.match(menu.draftMarkup(),/GOALKEEPER REQUIRED/);
  menu.draftPlayers=()=>[{id:'gk',name:'Keeper',position:'Goalkeeper',overall:80},...Array.from({length:5},(_,index)=>({id:'p'+index,name:'Outfield '+index,position:'Forward',overall:70}))];
  assert.match(menu.draftMarkup(),/OUTFIELD · SELECT A PLAYER/);
});
