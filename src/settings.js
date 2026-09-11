export const DEFAULT_KEYS = {forward:'KeyW',left:'KeyA',back:'KeyS',right:'KeyD',sprint:'KeyP',pass:'KeyM',shoot:'KeyK',skill:'KeyO',pause:'Escape'};
export const CONTROL_NAMES = {forward:'Move forward',left:'Move left',back:'Move back',right:'Move right',sprint:'Sprint (hold)',pass:'Pass / switch to closest player',shoot:'Shoot (hold) / tackle',skill:'Dribble / skill',pause:'Pause'};
export function startingGraphics() {
  return typeof navigator==='undefined'?'medium':((navigator.hardwareConcurrency||4)<=4 || (typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches))?'low':'medium';
}
export class Settings {
  constructor(storage) {
    if(!storage){try{storage=globalThis.localStorage;}catch{}}
    storage ||= {getItem:()=>null,setItem:()=>{}};
    this.storage=storage;
    let saved={};try{saved=JSON.parse(storage.getItem('lsl-lantern-rush-v1')||'{}')||{};}catch{}
    this.value={graphics:['low','medium','high'].includes(saved.graphics)?saved.graphics:startingGraphics(),
      camera:['low','medium','high','broadcast'].includes(saved.camera)?saved.camera:'medium',
      difficulty:['easy','normal','hard'].includes(saved.difficulty)?saved.difficulty:'normal',
      duration:[3,4,5,6].includes(saved.duration)?saved.duration:6,season:String(saved.season||'2026'),
      userTeam:saved.userTeam||'leeward-lions',cpuTeam:saved.cpuTeam||'em-haulers-fc',controlsVersion:2,keys:{...DEFAULT_KEYS}};
    const assigned = new Set();
    for(const action of Object.keys(DEFAULT_KEYS)){
      const candidate=saved.keys?.[action];
      if(typeof candidate==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft|ShiftRight|Escape|Tab)$/.test(candidate)&&!assigned.has(candidate)){
        this.value.keys[action]=candidate;assigned.add(candidate);
      }
    }
    if(new Set(Object.values(this.value.keys)).size!==Object.keys(DEFAULT_KEYS).length) this.value.keys={...DEFAULT_KEYS};
    if(saved.controlsVersion!==2&&saved.keys?.switch){
      // M replaces the old separate switch binding once; future custom binds still persist.
      const keys=this.value.keys,previous=keys.pass,other=Object.keys(keys).find(k=>k!=='pass'&&keys[k]==='KeyM');
      if(other)keys[other]=previous;
      keys.pass='KeyM';this.save();
    }
  }
  set(key,value){this.value[key]=value;this.save();}
  save(){try{this.storage.setItem('lsl-lantern-rush-v1',JSON.stringify(this.value));}catch{}}
  bind(action,code){
    if(!Object.hasOwn(DEFAULT_KEYS,action))return;
    const other=Object.keys(this.value.keys).find(k=>k!==action&&this.value.keys[k]===code);
    if(other)this.value.keys[other]=this.value.keys[action];
    this.value.keys[action]=code;this.save();
  }
}
export const keyLabel=code=>code.replace('Key','').replace('Digit','').replace('Arrow','').replace('Left','').replace('Right','');
