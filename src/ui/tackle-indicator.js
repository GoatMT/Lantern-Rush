const LABELS={success:'TACKLE SUCCESS',miss:'SLIDE MISSED',foul:'TACKLE FOUL'};
export function ensureTackleIndicator(root){
  let element=root?.querySelector?.('.tackle-indicator');
  if(!element&&root){element=document.createElement('div');element.className='tackle-indicator';element.setAttribute('role','status');element.setAttribute('aria-live','polite');element.hidden=true;root.append(element);}
  return element;
}
export function renderTackleIndicator(element,feedback){
  if(!element)return;
  const visible=feedback&&feedback.time>0;
  if(!visible){element.hidden=true;return;}
  element.hidden=false;element.dataset.kind=feedback.kind||'success';element.textContent=LABELS[feedback.kind]||'TACKLE';
}
