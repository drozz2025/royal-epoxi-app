'use client';
import {useEffect,useState,useMemo} from 'react';
import {listCashMovements,listProjects} from '@/lib/db';
import PageLayout from '@/components/PageLayout';

type Movement={id:string;date:string;type:'IN'|'OUT';category:string;amount:number;description:string};
type Project={id:string;sale_price:number;planned_cost:number;actual_cost:number;status:string};

export default function Financeiro(){
  const [movs,setMovs]=useState<Movement[]>([]);
  const [projects,setProjects]=useState<Project[]>([]);
  const [period,setPeriod]=useState(new Date().toISOString().slice(0,7));
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    Promise.all([listCashMovements(),listProjects()])
      .then(([m,p])=>{
        if(m.error)throw m.error;
        if(p.error)throw p.error;
        setMovs((m.data||[]) as Movement[]);
        setProjects((p.data||[]) as Project[]);
      })
      .catch(e=>setError(e instanceof Error?e.message:String(e)))
      .finally(()=>setLoading(false));
  },[]);

  const stats=useMemo(()=>{
    const periodMovs=movs.filter(m=>m.date.startsWith(period));
    const ins=periodMovs.filter(m=>m.type==='IN').reduce((s,m)=>s+Number(m.amount),0);
    const outs=periodMovs.filter(m=>m.type==='OUT').reduce((s,m)=>s+Number(m.amount),0);
    const invoiced=projects.filter(p=>p.status==='CONCLUIDA').reduce((s,p)=>s+Number(p.sale_price),0);
    const costs=projects.filter(p=>p.status==='CONCLUIDA').reduce((s,p)=>s+Number(p.actual_cost),0);
    return {ins,outs,balance:ins-outs,invoiced,profit:invoiced-costs,result:ins-outs};
  },[movs,projects,period]);

  const fmt=(n:number)=>`€${n.toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const card={background:'#fff',borderRadius:12,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,.08)'} as const;

  return <PageLayout title="Financeiro" subtitle="Resumo financeiro, entradas, saídas e resultado.">
    <div style={{marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
      <label style={{fontSize:14,color:'#6c737b'}}>Período:</label>
      <input type="month" value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd',fontSize:14}}/>
    </div>
    {error&&<div style={{padding:12,background:'#fff0f0',border:'1px solid #fcc',borderRadius:8,marginBottom:16,color:'#c00'}}>{error}</div>}
    {loading?<p>A carregar...</p>:<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        {([['Entradas (caixa)',stats.ins,'#166534'],['Saídas (caixa)',stats.outs,'#991b1b'],['Saldo de caixa',stats.balance,stats.balance>=0?'#166534':'#991b1b'],['Faturado (obras)',stats.invoiced,'#101418'],['Lucro acumulado',stats.profit,stats.profit>=0?'#166534':'#991b1b']] as [string,number,string][]).map(([l,v,c])=>(
          <div key={l} style={card}>
            <div style={{fontSize:13,color:'#6c737b'}}>{l}</div>
            <div style={{fontSize:22,fontWeight:700,marginTop:6,color:c}}>{fmt(v)}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
        <h3 style={{margin:'0 0 16px',fontSize:16}}>Movimentos do período ({period})</h3>
        {movs.filter(m=>m.date.startsWith(period)).length===0?<p style={{color:'#8b949e',textAlign:'center',padding:20}}>Nenhum movimento neste período.</p>:<table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'#f8f9fa'}}><tr>{['Data','Tipo','Categoria','Descrição','Valor'].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:13,fontWeight:600,color:'#6c737b'}}>{h}</th>)}</tr></thead>
          <tbody>{movs.filter(m=>m.date.startsWith(period)).map((m,i)=><tr key={m.id} style={{borderTop:i?'1px solid #f0f0f0':'none'}}>
            <td style={{padding:'10px 14px',fontSize:13,color:'#6c737b'}}>{m.date}</td>
            <td style={{padding:'10px 14px'}}><span style={{padding:'2px 8px',borderRadius:10,background:m.type==='IN'?'#dcfce7':'#fee2e2',color:m.type==='IN'?'#166534':'#991b1b',fontSize:12,fontWeight:600}}>{m.type==='IN'?'Entrada':'Saída'}</span></td>
            <td style={{padding:'10px 14px',fontSize:13,color:'#6c737b'}}>{m.category}</td>
            <td style={{padding:'10px 14px'}}>{m.description||'—'}</td>
            <td style={{padding:'10px 14px',fontWeight:600,color:m.type==='IN'?'#166534':'#991b1b'}}>{m.type==='OUT'?'-':''}{fmt(Number(m.amount))}</td>
          </tr>)}
          </tbody>
        </table>}
      </div>
    </>}
  </PageLayout>;
}
