/* FOXA offline app shell. The build replaces __FOXA_PRECACHE__ with the exact hashed assets. */
const VERSION="__FOXA_VERSION__";
const CACHE="foxa-offline-"+VERSION;
const PREFIX="/isys/";
const PRECACHE=__FOXA_PRECACHE__;
const SHELL=PREFIX;
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(PRECACHE.map(path=>new Request(path,{cache:"reload"})));
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>(key.startsWith("foxa-offline-")||key.startsWith("isys-shell-"))&&key!==CACHE).map(key=>caches.delete(key)));
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
    const response=await fetch(req);
    if(response.ok){const cache=await caches.open(CACHE);await cache.put(SHELL,response.clone());}
    return response;
   }catch{
    return (await caches.match(SHELL))||(await caches.match(PREFIX+"index.html"))||Response.error();
   }
  })());return;
 }
 const isAsset=/\\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?|ico|webmanifest)$/i.test(url.pathname);
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
