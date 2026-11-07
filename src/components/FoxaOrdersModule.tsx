'use client';
import React,{useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
/** FOXA Orders module. Requires NEXT_PUBLIC_FOXA_SUPABASE_URL and NEXT_PUBLIC_FOXA_SUPABASE_ANON_KEY.
 * This module creates DRAFT orders only. Dispatch is deliberately disabled until
 * secure cross-project credentials and server-side transport are configured.
 */
export default function OrdersModule(){
 const [db]=useState(()=>createClient(process.env.NEXT_PUBLIC_FOXA_SUPABASE_URL||'',process.env.NEXT_PUBLIC_FOXA_SUPABASE_ANON_KEY||''));
 const [suppliers,setSuppliers]=useState([]);
 const [orders,setOrders]=useState([]);
 const [form,setForm]=useState({supplier_connection_id:'',title:'',description:'',priority:'normal',requested_date:'',contact_name:''});
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [allowed,setAllowed]=useState(false);const [checking,setChecking]=useState(true);
 async function refresh(){const [s,o]=await Promise.all([db.from('foxa_supplier_directory').select('*').eq('enabled',true).order('supplier_name'),db.from('foxa_orders').select('*').order('created_at',{ascending:false})]);if(s.error||o.error)setError(s.error?.message||o.error?.message);setSuppliers(s.data||[]);setOrders(o.data||[])}
 useEffect(()=>{(async()=>{try{const {data,error}=await db.rpc('can_access_foxa_orders');if(error||data!==true){setAllowed(false);return}setAllowed(true);await refresh()}finally{setChecking(false)}})()},[]);
 async function save(e){e.preventDefault();setBusy(true);setError('');const supplier=suppliers.find(x=>x.supplier_connection_id===form.supplier_connection_id);if(!supplier){setError('Vyberte propojeného dodavatele.');setBusy(false);return}
 const {error}=await db.from('foxa_orders').insert({...form,supplier_name:supplier.supplier_name,order_number:'FOX-OBJ-'+new Date().getFullYear()+'-'+crypto.randomUUID().slice(0,8).toUpperCase(),requested_date:form.requested_date||null});
 if(error)setError(error.message);else{setForm({supplier_connection_id:'',title:'',description:'',priority:'normal',requested_date:'',contact_name:''});await refresh()}setBusy(false)}
 if(checking)return <p>Ověřuji oprávnění…</p>;if(!allowed)return null;async function dispatch(id:string){setBusy(true);setError('');const {data,error}=await db.functions.invoke('send-foxa-order',{body:{order_id:id}});if(error||data?.error)setError(data?.error||error?.message||'Odeslání se nezdařilo');else await refresh();setBusy(false)}return <section><h2>Objednávky dodavatelům</h2><p>Objednávky se nejprve uloží jako koncept. Odeslání je dostupné pouze oprávněným uživatelům a aktivním dodavatelům.</p>
 {error&&<p role="alert">{error}</p>}<form onSubmit={save}><label>Dodavatel<select required value={form.supplier_connection_id} onChange={e=>setForm({...form,supplier_connection_id:e.target.value})}><option value="">Vyberte organizaci</option>{suppliers.map(s=><option key={s.id} value={s.supplier_connection_id}>{s.supplier_name}</option>)}</select></label>
 <label>Název práce<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Popis<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
 <label>Priorita<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="normal">Běžná</option><option value="urgent">Urgentní</option><option value="emergency">Havárie</option></select></label>
 <label>Termín<input type="date" value={form.requested_date} onChange={e=>setForm({...form,requested_date:e.target.value})}/></label><label>Kontaktní osoba<input value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/></label><button disabled={busy||!suppliers.length}>Uložit koncept</button></form>
 <h3>Evidence objednávek</h3><ul>{orders.map(o=><li key={o.id}><strong>{o.order_number}</strong> · {o.title} · {o.supplier_name} · {o.status} {o.status==='draft'&&<button disabled={busy} onClick={()=>dispatch(o.id)}>Odeslat dodavateli</button>}</li>)}</ul></section>
}