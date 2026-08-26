'use client';
import {useEffect,useState,useMemo} from 'react';
import {listProjects} from '@/lib/db';
import PageLayout from '@/components/PageLayout';

type Project={id:string;number?:string;status:string;sale_price:number;planned_cost:number;actual_cost:number;created_at?:string;clients?:{name:string}};

export default function Relatorios(){
  const [projects,setProjects]=useState<Project[]>([]);
  const [year,setYear]=useState(String(new Date().getFullYear()));
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    listProjects()
      .then(r=>{if(r.error)throw r.error;setProjects((r.data||[]) as Project[]);})
      .catch(e=>setError(e instanceof Error?e.message:String(e)))
      .finally(()=>setLoading(false));
  },[]);

  const filtered=useMemo(()=>projects.filter(p=>(p.created_at||'').startsWith(year)),[projects,year]);
  const stats=useMemo(()=>{
    const invoiced=filtered.reduce((s,p)=>s+Number(p.sale_price||0),0);
    const costs=filtered.reduce((s,p)=>s+Number(p.actual_cost||p.planned_cost||0),0);
    const profit=invoiced-costs;
    const margin=invoiced?profit/invoiced*100:0;
    return {invoiced,costs,profit,margin,count:filtered.length};
  },[filtered]);

  const fmt=(n:number)=>`€${n.toLocaleString('pt-PT',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
  const fmtD=(n:number)=>`€${n.toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const card={background:'#fff',borderRadius:12,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,.08)'} as const;
  const years=Array.from(new Set([String(new Date().getFullYear()),String(new Date().getFullYear()-1),...projects.map(p=>(p.created_at||'').slice(0,4)).filter(Boolean)])).sort((a,b)=>Number(b)-Number(a));

  return <PageLayout title="Relatórios" subtitle="Rentabilidade, faturação e margens.">
    <div style={{marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
      <label style={{fontSize:14,color:'#6c737b'}}>Ano:</label>
      <select value={year} onChange={e=>setYear(e.target.value)} style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd',fontSize:14}}>
        {years.map(y=><option key={y}>{y}</option>)}
      </select>
    </div>
    {error&&<div style={{padding:12,background:'#fff0f0',border:'1px solid #fcc',borderRadius:8,marginBottom:16,color:'#c00'}}>{error}</div>}
    {loading?<p>A carregar...</p>:<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        {([['Faturação',fmt(stats.invoiced)],['Custos',fmt(stats.costs)],['Lucro',fmt(stats.profit)],['Margem',`${stats.margin.toFixed(1)}%`],['Obras',String(stats.count)]] as [string,string][]).map(([l,v])=>(
          <div key={l} style={card}>
            <div style={{fontSize:13,color:'#6c737b'}}>{l}</div>
            <div style={{fontSize:22,fontWeight:700,marginTop:6}}>{v}</div>
          </div>
        ))}
      </div>
      {filtered.length===0?<div style={{textAlign:'center',padding:60,color:'#8b949e'}}>
        <div style={{fontSize:48,marginBottom:12}}>📊</div>
        <p style={{fontSize:16}}>Nenhuma obra em {year}.</p>
      </div>:<div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.08)',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8f9fa'}}><tr>{['Obra','Cliente','Venda','Custo','Lucro','Margem','Estado'].map(h=><th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:13,fontWeight:600,color:'#6c737b'}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map((p,i)=>{const cost=p.actual_cost||p.planned_cost||0;const profit=p.sale_price-cost;const margin=p.sale_price?profit/p.sale_price*100:0;return <tr key={p.id} style={{borderTop:i?'1px solid #f0f0f0':'none'}}>
            <td style={{padding:'12px 16px',fontWeight:600}}>{p.number||p.id.slice(0,8)}</td>
            <td style={{padding:'12px 16px'}}>{p.clients?.name||'—'}</td>
            <td style={{padding:'12px 16px'}}>{fmtD(p.sale_price||0)}</td>
            <td style={{padding:'12px 16px'}}>{fmtD(cost)}</td>
            <td style={{padding:'12px 16px',color:profit>=0?'#166534':'#991b1b',fontWeight:600}}>{fmtD(profit)}</td>
            <td style={{padding:'12px 16px'}}>{margin.toFixed(1)}%</td>
            <td style={{padding:'12px 16px',fontSize:13,color:'#6c737b'}}>{p.status}</td>
          </tr>;})}
          </tbody>
        </table>
        <div style={{padding:12,textAlign:'right'}}>
          <button onClick={()=>window.print()} style={{padding:'8px 16px',background:'#f0f0f0',border:'1px solid #ddd',borderRadius:6,cursor:'pointer',fontSize:13}}>🖨️ Imprimir</button>
        </div>
      </div>}
    </>}
  </PageLayout>;
}
