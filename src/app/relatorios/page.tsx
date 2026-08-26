'use client';
import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/lib/db';
import Layout from '@/components/Layout';

type Stats = { activeProjects: number; totalInvoiced: number; totalProfit: number; pendingAmount: number; cashBalance: number };

export default function Relatorios() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then(s => { if (s.error) setError(String(s.error)); else setStats(s); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `€${Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
  const margin = stats && stats.totalInvoiced > 0 ? (stats.totalProfit / stats.totalInvoiced * 100).toFixed(1) : '—';

  return (
    <Layout title="Relatórios" subtitle="Sumário financeiro e operacional."
      actions={<button className="btn btn-secondary" onClick={() => window.print()}>🖨️ Imprimir</button>}>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? <p style={{ color: '#6b7280' }}>A carregar...</p> : !stats ? (
        <div className="empty-state"><div className="emoji">📊</div><h3>Sem dados disponíveis</h3><p>Configure o Supabase para visualizar relatórios reais.</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Faturação total', value: fmt(stats.totalInvoiced), icon: '📈', color: '#1e40af' },
              { label: 'Lucro bruto', value: fmt(stats.totalProfit), icon: '💹', color: '#166534' },
              { label: 'Margem média', value: `${margin}%`, icon: '🎯', color: '#7c3aed' },
              { label: 'Saldo caixa', value: fmt(stats.cashBalance), icon: '💰', color: stats.cashBalance >= 0 ? '#166534' : '#991b1b' },
              { label: 'Obras em curso', value: String(stats.activeProjects), icon: '🏗️', color: '#854d0e' },
              { label: 'Por receber', value: fmt(stats.pendingAmount), icon: '⏳', color: '#6b7280' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div className="stat-label">{s.label}</div><div className="stat-value" style={{ color: s.color }}>{s.value}</div></div>
                  <div className="stat-icon" style={{ fontSize: 22 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-body">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Indicadores de performance</h2>
              <div className="table-wrap">
                <table className="pro">
                  <thead><tr><th>Indicador</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
                  <tbody>
                    <tr><td>Total faturado (obras concluídas)</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(stats.totalInvoiced)}</td></tr>
                    <tr><td>Lucro bruto acumulado</td><td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{fmt(stats.totalProfit)}</td></tr>
                    <tr><td>Margem bruta média</td><td style={{ textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>{margin}%</td></tr>
                    <tr><td>Saldo de caixa atual</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(stats.cashBalance)}</td></tr>
                    <tr><td>Obras em curso</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{stats.activeProjects}</td></tr>
                    <tr><td>Valor pendente (orçamentos)</td><td style={{ textAlign: 'right', fontWeight: 700, color: '#854d0e' }}>{fmt(stats.pendingAmount)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
