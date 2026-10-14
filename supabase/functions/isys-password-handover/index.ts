// Deploy as Supabase Edge Function "isys-password-handover".
// Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (Supabase managed secrets).
import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 const allowedOrigin="https://jakubjirijuren-pixel.github.io";
 const cors={"Access-Control-Allow-Origin":allowedOrigin,"Access-Control-Allow-Headers":req.headers.get("access-control-request-headers")||"authorization,apikey,content-type,x-client-info,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Cache-Control":"no-store"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST"||origin!==allowedOrigin)return new Response("Forbidden",{status:403,headers:cors});
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!token)return new Response("Unauthorized",{status:401,headers:cors});
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const client=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}}});
 const {data:{user},error:authError}=await client.auth.getUser(token);
 if(authError||!user)return new Response("Unauthorized",{status:401,headers:cors});
 const admin=createClient(url,service);
 const {data:adminRole,error:roleError}=await admin.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();
 if(roleError||!adminRole)return new Response("Forbidden",{status:403,headers:cors});
 let targetId;try{({user_id:targetId}=await req.json())}catch{return new Response("Invalid request",{status:400,headers:cors})}
 if(typeof targetId!=="string"||!/^[0-9a-f-]{36}$/i.test(targetId))return new Response("Invalid user",{status:400,headers:cors});
 const {data:target,error:targetError}=await admin.auth.admin.getUserById(targetId);
 if(targetError||!target?.user?.email)return new Response("User not found",{status:404,headers:cors});
 const {data,error}=await admin.auth.admin.generateLink({type:"recovery",email:target.user.email,options:{redirectTo:allowedOrigin+"/isys/"}});
 if(error||!data?.properties?.action_link)return new Response("Unable to generate reset link",{status:500,headers:cors});
 return Response.json({email:target.user.email,display_name:target.user.user_metadata?.display_name||"",link:data.properties.action_link},{headers:cors});
});
