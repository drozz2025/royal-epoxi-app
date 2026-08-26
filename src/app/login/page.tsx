'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);
  const router=useRouter();

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setLoading(true);setMessage('');
    if(!supabase){setMessage('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');setLoading(false);return;}
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setMessage(error.message);setLoading(false);}
    else{router.push('/');}
  }

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'linear-gradient(135deg,#101418 0%,#1a2332 100%)',fontFamily:'Arial,sans-serif'}}>
    <form style={{background:'#fff',borderRadius:20,width:'min(440px,94vw)',padding:40,boxShadow:'0 20px 60px rgba(0,0,0,.4)'}} onSubmit={submit}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:28,fontWeight:800,letterSpacing:1}}>ROYAL <span style={{color:'#d7a83f'}}>EPOXI</span></div>
        <p style={{color:'#6c737b',margin:'8px 0 0',fontSize:14}}>Acesso à gestão interna da empresa</p>
      </div>
      <label style={{display:'block',marginBottom:16}}>
        <span style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Email</span>
        <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="utilizador@royalepoxi.pt" style={{width:'100%',padding:'11px 14px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:14,boxSizing:'border-box'}}/>
      </label>
      <label style={{display:'block',marginBottom:24}}>
        <span style={{fontSize:13,fontWeight:600,color:'#374151',display:'block',marginBottom:6}}>Password</span>
        <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:'100%',padding:'11px 14px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:14,boxSizing:'border-box'}}/>
      </label>
      <button type="submit" disabled={loading} style={{width:'100%',padding:13,background:loading?'#6c737b':'#101418',color:'#fff',border:0,borderRadius:10,fontSize:15,fontWeight:600,cursor:loading?'not-allowed':'pointer'}}>
        {loading?'A entrar...':'Entrar'}
      </button>
      {message&&<div style={{marginTop:16,padding:12,background:'#fff0f0',borderRadius:8,color:'#c00',fontSize:13,textAlign:'center'}}>{message}</div>}
      {!supabase&&<div style={{marginTop:16,padding:12,background:'#fff3cd',borderRadius:8,color:'#856404',fontSize:12}}>⚠️ Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.</div>}
    </form>
  </main>;
}
