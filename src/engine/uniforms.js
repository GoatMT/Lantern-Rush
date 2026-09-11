import * as T from '../../vendor/three.module.js';

export function shirtTexture(kit){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle=kit.primary;c.fillRect(0,0,128,256);
  if(kit.pattern==='gradient'){
    const fade=c.createLinearGradient(0,0,0,256);fade.addColorStop(0,kit.primary);fade.addColorStop(.28,kit.primary);fade.addColorStop(.76,kit.secondary);
    c.fillStyle=fade;c.fillRect(0,0,128,256);
  }
  if(kit.pattern==='stripe'){
    c.fillStyle=kit.secondary;for(const x of [0,64,128])c.fillRect(x-10,0,20,256);
  }
  if(kit.pattern==='sleeves'){
    c.fillStyle=kit.secondary;for(const x of [32,96])c.fillRect(x-7,0,14,256);
  }
  if(kit.pattern==='sash'){
    c.strokeStyle=kit.secondary;c.lineWidth=10;
    for(let i=-1;i<3;i++){c.beginPath();c.moveTo(i*64-18,220);c.bezierCurveTo(i*64+40,155,i*64-35,115,i*64+55,45);c.stroke();}
  }
  // Restrained fabric detail and shirt hem, without altering the player mesh size.
  c.fillStyle='#ffffff0a';for(let x=0;x<128;x+=8)c.fillRect(x,0,1,256);
  c.fillStyle=kit.trim;c.fillRect(0,246,128,6);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
export function numberColor(kit){
  const rgb=[1,3,5].map(i=>parseInt(kit.primary.slice(i,i+2),16));
  return kit.pattern==='gradient'||rgb.reduce((a,b)=>a+b,0)<490?'#fff9e8':'#172b42';
}
