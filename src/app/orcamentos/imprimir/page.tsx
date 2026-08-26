'use client';
import {useEffect,useState} from 'react';
import {listQuotes,listClients} from '@/lib/db';

type Quote={id:string;status:string;area_m2?:number;sale_price:number;material_cost?:number;labour_cost?:number;other_cost?:number;margin_pct?:number;notes?:string;created_at?:string;clients?:{name:string}};
type Client={id:string;name:string;company?:string;nif?:string;phone?:string;email?:string;address?:string};

export default function ImprimirOrcamento(){
  const [quotes,setQuotes]=useState<Quote[]>([]);
  const [clients,setClients]=useState<Client[]>([]);
  const [quoteId,setQuoteId]=useState('');
  const [vat,setVat]=useState(23);
  const [error,setError]=useState('');

  useEffect(()=>{
    Promise.all([listQuotes(),listClients()])
      .then(([q,c])=>{
        if(q.error)throw q.error;
        if(c.error)throw c.error;
        setQuotes((q.data||[]) as Quote[]);
        setClients((c.data||[]) as Client[]);
        if(q.data&&q.data.length>0)setQuoteId((q.data[0] as Quote).id);
      })
      .catch(e=>setError(e instanceof Error?e.message:String(e)));
  },[]);

  const quote=quotes.find(q=>q.id===quoteId);
  const client=clients.find(c=>c.name===quote?.clients?.name);
  const net=quote?.sale_price||0;
  const iva=net*vat/100;
  const total=net+iva;
  const fmt=(n:number)=>`€${n.toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  return <main style={{padding:40,fontFamily:'Arial',maxWidth:900,margin:'auto'}}>
    <div className="no-print" style={{marginBottom:24,padding:16,background:'#f0f0f0',borderRadius:8,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <select value={quoteId} onChange={e=>setQuoteId(e.target.value)} style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd'}}>
        {quotes.map(q=><option key={q.id} value={q.id}>{q.clients?.name||'Cliente'} — {q.created_at?.slice(0,10)} — {fmt(q.sale_price)}</option>)}
      </select>
      <label>IVA: <input type="number" value={vat} onChange={e=>setVat(Number(e.target.value))} style={{width:60,padding:'6px 8px',borderRadius:6,border:'1px solid #ddd'}}/>%</label>
      <button onClick={()=>window.print()} style={{padding:'8px 20px',background:'#101418',color:'#fff',border:0,borderRadius:6,cursor:'pointer',fontWeight:600}}>🖨️ Imprimir / PDF</button>
    </div>
    {error&&<p style={{color:'#c00'}}>{error}</p>}
    {!quote?<p style={{color:'#8b949e',textAlign:'center',padding:40}}>Selecionar um orçamento acima.</p>:<>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:32}}>
        <div>
          <h1 style={{margin:0,fontSize:28,fontWeight:800}}>ROYAL <span style={{color:'#d7a83f'}}>EPOXI</span></h1>
          <p style={{margin:'4px 0 0',color:'#6c737b',fontSize:13}}>Pavimentos e revestimentos em resina epóxi</p>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:18,fontWeight:700}}>ORÇAMENTO</div>
          <div style={{fontSize:13,color:'#6c737b',marginTop:4}}>Data: {quote.created_at?.slice(0,10)||new Date().toISOString().slice(0,10)}</div>
        </div>
      </div>
      <hr style={{border:'none',borderTop:'2px solid #d7a83f',marginBottom:24}}/>
      {client&&<div style={{marginBottom:24}}>
        <h3 style={{margin:'0 0 8px',fontSize:13,textTransform:'uppercase' as const,letterSpacing:1,color:'#6c737b'}}>Cliente</h3>
        <p style={{margin:0,fontWeight:600,fontSize:15}}>{client.name}</p>
        {client.company&&<p style={{margin:'2px 0 0',color:'#6c737b',fontSize:13}}>{client.company}</p>}
        {client.nif&&<p style={{margin:'2px 0 0',color:'#6c737b',fontSize:13}}>NIF: {client.nif}</p>}
        {client.address&&<p style={{margin:'2px 0 0',color:'#6c737b',fontSize:13}}>{client.address}</p>}
        {client.phone&&<p style={{margin:'2px 0 0',color:'#6c737b',fontSize:13}}>Tel: {client.phone}</p>}
        {client.email&&<p style={{margin:'2px 0 0',color:'#6c737b',fontSize:13}}>{client.email}</p>}
      </div>}
      <div style={{marginBottom:24}}>
        <h3 style={{margin:'0 0 12px',fontSize:13,textTransform:'uppercase' as const,letterSpacing:1,color:'#6c737b'}}>Trabalhos</h3>
        <table style={{width:'100%',borderCollapse:'collapse',border:'1px solid #e2e8f0'}}>
          <thead style={{background:'#f8f9fa'}}>
            <tr><th style={{padding:'10px 14px',textAlign:'left',fontSize:13}}>Descrição</th><th style={{padding:'10px 14px',textAlign:'right',fontSize:13}}>Valor</th></tr>
          </thead>
          <tbody>
            <tr><td style={{padding:'12px 14px',borderTop:'1px solid #e2e8f0'}}>Aplicação de sistema de revestimento em resina epóxi{quote.area_m2?` — ${quote.area_m2} m²`:''}</td><td style={{padding:'12px 14px',textAlign:'right',fontWeight:600}}>{fmt(net)}</td></tr>
            {quote.notes&&<tr><td style={{padding:'8px 14px',color:'#6c737b',fontSize:13,borderTop:'1px solid #f0f0f0'}} colSpan={2}>{quote.notes}</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{textAlign:'right',marginBottom:24}}>
        <table style={{marginLeft:'auto',borderCollapse:'collapse',minWidth:280}}>
          <tbody>
            <tr><td style={{padding:'6px 14px',color:'#6c737b'}}>Subtotal</td><td style={{padding:'6px 14px',fontWeight:600,textAlign:'right'}}>{fmt(net)}</td></tr>
            <tr><td style={{padding:'6px 14px',color:'#6c737b'}}>IVA ({vat}%)</td><td style={{padding:'6px 14px',fontWeight:600,textAlign:'right'}}>{fmt(iva)}</td></tr>
            <tr style={{borderTop:'2px solid #d7a83f'}}><td style={{padding:'10px 14px',fontWeight:700,fontSize:16}}>TOTAL</td><td style={{padding:'10px 14px',fontWeight:800,fontSize:18,textAlign:'right',color:'#d7a83f'}}>{fmt(total)}</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{fontSize:12,color:'#6c737b',borderTop:'1px solid #e2e8f0',paddingTop:16}}>
        <p style={{margin:'0 0 4px'}}><strong>Condições de pagamento:</strong> A definir com o cliente.</p>
        <p style={{margin:'0 0 4px'}}><strong>Validade:</strong> 30 dias.</p>
        <p style={{margin:0}}>Este orçamento não inclui trabalhos de preparação adicional não identificados na visita. Valores sujeitos a confirmação após medição definitiva.</p>
      </div>
    </>}
    <style>{`@media print{.no-print{display:none!important}body{margin:0}main{padding:20px}}`}</style>
  </main>;
}
