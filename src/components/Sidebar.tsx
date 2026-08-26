'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// SVG icons as inline components
const icons: Record<string, string> = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  clients:   'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
  visits:    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  quotes:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  works:     'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  materials: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  stock:     'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  cash:      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  financial: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  reports:   'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  team:      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  logout:    'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
};

function Icon({ d, className = '' }: { d: string; className?: string }) {
  return (
    <svg className={`icon ${className}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const sections = [
  {
    label: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { href: '/clientes', label: 'Clientes', icon: 'clients' },
      { href: '/visitas', label: 'Visitas', icon: 'visits' },
      { href: '/orcamentos', label: 'Orçamentos', icon: 'quotes' },
    ],
  },
  {
    label: 'Execução',
    items: [
      { href: '/obras', label: 'Obras', icon: 'works' },
      { href: '/materiais', label: 'Materiais', icon: 'materials' },
      { href: '/stock', label: 'Stock', icon: 'stock' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/caixa', label: 'Caixa', icon: 'cash' },
      { href: '/financeiro', label: 'Financeiro', icon: 'financial' },
      { href: '/relatorios', label: 'Relatórios', icon: 'reports' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/funcionarios', label: 'Equipa', icon: 'team' },
    ],
  },
];

export default function Sidebar({ user, mobile, onNavigate }: { user?: string; mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    onNavigate?.();
    router.replace('/login');
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="logo">ROYAL <span>EPOXI</span></div>
        <div className="tagline">Gestão Interna</div>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {sections.map((section) => (
          <div key={section.label} className="sidebar-section" style={{ marginTop: 12 }}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(({ href, label, icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`nav-link${active ? ' active' : ''}`}
                >
                  <Icon d={icons[icon]} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {user && <div className="sidebar-user">{user}</div>}
        <button
          type="button"
          onClick={handleLogout}
          className="nav-link"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Icon d={icons.logout} />
          Sair
        </button>
      </div>
    </aside>
  );
}
