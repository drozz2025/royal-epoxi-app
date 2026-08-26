'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabase';

export default function Layout({ children, title, subtitle, actions }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const [user, setUser] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!supabase) { setUser(''); return; }
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.email || ''));
  }, []);

  // toggle 'open' class on sidebar element
  useEffect(() => {
    const el = document.querySelector('.sidebar') as HTMLElement | null;
    if (el) el.classList.toggle('open', sidebarOpen);
  }, [sidebarOpen]);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar user={user} onNavigate={() => setSidebarOpen(false)} />

      <div className="app-main">
        <header className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="mobile-menu-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="page-header-left">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
