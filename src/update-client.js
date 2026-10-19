// Service-worker network-first updates remove the need for a cache-bypassing
// hard refresh. Defer an automatic reload while a match or lineup is active.
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){
  let updatePending=false,reloading=false;
  const isH2H=location.pathname.endsWith('/live-h2h.html');
  const safeToReload=()=>{
    if(isH2H)return false;
    if(document.querySelector('dialog[open]'))return false;
    if(!document.body?.hasAttribute('data-game-shell'))return true;
    return document.body.dataset.screen==='home'&&!document.querySelector('.is-open');
  };
  const applyUpdate=()=>{
    if(updatePending&&!reloading&&safeToReload()){
      reloading=true;
      location.reload();
    }
  };
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    updatePending=true;
    applyUpdate();
  });
  new MutationObserver(applyUpdate).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-screen']});
  document.addEventListener('close',applyUpdate,true);
  navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'})
    .then(registration=>registration.update())
    .catch(error=>console.warn('Lantern Rush update check unavailable:',error));
}
