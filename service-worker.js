// Keep game code and data fresh on static hosts while leaving third-party
// Firebase/WebRTC traffic outside this worker's scope.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  // Keep third-party Firebase/WebRTC/ad requests out of this worker. For
  // same-origin assets, resolve network failures instead of creating an
  // unhandled FetchEvent rejection in the console.
  event.respondWith(fetch(new Request(request,{cache:'no-store'})).catch(async()=>{
    const cached=await caches.match(request);
    return cached||new Response('Offline',{
      status:503,
      headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store'}
    });
  }));
});
