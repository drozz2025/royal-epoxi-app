'use client';
import { useEffect, useState } from 'react';
import { listProfiles } from '@/lib/db';
import Layout from '@/components/Layout';

type Profile = { id: string; full_name?: string; email?: string; role: string; created_at: string };

const roleBadge: Record<string, string> = { ADMIN: 'badge-red', ORCAMENTISTA: 'badge-blue', OBRA: 'badge-yellow', FINANCEIRO: 'badge-green', FUNCIONARIO: 'badge-gray' };
const roleLabel: Record<string, string> = { ADMIN: 'Administrador', ORCAMENTISTA: 'Orçamentista', OBRA: 'Obra', FINANCEIRO: 'Financeiro', FUNCIONARIO: 'Funcionário' };

export default function Funcionarios() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProfiles().then(r => { if (r.error) setError(String(r.error)); else setProfiles((r.data || []) as Profile[]); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Equipa" subtitle="Utilizadores registados no sistema.">
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="alert alert-warning" style={{ marginBottom: 20 }}>
        ℹ️ Os utilizadores são adicionados através do painel do <strong>Supabase Auth</strong>. Após o primeiro login, o perfil é criado automaticamente e pode ser editado aqui.
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : profiles.length === 0 ? (
        <div className="empty-state"><div className="emoji">👤</div><h3>Nenhum utilizador registado</h3><p>Os utilizadores aparecem aqui após o primeiro login.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="pro">
            <thead><tr><th>Nome</th><th>Email</th><th>Função</th><th>Desde</th></tr></thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.full_name || '—'}</td>
                  <td style={{ color: '#6b7280' }}>{p.email || '—'}</td>
                  <td><span className={`badge ${roleBadge[p.role] || 'badge-gray'}`}>{roleLabel[p.role] || p.role}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString('pt-PT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
