'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getDashboardStats } from '@/lib/db';
import Layout from '@/components/Layout';

type Stats = { activeProjects: number; totalInvoiced: number; totalProfit: number; pendingAmount: number; cashBalance: number };

const quick = [
  { href: '/clientes', label: 'Novo cliente', icon: '👥', color: '#eff6ff' },
  { href: '/visitas', label: 'Nova visita', icon: '📅', color: '#f0fdf4' },
  { href: '/orcamentos', label: 'Novo orçamento', icon: '📄', color: '#fefce8' },
  { href: '/obras', label: 'Nova obra', icon: '🏗️', color: '#fdf4ff' },
  { href: '/materiais', label: 'Materiais', icon: '🧴', color: '#fff7ed' },
  { href: '/caixa', label: 'Registar caixa', icon: '💰', color: '#f0fdf4' },
];

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(s => { if (s.error) setError(String(s.error)); else setStats(s); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString('pt-PT', { minimumFractionDigits: 0 });

  const statCards = [
    { label: 'Faturação acumulada', value: stats ? `€ ${fmt(stats.totalInvoiced)}` : '—', sub: 'Obras concluídas', icon: '📈', bg: '#eff6ff', color: '#1e40af' },
    { label: 'Lucro bruto', value: stats ? `€ ${fmt(stats.totalProfit)}` : '—', sub: 'Faturação − custos', icon: '💹', bg: '#f0fdf4', color: '#166534' },
    { label: 'Obras em curso', value: stats ? String(stats.activeProjects) : '—', sub: 'Planeamento + em obra', icon: '🏗️', bg: '#fdf4ff', color: '#7c3aed' },
    { label: 'Por receber', value: stats ? `€ ${fmt(stats.pendingAmount)}` : '—', sub: 'Orçamentos pendentes', icon: '⏳', bg: '#fefce8', color: '#854d0e' },
  ];

  return (
    <Layout title="Dashboard" subtitle="Gestão operacional da Royal Epoxi">
      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
      {!stats && !loading && !error && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          ⚠️ Configure <strong>NEXT_PUBLIC_SUPABASE_URL</strong> e <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> para ativar dados reais.
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: loading ? '#d1d5db' : undefined }}>
                  {loading ? '…' : s.value}
                </div>
                <div className="stat-sub">{s.sub}</div>
              </div>
              <div className="stat-icon" style={{ background: s.bg, fontSize: 20 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Quick actions */}
        <div className="card">
          <div className="card-body">
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111827' }}>Acesso rápido</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {quick.map(q => (
                <Link key={q.href} href={q.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: q.color, border: '1px solid rgba(0,0,0,.05)', fontSize: 13, fontWeight: 600, color: '#1f2937', transition: 'opacity .15s' }}>
                  <span style={{ fontSize: 18 }}>{q.icon}</span> {q.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)' }}>
          <div className="card-body">
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              ROYAL <span style={{ color: '#d7a83f' }}>EPOXI</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
              Sistema de gestão interna para pavimentos e resinas epóxi. Clientes, visitas, orçamentos, obras, materiais, stock e finanças integrados.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Clientes', 'Orçamentos', 'Obras', 'Stock', 'Caixa'].map(tag => (
                <span key={tag} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(215,168,63,.15)', color: '#d7a83f', fontSize: 12, fontWeight: 600 }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
