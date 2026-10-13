import { useState } from 'react';
import { Building2, ClipboardCheck, KeyRound, ListTodo, LayoutDashboard, ShieldAlert } from 'lucide-react';
const modules = [
  { id: 'dashboard', label: 'Přehled', icon: LayoutDashboard },
  { id: 'buildings', label: 'Objekty', icon: Building2 },
  { id: 'inspections', label: 'Kontroly', icon: ClipboardCheck },
  { id: 'keys', label: 'Klíče', icon: KeyRound },
  { id: 'tasks', label: 'Úkoly', icon: ListTodo },
] as const;
type Section = typeof modules[number]['id'];
export default function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const active = modules.find(m => m.id === section)!;
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-icon">i</span><div><strong>iSYS</strong><small>Správa bytových domů</small></div></div><nav aria-label="Hlavní navigace">{modules.map(m => <button key={m.id} className={section === m.id ? 'nav-item active' : 'nav-item'} onClick={() => setSection(m.id)}><m.icon size={19}/>{m.label}</button>)}</nav><div className="sidebar-footer">Desktop · Vývojová verze 0.1</div></aside>
    <main className="main"><header className="topbar"><div><span className="eyebrow">INFORMAČNÍ SYSTÉM TECHNICKÉ SPRÁVY</span><h1>{active.label}</h1></div><span className="pill">Lokální ukázka</span></header>
    {section === 'dashboard' ? <><p className="lead">Vítejte v desktopové aplikaci iSYS. Zde bude přehled spravovaných objektů, kontrol a úkolů.</p><div className="cards">{modules.filter(m=>m.id!=='dashboard').map(m=><button className="card" key={m.id} onClick={()=>setSection(m.id)}><m.icon size={28}/><strong>{m.label}</strong><span>Otevřít modul →</span></button>)}</div></> : <div className="placeholder"><active.icon size={38}/><h2>{active.label}</h2><p>Modul připravujeme. Připojení k zabezpečenému API doplníme v další fázi.</p><button onClick={()=>setSection('dashboard')}>Zpět na přehled</button></div>}
    <div className="notice"><ShieldAlert size={18}/><span>Prototyp bez přihlášení a připojení k databázi. Nepoužívejte skutečná data družstva.</span></div></main></div>;
}
