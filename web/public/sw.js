/* FOXA offline app shell. The build replaces __FOXA_PRECACHE__ with the exact hashed assets. */
const VERSION="__FOXA_VERSION__";
const CACHE="foxa-offline-"+VERSION;
const PREFIX="/isys/";
const PRECACHE=__FOXA_PRECACHE__;
const SHELL=PREFIX;
const SHELL_HTML=PREFIX+"index.html";
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Install the navigation shell first; optional images must not prevent activation.
  const shell=await fetch(SHELL,{cache:"reload",redirect:"follow"});
  if(!shell.ok)throw new Error("FOXA offline shell HTTP "+shell.status);
  await cache.put(SHELL,shell.clone());
  await cache.put(SHELL_HTML,shell.clone());
  await Promise.allSettled(PRECACHE.filter(path=>path!==SHELL&&path!==SHELL_HTML).map(async path=>{
   const response=await fetch(path,{cache:"reload"});
   if(response.ok&&response.type!=="opaque")await cache.put(path,response);
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  // Preserve older caches: Android may still have an earlier app shell open.
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(PREFIX))return;
 if(req.mode==="navigate"){
  event.respondWith((async()=>{
   const cached=(await caches.match(SHELL))||(await caches.match(SHELL_HTML));
   if(cached){
    // Navigation must be immediate offline; refresh in background when available.
    if(self.navigator.onLine!==false)event.waitUntil(fetch(req).then(async response=>{
     if(response.ok){const cache=await caches.open(CACHE);await cache.put(SHELL,response.clone());}
    }).catch(()=>{}));
    return cached;
   }
   try{
    const response=await fetch(req);
    if(response.ok){const cache=await caches.open(CACHE);await cache.put(SHELL,response.clone());}
    return response;
   }catch{
    return new Response("<!doctype html><html lang='cs'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>FOXA offline</title><body style='font:16px sans-serif;background:#0c2032;color:white;padding:25px'><h1>FOXA</h1><p>Offline verze zatím není připravena. Připojte se jednou k internetu a otevřete aplikaci.</p></body></html>",{headers:{"Content-Type":"text/html; charset=utf-8"}});
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
   if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone());}
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
