/* FOXA offline app shell. The build replaces __FOXA_PRECACHE__ with the exact hashed assets. */
const VERSION="__FOXA_VERSION__";
const CACHE="foxa-offline-"+VERSION;
const PREFIX="/isys/";
const PRECACHE=__FOXA_PRECACHE__;
const SHELL=PREFIX;
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const results=await Promise.allSettled(PRECACHE.map(async path=>{const response=await fetch(path,{cache:"reload"});if(!response.ok||response.type==="opaque")throw new Error("Offline resource unavailable: "+path+" ("+response.status+")");await cache.put(path,response)}));
  // A missing noncritical image must never block installing the offline shell.
  const essential=PRECACHE.filter(path=>path==="/isys/"||path.endsWith(".html")||path.endsWith(".js")||path.endsWith(".css"));
  const missing=essential.filter(path=>!results.some((result,index)=>result.status==="fulfilled"&&PRECACHE[index]===path));
  if(missing.length)throw new Error("Essential offline assets missing: "+missing.join(", "));
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  // Keep the preceding complete shell as a fallback if a new release has a missing asset.
  const old=keys.filter(key=>key.startsWith("foxa-offline-")&&key!==CACHE).sort();
  await Promise.all([...old.slice(0,-1),...keys.filter(key=>key.startsWith("isys-shell-"))].map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(!url.pathname.startsWith(PREFIX))return;
 // Only cache the published app shell and static assets. Never store private API responses.
 if(req.mode==="navigate"){
  event.respondWith((async()=>{
   try{
    const response=await Promise.race([fetch(req),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Offline navigation timeout")),3500))]);
    if(response.ok){const cache=await caches.open(CACHE);await cache.put(SHELL,response.clone());}
    return response;
   }catch{
    return (await caches.match(SHELL))||(await caches.match(PREFIX+"index.html"))||Response.error();
   }
  })());return;
 }
 const isAsset=[".js",".css",".svg",".png",".jpg",".jpeg",".webp",".woff",".woff2",".ico",".webmanifest"].some(ext=>url.pathname.toLowerCase().endsWith(ext));
 if(!isAsset)return;
 event.respondWith((async()=>{
  const cached=await caches.match(req,{ignoreSearch:true});
  if(cached)return cached;
  try{
   const response=await fetch(req);
   if(response.ok&&response.type==="basic"){
    const cache=await caches.open(CACHE);
    await cache.put(req,response.clone());
   }
   return response;
  }catch{return Response.error();}
 })());
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
