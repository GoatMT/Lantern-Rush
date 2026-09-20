import {Settings,DEFAULT_KEYS,CONTROL_NAMES,keyLabel} from './settings.js';
let dialog,settings,rebinding;
export async function openSettings(){
  settings=new Settings();
  if(!dialog){
    const response=await fetch(new URL('../index.html',import.meta.url));
    if(!response.ok)throw new Error('Settings template unavailable');
    dialog=new DOMParser().parseFromString(await response.text(),'text/html').getElementById('settings-dialog');
    if(!dialog)throw new Error('Settings template missing');
    dialog.classList.add('standalone-settings');document.body.append(dialog);
    dialog.querySelector('[data-settings-panel="account"]').innerHTML='<h3>Your account</h3><p>Manage your profile, photo and match history on the Account page.</p><a class="primary" href="./account.html">OPEN ACCOUNT ↗</a>';
    dialog.addEventListener('close',()=>{rebinding=null;});
    dialog.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.close){dialog.close();return;}
      if(b.dataset.tab){dialog.querySelectorAll('[data-settings-panel]').forEach(p=>p.hidden=p.dataset.settingsPanel!==b.dataset.tab);dialog.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t===b));}
      for(const kind of ['graphics','difficulty','duration','camera'])if(b.dataset[kind]){settings.set(kind,kind==='duration'?Number(b.dataset[kind]):b.dataset[kind]);render();}
      if(b.dataset.binding){rebinding=b.dataset.binding;b.textContent='PRESS KEY…';}
      if(b.id==='reset-bindings'){settings.set('keys',{...DEFAULT_KEYS});render();}
    });
    const fields={'setting-lighting':'lighting','setting-weather':'weather','setting-crowd-reactions':'crowdReactions','setting-minor-injuries':'minorInjuries','setting-mobile-layout':'mobileLayout','setting-hold-switch':'holdAutoSwitch'};
    dialog.addEventListener('change',e=>{const key=fields[e.target.id];if(key){settings.set(key,key==='mobileLayout'?(e.target.checked?'right':'left'):e.target.type==='checkbox'?e.target.checked:e.target.value);render();}});
    dialog.addEventListener('keydown',e=>{if(!rebinding)return;e.preventDefault();if(e.code==='Escape'){rebinding=null;render();return;}if(!/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft|ShiftRight|Tab)$/.test(e.code))return;settings.bind(rebinding,e.code);rebinding=null;render();});
  }
  render();if(!dialog.open)dialog.showModal();
}
function render(){
  for(const kind of ['graphics','difficulty','duration','camera'])dialog.querySelectorAll(`[data-${kind}]`).forEach(b=>b.classList.toggle('active',String(settings.value[kind])===b.dataset[kind]));
  for(const [id,key]of Object.entries({'setting-lighting':'lighting','setting-weather':'weather','setting-crowd-reactions':'crowdReactions','setting-minor-injuries':'minorInjuries','setting-hold-switch':'holdAutoSwitch'})){const el=dialog.querySelector('#'+id);if(el.type==='checkbox')el.checked=settings.value[key];else el.value=settings.value[key];}
  dialog.querySelector('#setting-mobile-layout').checked=settings.value.mobileLayout==='right';
  dialog.querySelector('#mobile-layout-description').textContent=settings.value.mobileLayout==='right'?'Joystick Right / Buttons Left':'Joystick Left / Buttons Right · Default';
  dialog.querySelector('#bindings').innerHTML=Object.entries(CONTROL_NAMES).map(([key,label])=>`<label class="binding-row"><span>${label}</span><button class="key-binding" type="button" data-binding="${key}" aria-label="Rebind ${label}">${keyLabel(settings.value.keys[key])}</button></label>`).join('');
}
