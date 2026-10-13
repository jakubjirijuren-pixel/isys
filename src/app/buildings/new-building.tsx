'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
export default function NewBuilding() {
  const router=useRouter();
  const [name,setName]=useState('');
  const [address,setAddress]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');
    try {
      const response=await fetch('/api/buildings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,address})});
      if(!response.ok)throw new Error('Objekt se nepodařilo uložit.');
      setName('');setAddress('');router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'Neznámá chyba');}
    finally{setBusy(false);}
  }
  return <form onSubmit={submit}><label>Název objektu<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} /></label><label>Adresa<input required maxLength={250} value={address} onChange={e=>setAddress(e.target.value)} /></label>{error&&<p role="alert">{error}</p>}<button disabled={busy}>{busy?'Ukládám…':'Přidat objekt'}</button></form>;
}
