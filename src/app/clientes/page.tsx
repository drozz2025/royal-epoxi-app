'use client';
import { useEffect, useState } from 'react';
import { createClient, listClients } from '@/lib/db';
import Layout from '@/components/Layout';

type Client = { id: string; name: string; company?: string; nif?: string; phone?: string; email?: string; address?: string; notes?: string };

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [nif, setNif] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const r = await listClients(); if (r.error) throw r.error; setClients((r.data || []) as Client[]); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const r = await createClient({ name, company: company || undefined, nif: nif || undefined, phone: phone || undefined, email: email || undefined, address: address || undefined, notes: notes || undefined });
      if (r.error) throw r.error;
      setName(''); setCompany(''); setNif(''); setPhone(''); setEmail(''); setAddress(''); setNotes(''); setOpen(false); load();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setSaving(false);
  }

  return (
    <Layout title="Clientes" subtitle="Gestão de clientes e histórico comercial."
      actions={<button className="btn btn-primary" onClick={() => { setOpen(true); setError(''); }}>+ Novo cliente</button>}>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Novo cliente</h3>
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nome *</label>
                  <input required className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Empresa</label>
                  <input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Nome da empresa" />
                </div>
                <div className="form-group">
                  <label className="form-label">NIF</label>
                  <input className="form-input" value={nif} onChange={e => setNif(e.target.value)} placeholder="123456789" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+351 9xx xxx xxx" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.pt" />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Morada</label>
                  <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, Nº, Localidade" />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Notas</label>
                  <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações internas..." style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : clients.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">👥</div>
          <h3>Nenhum cliente registado</h3>
          <p>Clique em &quot;+ Novo cliente&quot; para adicionar o primeiro.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead>
              <tr>
                <th>Nome</th><th>Empresa</th><th>NIF</th><th>Telefone</th><th>Email</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.company || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td>{c.nif || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td>{c.phone || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td>{c.email || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
