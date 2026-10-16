const CACHE="isys-shell-v3";
const SHELL=["/isys/icon.svg","/isys/icon-maskable.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("isys-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
 const req=event.request;if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);if(!url.pathname.startsWith("/isys/"))return;
 // Never cache the HTML entry point or versioned JS/CSS chunks: stale HTML
 // can reference hashed assets that no longer exist after a GitHub Pages deploy.
 if(req.mode==="navigate"||url.pathname.endsWith(".html")||url.pathname.endsWith(".js")||url.pathname.endsWith(".css")){
  event.respondWith(fetch(req,{cache:"no-store"}));return;
 }
 event.respondWith(fetch(req).then(response=>{if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}return response}).catch(()=>caches.match(req)));
});
self.addEventListener("push",event=>{
 let data={};try{data=event.data?.json()||{}}catch{data={title:"FOXA",body:event.data?.text()||"Nové oznámení"}}
 const title=String(data.title||"FOXA");
 event.waitUntil(self.registration.showNotification(title,{body:String(data.body||""),icon:"/isys/icon.svg",badge:"/isys/icon.svg",tag:String(data.notificationId||"isys"),data:{url:"/isys/",module:String(data.module||"Přehled")}}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  const app=windows.find(client=>new URL(client.url).pathname.startsWith("/isys/"));
  if(app){await app.focus();app.postMessage({type:"isys-push-open",module:event.notification.data?.module||"Přehled"});return}
  await self.clients.openWindow("/isys/");
 })());
});
