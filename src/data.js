import { FORMATION } from './config.js';
import { SEASON_KITS,teamKit } from './kits.js';
export function createLineup(roster){
  const remaining=roster.map(p=>({...p}));
  const selectedSlots=FORMATION.map((slot,index)=>{
    const pattern=index===0?/goal|keeper/i:index<3?/defend/i:index<5?/midfield/i:/strik|forward|wing/i;
    const selected=remaining.findIndex(p=>pattern.test(p.position));
    return selected>=0?remaining.splice(selected,1)[0]:null;
  });
  return FORMATION.map((slot,index)=>{
    let player=selectedSlots[index];
    if(!player){let selected=remaining.findIndex(p=>/field/i.test(p.position));if(selected<0)selected=remaining.findIndex(p=>!/goal|keeper/i.test(p.position));if(selected<0)selected=0;player=remaining.splice(selected,1)[0];}
    if(!player)throw Error('A team needs at least seven verified players.');
    return {...player,role:slot.role,slot:index};
  });
}
export class LeagueData{
  async load(progress=()=>{}){
    const response=await fetch(new URL('../data/seasons.json',import.meta.url));
    if(!response.ok)throw Error('Season list could not be loaded.');
    this.seasons=await response.json();this.teams={};
    for(let i=0;i<this.seasons.length;i++){
      const season=this.seasons[i];
      const res=await fetch(new URL('../'+season.file,import.meta.url));
      if(!res.ok)throw Error('Roster unavailable: '+season.year);
      const payload=await res.json();
      this.teams[season.year]=payload.teams.filter(t=>t.roster?.length>=7).map(t=>{
        const lineup=createLineup(t.roster);
        const official=SEASON_KITS[season.year]?.[t.id];
        return {...t,logo:t.logo||'assets/lsl-logo.png',logoFallback:!t.logo,season:season.year,lineup,bench:t.roster.filter(p=>!lineup.some(s=>s.id===p.id)),kit:official?.primary||t.colors?.primary||null,uniform:official?teamKit(season.year,t.id):null};
      });
      progress((i+1)/this.seasons.length);
    }
  }
  get(year){return this.teams[year]||[];}
}
