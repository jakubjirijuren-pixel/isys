// Deploy as Edge Function "isys-send-password-pdf" with Verify JWT disabled at gateway.
// Authorization is enforced below using the caller's Supabase Auth access token.
// Configure RESEND_API_KEY and ISYS_MAIL_FROM in Supabase Edge Function secrets.
import { createClient } from "npm:@supabase/supabase-js@2";
const allowedOrigin="https://jakubjirijuren-pixel.github.io";
Deno.serve(async(req)=>{
 const cors={"Access-Control-Allow-Origin":allowedOrigin,"Access-Control-Allow-Headers":req.headers.get("access-control-request-headers")||"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Cache-Control":"no-store"};
 const respond=(message:string,status:number)=>Response.json({error:message},{status,headers:cors});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST"||req.headers.get("origin")!==allowedOrigin)return respond("Forbidden",403);
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!token)return respond("Unauthorized",401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return respond("Server configuration missing",500);
 const caller=createClient(url,anon);
 const {data:{user},error:authError}=await caller.auth.getUser(token);
 if(authError||!user)return respond("Unauthorized",401);
 const admin=createClient(url,service);
 const {data:role,error:roleError}=await admin.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();
 if(roleError||!role)return respond("Forbidden",403);
 let payload:unknown;try{payload=await req.json()}catch{return respond("Invalid JSON",400)}
 if(!payload||typeof payload!=="object")return respond("Invalid payload",400);
 const {user_id,pdf_base64,filename}=payload as Record<string,unknown>;
 if(typeof user_id!=="string"||!/^[0-9a-f-]{36}$/i.test(user_id))return respond("Invalid user",400);
 if(typeof pdf_base64!=="string"||pdf_base64.length>9_000_000||pdf_base64.length<100||!/^[A-Za-z0-9+/]+={0,2}$/.test(pdf_base64))return respond("Invalid PDF",400);
 if(typeof filename!=="string"||filename.length>160||!/^[a-zA-Z0-9._-]+\.pdf$/.test(filename))return respond("Invalid filename",400);
 const {data:target,error:targetError}=await admin.auth.admin.getUserById(user_id);
 if(targetError||!target?.user?.email)return respond("User not found",404);
 const apiKey=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("ISYS_MAIL_FROM");
 if(!apiKey||!from)return respond("Email service not configured",503);
 const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({
  from,to:[target.user.email],subject:"FOXA – nastavení přístupového hesla",
  text:"Dobrý den,\n\nv příloze naleznete osobní dokument s QR kódem a odkazem pro nastavení hesla k účtu FOXA. Odkaz je časově omezený a je určen pouze Vám.\n\nS pozdravem\nFOXA",
  attachments:[{filename,content:pdf_base64}]
 })});
 if(!mail.ok){const details=await mail.text();console.error("Resend failed",mail.status,details);return respond("Email delivery failed",502)}
 return Response.json({sent:true},{headers:cors});
});
