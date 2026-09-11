import { clamp } from '../config.js';
export class Controls {
  constructor(settings){
    this.settings=settings;this.held=new Set();this.pressed=new Set();this.released=new Set();this.joystick={x:0,z:0};this.enabled=false;
    this.rebinding=null;
    addEventListener('keydown',e=>{
      if(this.rebinding){
        if(/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft|ShiftRight|Escape|Tab)$/.test(e.code)){
          e.preventDefault();this.settings.bind(this.rebinding,e.code);this.rebinding=null;document.dispatchEvent(new Event('bindings-changed'));
        }return;
      }
      if(!this.enabled||/^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName))return;
      const action=Object.keys(this.settings.value.keys).find(k=>this.settings.value.keys[k]===e.code);
      if(action){e.preventDefault();if(!e.repeat)this.down(action);}
    });
    addEventListener('keyup',e=>{const action=Object.keys(this.settings.value.keys).find(k=>this.settings.value.keys[k]===e.code);if(action){if(this.enabled)e.preventDefault();this.up(action);}});
    addEventListener('blur',()=>{this.clear();document.dispatchEvent(new Event('game-blur'));});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();document.dispatchEvent(new Event('game-blur'));}});
  }
  down(action){if(!this.held.has(action))this.pressed.add(action);this.held.add(action);}
  up(action){if(this.held.has(action))this.released.add(action);this.held.delete(action);}
  movement(){let x=(this.held.has('right')?1:0)-(this.held.has('left')?1:0)+this.joystick.x;
    let z=(this.held.has('back')?1:0)-(this.held.has('forward')?1:0)+this.joystick.z;
    const n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}return {x,z,intensity:clamp(n,0,1)};}
  frame(){this.pressed.clear();this.released.clear();}
  clear(){this.held.clear();this.pressed.clear();this.released.clear();this.joystick={x:0,z:0};document.dispatchEvent(new Event('controls-clear'));}
}

