'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const navItems = [
  ['/', 'Dashboard'],
  ['/clientes', 'Clientes'],
  ['/visitas', 'Visitas'],
  ['/orcamentos', 'Orçamentos'],
  ['/obras', 'Obras'],
  ['/materiais', 'Materiais'],
  ['/stock', 'Stock'],
  ['/caixa', 'Caixa'],
  ['/financeiro', 'Financeiro'],
  ['/relatorios', 'Relatórios'],
  ['/funcionarios', 'Equipa'],
] as const;

export default function Sidebar({ user, mobile, onNavigate }: { user?: string; mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    onNavigate?.();
    router.replace('/login');
  }

  return (
    <aside
      style={{
        width: mobile ? '100%' : 240,
        background: '#101418',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        minHeight: mobile ? 'auto' : '100vh',
        borderRight: mobile ? undefined : '1px solid #1f2937',
      }}
    >
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1f2937' }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
          ROYAL <span style={{ color: '#d7a83f' }}>EPOXI</span>
        </div>
        <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>Gestão Interna</div>
      </div>

      <nav style={{ padding: '12px 0', display: 'grid', gap: 2 }}>
        {navItems.map(([href, label]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.()}
              style={{
                padding: '10px 20px',
                color: active ? '#d7a83f' : '#dbe4ee',
                textDecoration: 'none',
                background: active ? 'rgba(215,168,63,0.12)' : 'transparent',
                borderLeft: active ? '3px solid #d7a83f' : '3px solid transparent',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid #1f2937' }}>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 10, wordBreak: 'break-word' }}>
          {user || 'Sem sessão autenticada'}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #374151',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
