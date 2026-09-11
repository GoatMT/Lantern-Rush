export class MobileControls{
  constructor(controls){
    this.controls=controls;
    for(const button of document.querySelectorAll('[data-touch]')){
      const action=button.dataset.touch;
      button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);controls.down(action);button.classList.add('held');});
      const release=e=>{e.preventDefault();controls.up(action);button.classList.remove('held');};
      button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    }
    this.pad=document.querySelector('#joystick');this.thumb=document.querySelector('#joystick-thumb');this.pointer=null;
    this.pad.addEventListener('pointerdown',e=>{e.preventDefault();if(this.pointer!==null)return;this.pointer=e.pointerId;this.pad.setPointerCapture(e.pointerId);this.move(e);});
    this.pad.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer)this.move(e);});
    const end=e=>{if(e.pointerId!==this.pointer)return;this.pointer=null;controls.joystick={x:0,z:0};this.thumb.style.transform='translate(-50%,-50%)';};
    this.pad.addEventListener('pointerup',end);this.pad.addEventListener('pointercancel',end);this.pad.addEventListener('lostpointercapture',end);
    document.addEventListener('controls-clear',()=>{this.pointer=null;this.thumb.style.transform='translate(-50%,-50%)';document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));});
  }
  move(e){
    const rect=this.pad.getBoundingClientRect(),radius=rect.width*.36;
    let x=(e.clientX-rect.left-rect.width/2)/radius,z=(e.clientY-rect.top-rect.height/2)/radius;
    const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
    this.controls.joystick={x,z};this.thumb.style.transform='translate(calc(-50% + '+x*radius+'px),calc(-50% + '+z*radius+'px))';
  }
}

