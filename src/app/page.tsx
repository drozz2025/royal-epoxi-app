'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getDashboardStats } from '@/lib/db';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

type DashboardStats = {
  activeProjects: number;
  totalInvoiced: number;
  totalProfit: number;
  pendingAmount: number;
  cashBalance: number;
};

const quickLinks = [
  ['/clientes', 'Clientes'],
  ['/visitas', 'Visitas'],
  ['/orcamentos', 'Orçamentos'],
  ['/obras', 'Obras'],
  ['/materiais', 'Materiais'],
  ['/financeiro', 'Financeiro'],
] as const;

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then((result) => {
        if (result.error) {
          throw result.error;
        }
        setStats(result);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    ['Faturação', stats ? formatCurrency(stats.totalInvoiced) : '—', 'Obras concluídas'],
    ['Lucro', stats ? formatCurrency(stats.totalProfit) : '—', 'Baseado em custos reais'],
    ['Obras em curso', stats ? String(stats.activeProjects) : '—', 'Planeamento e execução'],
    ['Por receber', stats ? formatCurrency(stats.pendingAmount) : '—', 'Pagamentos e propostas pendentes'],
  ] as const;

  return (
    <Layout title="Dashboard" subtitle="Gestão operacional da Royal Epoxi.">
      {error ? (
        <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map(([label, value, hint]) => (
          <div key={label} style={{ background: '#fff', padding: 22, borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,0.08)' }}>
            <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, margin: '10px 0 6px', minHeight: 38 }}>{loading ? '…' : value}</div>
            <div style={{ color: '#9ca3af', fontSize: 12 }}>{hint}</div>
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div style={{ background: '#fff', padding: 22, borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>Navegação rápida</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {quickLinks.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                style={{ textDecoration: 'none', color: '#101418', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontWeight: 600 }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', padding: 22, borderRadius: 14, boxShadow: '0 1px 4px rgba(16,24,40,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>Estado da integração</h2>
          <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
            O dashboard apresenta totais reais vindos do Supabase. Quando não existir configuração ou dados, os cartões mostram “—” e mensagens de contexto.
          </p>
          {!loading && !stats ? <p style={{ color: '#b45309', marginBottom: 0 }}>Sem dados disponíveis.</p> : null}
          {stats ? <p style={{ color: '#6b7280', marginBottom: 0 }}>Saldo de caixa atual: {formatCurrency(stats.cashBalance)}</p> : null}
        </div>
      </section>
    </Layout>
  );
}
