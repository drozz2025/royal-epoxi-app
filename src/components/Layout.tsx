'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import { supabase } from '@/lib/supabase';

export default function Layout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [user, setUser] = useState('');
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const syncViewport = () => setMobile(window.innerWidth < 920);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setUser('');
      return;
    }
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.email || ''));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f8', fontFamily: 'Arial, sans-serif', color: '#101418' }}>
      {mobile ? (
        <>
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: '#101418',
              color: '#fff',
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>ROYAL <span style={{ color: '#d7a83f' }}>EPOXI</span></div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{title}</div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              style={{ background: 'transparent', color: '#fff', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px' }}
            >
              Menu
            </button>
          </div>
          {menuOpen && (
            <div style={{ position: 'relative', zIndex: 25 }}>
              <Sidebar user={user} mobile onNavigate={() => setMenuOpen(false)} />
            </div>
          )}
        </>
      ) : (
        <div style={{ position: 'fixed', inset: '0 auto 0 0', width: 240, zIndex: 10 }}>
          <Sidebar user={user} />
        </div>
      )}

      <main style={{ marginLeft: mobile ? 0 : 240, padding: mobile ? 16 : 32 }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: mobile ? 28 : 32 }}>{title}</h1>
          {subtitle ? <p style={{ margin: '8px 0 0', color: '#6b7280' }}>{subtitle}</p> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
