export const DEFAULT_KEYS = {forward:'KeyW',left:'KeyA',back:'KeyS',right:'KeyD',sprint:'KeyP',pass:'KeyM',shoot:'KeyK',skill:'KeyO',curve:'ShiftLeft',goalie:'KeyG',pause:'Escape'};
export const CONTROL_NAMES = {forward:'Move forward',left:'Move left',back:'Move back',right:'Move right',sprint:'Sprint (hold)',pass:'Pass / switch outfield player',shoot:'Shoot (hold)',skill:'Dribble / skill',curve:'Curved shot (hold with Shoot)',goalie:'Switch goalkeeper / outfield',pause:'Pause'};
export function startingGraphics() {
  return typeof navigator==='undefined'?'medium':((navigator.hardwareConcurrency||4)<=4 || (typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches))?'low':'medium';
}
export function startingCamera(){return typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches?'mobile':'broadcast';}
export class Settings {
  constructor(storage) {
    if(!storage){try{storage=globalThis.localStorage;}catch{}}
    storage ||= {getItem:()=>null,setItem:()=>{}};
    this.storage=storage;
    let saved={};try{saved=JSON.parse(storage.getItem('lsl-lantern-rush-v1')||'{}')||{};}catch{}
    this.value={graphics:['low','medium','high'].includes(saved.graphics)?saved.graphics:startingGraphics(),
      camera:['low','medium','high','broadcast','mobile'].includes(saved.camera)?saved.camera:saved.camera?'medium':startingCamera(),
      lighting:['day','evening','night'].includes(saved.lighting)?saved.lighting:'evening',
      mobileLayout:saved.mobileLayout==='right'?'right':'left',holdAutoSwitch:typeof saved.holdAutoSwitch==='boolean'?saved.holdAutoSwitch:true,
      difficulty:['easy','normal','hard','insane'].includes(saved.difficulty)?saved.difficulty:'normal',
      duration:[3,4,5,6].includes(saved.duration)?saved.duration:6,season:String(saved.season||'2026'),
      userTeam:saved.userTeam||'leeward-lions',cpuTeam:saved.cpuTeam||'em-haulers-fc',controlsVersion:2,keys:{...DEFAULT_KEYS}};
    const assigned = new Set(),restored = new Set();
    for(const action of Object.keys(DEFAULT_KEYS)){
      const candidate=saved.keys?.[action];
      if(typeof candidate==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft|ShiftRight|Escape|Tab)$/.test(candidate)&&!assigned.has(candidate)){
        this.value.keys[action]=candidate;assigned.add(candidate);restored.add(action);
      }
    }
    // Preserve custom bindings when new actions need a key already in use.
    for(const action of Object.keys(DEFAULT_KEYS)){
      if(restored.has(action))continue;
      const free=[DEFAULT_KEYS[action],...Object.values(DEFAULT_KEYS),...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c=>'Key'+c)].find(code=>!assigned.has(code));
      this.value.keys[action]=free;assigned.add(free);
    }
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
