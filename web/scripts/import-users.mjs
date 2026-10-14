// iSYS bulk Supabase Auth import (Node.js 20+). Run only on trusted computer.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-users.mjs /path/to/isys_import_uctu.csv
// Never use service-role credentials in the browser or commit them to Git.
import {readFileSync} from "node:fs";
const [file]=process.argv.slice(2);
const url=process.env.SUPABASE_URL?.replace(/\/$/,"");
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!file||!url||!key){console.error("Missing CSV file, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");process.exit(1)}
const lines=readFileSync(file,"utf8").replace(/^\uFEFF/,"").trim().split(/\r?\n/);
if(lines.shift().trim()!=="email,password,role"){console.error("Invalid CSV header");process.exit(1)}
const entries=lines.filter(Boolean).map(line=>{const [email,password,role,...rest]=line.split(",");if(rest.length||!email||!password||role!=="technician")throw Error("Invalid CSV row");return {email:email.trim().toLowerCase(),password,role}});
if(new Set(entries.map(e=>e.email)).size!==entries.length)throw Error("Duplicate emails in CSV");
const headers={"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"};
async function api(path,method="GET",body){
 const res=await fetch(url+path,{method,headers,body:body?JSON.stringify(body):undefined});
 const text=await res.text();let data;try{data=JSON.parse(text)}catch{data={message:text}}
 if(!res.ok)throw Error((data?.msg||data?.message||data?.error||"HTTP "+res.status)+" ("+res.status+")");
 return data;
}
const existing=new Set();
for(let page=1;;page++){
 const result=await api("/auth/v1/admin/users?page="+page+"&per_page=1000");
 const users=result.users||[];users.forEach(u=>existing.add(u.email?.toLowerCase()));
 if(users.length<1000)break;
}
let created=0,skipped=0,failed=0;
for(const entry of entries){
 if(existing.has(entry.email)){console.log("SKIP existing:",entry.email);skipped++;continue}
 try{
  const response=await api("/auth/v1/admin/users","POST",{email:entry.email,password:entry.password,email_confirm:true});
  const id=response.user?.id||response.id;
  if(!id)throw Error("Auth API did not return a user id");
  created++;existing.add(entry.email);
  // Add role only if multi-role migration has been applied.
  try{await api("/rest/v1/user_roles?on_conflict=user_id,role","POST",{user_id:id,role:entry.role})}
  catch(e){console.warn("ROLE NOT ASSIGNED:",entry.email,e.message)}
  console.log("CREATED:",entry.email);
 }catch(e){failed++;console.error("FAILED:",entry.email,e.message)}
}
console.log(JSON.stringify({created,skipped,failed}));
if(failed)process.exitCode=1;
