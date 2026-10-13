import { prisma } from '@/lib/prisma';
import NewBuilding from './new-building';
export const dynamic = 'force-dynamic';
export default async function BuildingsPage() {
  const buildings = await prisma.building.findMany({orderBy:{createdAt:'desc'}});
  return <><h1>Evidence objektů</h1><div className="grid"><section className="card"><h2>Nový objekt</h2><NewBuilding /></section><section className="card"><h2>Spravované objekty ({buildings.length})</h2>{buildings.length===0?<p className="muted">Zatím nejsou evidovány žádné objekty.</p>:<ul>{buildings.map(b=><li key={b.id}><strong>{b.name}</strong> — {b.address}</li>)}</ul>}</section></div></>;
}
