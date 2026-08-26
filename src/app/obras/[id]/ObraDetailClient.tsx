'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getProject } from '@/lib/db';
import { supabase } from '@/lib/supabase';

type ProjectRow = {
  id: string;
  number?: string | null;
  status?: string | null;
  area_m2?: number | null;
  sale_price?: number | null;
  planned_cost?: number | null;
  actual_cost?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  clients?: { name?: string | null } | null;
};

type MaterialMovement = {
  id: string;
  quantity?: number | null;
  type?: string | null;
  reason?: string | null;
  created_at?: string | null;
  materials?: { name?: string | null; cost?: number | null; unit?: string | null } | null;
};

type WorkLog = {
  id: string;
  date?: string | null;
  hours?: number | null;
  notes?: string | null;
  employee_name?: string | null;
  employee_id?: string | null;
  labour_cost?: number | null;
  cost?: number | null;
};

type ExtraWork = {
  id: string;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  approved?: boolean | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function ObraDetailClient({ id }: { id: string }) {
  const [resolvedId, setResolvedId] = useState(id === 'default' ? '' : id);

  useEffect(() => {
    if (id !== 'default') {
      setResolvedId(id);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setResolvedId(params.get('id') || '');
  }, [id]);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [materialMovements, setMaterialMovements] = useState<MaterialMovement[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [extraWorks, setExtraWorks] = useState<ExtraWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailWarning, setDetailWarning] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!resolvedId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setDetailWarning('');

      try {
        const projectResult = await getProject(resolvedId);
        if (projectResult.error) throw projectResult.error;
        setProject((projectResult.data || null) as ProjectRow | null);

        if (!supabase) {
          setLoading(false);
          return;
        }

        const [movementResult, workResult, extraResult] = await Promise.all([
          supabase.from('material_movements').select('id, quantity, type, reason, created_at, materials(name, cost, unit)').eq('project_id', resolvedId).order('created_at', { ascending: false }),
          supabase.from('work_logs').select('*').eq('project_id', resolvedId).order('date', { ascending: false }),
          supabase.from('extra_works').select('*').eq('project_id', resolvedId),
        ]);

        if (!movementResult.error) {
          setMaterialMovements((movementResult.data || []) as MaterialMovement[]);
        }
        if (!workResult.error) {
          setWorkLogs((workResult.data || []) as WorkLog[]);
        }
        if (!extraResult.error) {
          setExtraWorks((extraResult.data || []) as ExtraWork[]);
        }
        if (movementResult.error || workResult.error || extraResult.error) {
          setDetailWarning('Alguns detalhes da obra não puderam ser carregados.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar obra.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [resolvedId]);

  const materialCost = materialMovements.reduce((sum, movement) => {
    if (movement.type !== 'OUT') return sum;
    return sum + toNumber(movement.quantity) * toNumber(movement.materials?.cost);
  }, 0);
  const totalHours = workLogs.reduce((sum, log) => sum + toNumber(log.hours), 0);
  const labourCost = workLogs.reduce((sum, log) => sum + toNumber(log.labour_cost ?? log.cost), 0);
  const extrasValue = extraWorks.reduce((sum, extra) => sum + toNumber(extra.quantity) * toNumber(extra.unit_price), 0);
  const actualCost = toNumber(project?.actual_cost) || materialCost + labourCost;
  const plannedCost = toNumber(project?.planned_cost);
  const salePrice = toNumber(project?.sale_price);

  return (
    <Layout title={project?.number || 'Detalhe da obra'} subtitle={project?.clients?.name || 'Acompanhamento da obra'}>
      <Link href="/obras" style={{ display: 'inline-block', marginBottom: 18, color: '#2563eb', textDecoration: 'none' }}>← Voltar às obras</Link>
      {error ? <div style={{ padding: 14, borderRadius: 10, background: '#fff1f2', color: '#be123c', marginBottom: 18 }}>{error}</div> : null}
      {detailWarning ? <div style={{ padding: 14, borderRadius: 10, background: '#fffbeb', color: '#b45309', marginBottom: 18 }}>{detailWarning}</div> : null}
      {loading ? (
        <div>A carregar...</div>
      ) : !resolvedId || !project ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: 24 }}>Obra não encontrada.</div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              ['Estado', project.status || '—'],
              ['Área', project.area_m2 ? `${project.area_m2} m²` : '—'],
              ['Venda', salePrice ? formatCurrency(salePrice) : '—'],
              ['Custo previsto', plannedCost ? formatCurrency(plannedCost) : '—'],
              ['Custo atual', actualCost ? formatCurrency(actualCost) : '—'],
              ['Horas registadas', totalHours ? `${totalHours.toFixed(1)} h` : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
              <h2 style={{ marginTop: 0 }}>Resumo financeiro</h2>
              <div style={{ display: 'grid', gap: 10, color: '#374151' }}>
                <div>Orçamentado: <strong>{plannedCost ? formatCurrency(plannedCost) : '—'}</strong></div>
                <div>Real apurado: <strong>{actualCost ? formatCurrency(actualCost) : '—'}</strong></div>
                <div>Materiais consumidos: <strong>{materialCost ? formatCurrency(materialCost) : '—'}</strong></div>
                <div>Mão de obra: <strong>{labourCost ? formatCurrency(labourCost) : '—'}</strong></div>
                <div>Trabalhos extra: <strong>{extrasValue ? formatCurrency(extrasValue) : '—'}</strong></div>
                <div>Margem atual: <strong>{salePrice ? `${(((salePrice - actualCost) / salePrice) * 100).toFixed(1)}%` : '—'}</strong></div>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
              <h2 style={{ marginTop: 0 }}>Detalhes da obra</h2>
              <div style={{ display: 'grid', gap: 8, color: '#374151' }}>
                <div>Início: <strong>{project.start_date || '—'}</strong></div>
                <div>Fim: <strong>{project.end_date || '—'}</strong></div>
                <div>Notas: <strong>{project.notes || '—'}</strong></div>
              </div>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
              <h2 style={{ marginTop: 0 }}>Materiais usados</h2>
              {materialMovements.length === 0 ? <div style={{ color: '#6b7280' }}>Sem movimentos associados.</div> : materialMovements.map((movement) => <div key={movement.id} style={{ padding: '10px 0', borderTop: '1px solid #f1f5f9' }}><strong>{movement.materials?.name || 'Material'}</strong><div style={{ color: '#6b7280', fontSize: 14 }}>{movement.type || '—'} · {movement.quantity || 0} {movement.materials?.unit || ''}</div><div style={{ color: '#9ca3af', fontSize: 13 }}>{movement.reason || 'Sem motivo'}{movement.created_at ? ` · ${new Date(movement.created_at).toLocaleDateString('pt-PT')}` : ''}</div></div>)}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
              <h2 style={{ marginTop: 0 }}>Horas de trabalho</h2>
              {workLogs.length === 0 ? <div style={{ color: '#6b7280' }}>Sem horas registadas.</div> : workLogs.map((log) => <div key={log.id} style={{ padding: '10px 0', borderTop: '1px solid #f1f5f9' }}><strong>{log.employee_name || log.employee_id || 'Funcionário'}</strong><div style={{ color: '#6b7280', fontSize: 14 }}>{log.hours || 0} h{log.date ? ` · ${log.date}` : ''}</div><div style={{ color: '#9ca3af', fontSize: 13 }}>{log.notes || 'Sem notas'}</div></div>)}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(16,24,40,.08)' }}>
              <h2 style={{ marginTop: 0 }}>Trabalhos extra</h2>
              {extraWorks.length === 0 ? <div style={{ color: '#6b7280' }}>Sem extras registados.</div> : extraWorks.map((extra) => <div key={extra.id} style={{ padding: '10px 0', borderTop: '1px solid #f1f5f9' }}><strong>{extra.description || 'Extra'}</strong><div style={{ color: '#6b7280', fontSize: 14 }}>{toNumber(extra.quantity)} × {formatCurrency(toNumber(extra.unit_price))}</div><div style={{ color: extra.approved ? '#15803d' : '#b45309', fontSize: 13 }}>{extra.approved ? 'Aprovado' : 'Pendente de aprovação'}</div></div>)}
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
}
