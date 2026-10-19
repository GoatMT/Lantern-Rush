// Keep game code and data fresh on static hosts while leaving third-party
// Firebase/WebRTC traffic outside this worker's scope.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(new Request(request,{cache:'no-store'})));
});
