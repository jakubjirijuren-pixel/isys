import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const url=Deno.env.get("SUPABASE_URL")!;
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publicKey=Deno.env.get("VAPID_PUBLIC_KEY")!;
const privateKey=Deno.env.get("VAPID_PRIVATE_KEY")!;
const subject=Deno.env.get("VAPID_SUBJECT")!;
const secret=Deno.env.get("ISYS_WEBHOOK_SECRET")!;
const db=createClient(url,serviceKey,{auth:{persistSession:false}});
const cors={"access-control-allow-origin":"https://jakubjirijuren-pixel.github.io","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"authorization,apikey,content-type,x-client-info"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"content-type":"application/json"}});
webpush.setVapidDetails(subject,publicKey,privateKey);

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method==="GET")return json({publicKey});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 if(!secret||req.headers.get("x-isys-webhook-secret")!==secret)return json({error:"Unauthorized"},401);
 let payload;
 try{payload=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 if(payload.type!=="INSERT"||payload.table!=="notifications"||payload.schema!=="public")return json({error:"Unsupported event"},400);
 const record=payload.record;
 if(!record?.id||!record?.user_id)return json({error:"Missing notification"},400);
 // Load from database rather than trusting unverified webhook content.
 const {data:n,error:readError}=await db.from("notifications").select("id,user_id,title,body,module").eq("id",record.id).eq("user_id",record.user_id).maybeSingle();
 if(readError||!n)return json({error:"Notification not found"},404);
 const {data:subscriptions,error:subError}=await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id",n.user_id);
 if(subError)return json({error:"Subscriptions unavailable"},500);
 const body=JSON.stringify({title:n.title,body:n.body,module:n.module||"Přehled",notificationId:n.id,url:"/isys/"});
 let sent=0,expired=0,failed=0;
 for(const sub of subscriptions||[]){
  try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},body,{TTL:3600,urgency:"normal"});sent++}
  catch(e){const status=(e as {statusCode?:number}).statusCode;if(status===404||status===410){await db.from("push_subscriptions").delete().eq("id",sub.id);expired++}else{failed++;console.error("Web Push delivery failed",status||"unknown")}}
 }
 return json({sent,expired,failed});
});
