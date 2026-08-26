const obras = [
  {id:'RE-2026-024',cliente:'Cliente Exemplo A',local:'Maia',valor:'€15.800',margem:'42,3%',estado:'Em obra',classe:'good'},
  {id:'RE-2026-025',cliente:'Cliente Exemplo B',local:'Porto',valor:'€8.450',margem:'36,8%',estado:'A iniciar',classe:'warn'},
  {id:'RE-2026-026',cliente:'Cliente Exemplo C',local:'Matosinhos',valor:'€21.200',margem:'51,1%',estado:'Orçamento aceite',classe:'good'}
];

export default function Home(){
  return <div className="app">
    <aside className="sidebar">
      <div className="brand">ROYAL <span>EPOXI</span></div>
      <nav className="nav">
        <div className="active">Dashboard</div><div>Clientes</div><div>Leads</div><div>Visitas & Medições</div><div>Orçamentos</div><div>Obras</div><div>Materiais</div><div>Stock</div><div>Compras</div><div>Funcionários</div><div>Caixa</div><div>Relatórios</div><div>Definições</div>
      </nav>
    </aside>
    <main className="main">
      <header className="top"><div className="title"><h1>Dashboard</h1><p>Visão geral da Royal Epoxi</p></div><div className="profile">Administrador ▾</div></header>
      <section className="grid">
        <div className="card"><div className="label">Faturação este mês</div><div className="value">€38.450</div><div className="trend">+12,4% vs. mês anterior</div></div>
        <div className="card"><div className="label">Lucro estimado</div><div className="value">€15.920</div><div className="trend">Margem média 41,4%</div></div>
        <div className="card"><div className="label">Obras em curso</div><div className="value">7</div><div className="trend">2 começam esta semana</div></div>
        <div className="card"><div className="label">Por receber</div><div className="value">€12.780</div><div className="trend">3 pagamentos pendentes</div></div>
      </section>
      <section className="section">
        <div className="card"><h2>Obras em destaque</h2><div className="rows">{obras.map(o=><div className="row" key={o.id}><div><strong>{o.id}</strong><br/><span className="label">{o.cliente} · {o.local}</span></div><div style={{textAlign:'right'}}><strong>{o.valor}</strong><br/><span className={`badge ${o.classe}`}>{o.estado}</span> <span className="label">Margem {o.margem}</span></div></div>)}</div></div>
        <div className="card"><h2>Ações rápidas</h2><div className="quick"><button>+ Novo cliente</button><button>+ Nova visita</button><button>+ Novo orçamento</button><button>+ Nova obra</button><button>+ Registar despesa</button><button>+ Entrada de caixa</button></div><h2 style={{marginTop:22}}>Margem mensal</h2><div className="label">Objetivo 45%</div><div className="bar"><div className="fill" style={{width:'92%'}}/></div></div>
      </section>
    </main>
  </div>
}
