export class MobileControls {
  constructor(controls){
    this.controls=controls;this.touches=new Map();this.pointer=null;
    this.root=document.querySelector('#touch-controls');
    this.pad=document.querySelector('#joystick');this.thumb=document.querySelector('#joystick-thumb');
    addEventListener('keydown',()=>this.renderKeyboardThumb());
    addEventListener('keyup',()=>this.renderKeyboardThumb());
    for(const button of this.root.querySelectorAll('[data-touch]')){
      button.addEventListener('pointerdown',e=>{
        e.preventDefault();if(!controls.enabled||button.disabled||this.touches.has(e.pointerId))return;
        const touch={button,action:button.dataset.touch,source:'touch:'+e.pointerId,x:e.clientX,y:e.clientY,switching:button.dataset.mode==='switch',up:false,curve:false};
        this.touches.set(e.pointerId,touch);button.setPointerCapture(e.pointerId);controls.down(touch.action,touch.source);button.classList.add('held');
        // The upper edge supports holding upward without a long swipe.
        const rect=button.getBoundingClientRect();
        if(touch.action==='sprint'&&e.clientY<rect.top+rect.height*.25){touch.up=true;this.armCurve(touch);}
        if(touch.action==='shoot')for(const other of this.touches.values())if(other.action==='sprint'&&other.up)this.armCurve(other);
      });
      button.addEventListener('pointermove',e=>{
        const touch=this.touches.get(e.pointerId);if(!touch)return;e.preventDefault();
        if(touch.action==='pass'&&touch.switching&&!touch.goalie&&(Math.abs(e.clientY-touch.y)>=24||e.clientX-touch.x<=-24)){
          touch.goalie=true;controls.up('pass',touch.source,true);controls.down('goalie',touch.source);controls.up('goalie',touch.source);
        }
        if((touch.action==='sprint'||touch.action==='shoot')&&touch.y-e.clientY>=20){
          touch.up=true;
          if(controls.held.has('shoot'))this.armCurve(touch);
          else if(touch.action==='sprint'&&!touch.skill){controls.down('skill',touch.source);controls.up('skill',touch.source);touch.skill=true;}
        }
      });
      const end=(e,cancel=false)=>{
        const touch=this.touches.get(e.pointerId);if(!touch)return;e.preventDefault();this.touches.delete(e.pointerId);
        controls.up(touch.action,touch.source,cancel);if(touch.curve)controls.up('curve',touch.source,cancel);
        if(![...this.touches.values()].some(t=>t.button===button))button.classList.remove('held','curve-armed');
        if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);
      };
      button.addEventListener('pointerup',e=>end(e));
      button.addEventListener('pointercancel',e=>end(e,true));button.addEventListener('lostpointercapture',e=>end(e,true));
    }
    this.pad.addEventListener('pointerdown',e=>{e.preventDefault();if(!controls.enabled||this.pointer!==null)return;this.pointer=e.pointerId;this.pad.setPointerCapture(e.pointerId);this.move(e);});
    this.pad.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();this.move(e);}});
    const end=e=>{if(e.pointerId!==this.pointer)return;this.pointer=null;controls.joystick={x:0,z:0};this.renderKeyboardThumb();if(this.pad.hasPointerCapture(e.pointerId))this.pad.releasePointerCapture(e.pointerId);};
    this.pad.addEventListener('pointerup',end);this.pad.addEventListener('pointercancel',end);this.pad.addEventListener('lostpointercapture',end);
    document.addEventListener('controls-clear',()=>{
      const touches=[...this.touches.entries()],pointer=this.pointer;this.touches.clear();this.pointer=null;
      for(const [id,t] of touches){t.button.classList.remove('held','curve-armed');if(t.button.hasPointerCapture(id))t.button.releasePointerCapture(id);}
      if(pointer!==null&&this.pad.hasPointerCapture(pointer))this.pad.releasePointerCapture(pointer);
      this.renderKeyboardThumb();
    });
    this.applyLayout();
  }
  applyLayout(){this.controls.clear();this.root.dataset.layout=this.controls.settings.value.mobileLayout||'left';}
  armCurve(touch){
    if(!this.controls.held.has('shoot')||touch.curve)return;
    touch.curve=true;this.controls.down('curve',touch.source);touch.button.classList.add('curve-armed');
  }
  move(e){
    const rect=this.pad.getBoundingClientRect(),radius=rect.width*.36;
    let x=(e.clientX-rect.left-rect.width/2)/radius,z=(e.clientY-rect.top-rect.height/2)/radius;
    const len=Math.hypot(x,z),magnitude=Math.pow(Math.min(1,Math.max(0,(len-.08)/.92)),.9);
    if(len>0){x=x/len*magnitude;z=z/len*magnitude;}
    this.controls.joystick={x,z};this.renderThumb(x,z,radius);
  }
  renderThumb(x,z,radius){this.thumb.style.transform='translate(calc(-50% + '+x*radius+'px),calc(-50% + '+z*radius+'px))';}
  renderKeyboardThumb(){
    if(this.pointer!==null)return;
    const x=(this.controls.held.has('right')?1:0)-(this.controls.held.has('left')?1:0),z=(this.controls.held.has('back')?1:0)-(this.controls.held.has('forward')?1:0),length=Math.hypot(x,z);
    if(!length){this.thumb.style.transform='translate(-50%,-50%)';return;}
    const rect=this.pad.getBoundingClientRect(),radius=rect.width*.36,scale=length>1?1/length:1;this.renderThumb(x*scale,z*scale,radius);
  }
}
