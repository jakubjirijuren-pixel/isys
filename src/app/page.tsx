import Link from 'next/link';
export default function Home() {
  const modules = [{name:'Objekty',description:'Evidence spravovaných domů',href:'/buildings'},{name:'Kontroly',description:'Připravujeme',href:null},{name:'Klíče',description:'Připravujeme',href:null},{name:'Úkoly',description:'Připravujeme',href:null}];
  return <><h1>Vítejte v iSYS</h1><p className="muted">Interní systém pro správu bytových domů · vývojová verze</p><div className="grid">{modules.map(m=><div className="card" key={m.name}><h2>{m.name}</h2><p className="muted">{m.description}</p>{m.href&&<Link href={m.href}>Otevřít →</Link>}</div>)}</div></>;
}
