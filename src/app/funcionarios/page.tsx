'use client';
import PageLayout from '@/components/PageLayout';

const roles=[
  {id:'ADMIN',label:'Administrador',desc:'Acesso total a todos os módulos e dados.'},
  {id:'ORCAMENTISTA',label:'Orçamentista',desc:'Clientes, visitas, medições, materiais e orçamentos.'},
  {id:'OBRA',label:'Responsável de obra',desc:'Obras, horas, materiais, fotos e extras.'},
  {id:'FINANCEIRO',label:'Financeiro',desc:'Caixa, compras, pagamentos e relatórios.'},
  {id:'FUNCIONARIO',label:'Funcionário',desc:'Tarefas e registos autorizados pelo gestor.'},
];

export default function Funcionarios(){
  return <PageLayout title="Equipa & Permissões" subtitle="Funções e níveis de acesso dos colaboradores.">
    <div style={{background:'#fff3cd',border:'1px solid #ffc107',borderRadius:8,padding:16,marginBottom:24,fontSize:14}}>
      <strong>ℹ️ Como adicionar funcionários:</strong><br/>
      Para convidar um novo utilizador, aceda ao <strong>Supabase Dashboard → Authentication → Users → Invite user</strong>. Após o primeiro login, o perfil é criado automaticamente e pode ser atualizado com a função correta.
    </div>
    <div style={{background:'#fff',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,.08)',overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead style={{background:'#f8f9fa'}}>
          <tr>{['Função','Identificador','Acesso'].map(h=><th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:13,fontWeight:600,color:'#6c737b'}}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {roles.map((r,i)=><tr key={r.id} style={{borderTop:i?'1px solid #f0f0f0':'none'}}>
            <td style={{padding:'12px 16px',fontWeight:600}}>{r.label}</td>
            <td style={{padding:'12px 16px'}}><code style={{background:'#f0f0f0',padding:'2px 6px',borderRadius:4,fontSize:12}}>{r.id}</code></td>
            <td style={{padding:'12px 16px',color:'#6c737b',fontSize:14}}>{r.desc}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </PageLayout>;
}
