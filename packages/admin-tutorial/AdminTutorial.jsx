import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './tutorial.css';

export function AdminTutorial({portal,user,onNavigate}){
  const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[box,setBox]=useState(null);
  const dialog=useRef(null),navigation=useRef(onNavigate);navigation.current=onNavigate;
  const pro=user?.is_pro_admin===true||['manuel@project-robin.com','noel@project-robin.com','maria@project-robin.com','santimartin1203@gmail.com'].includes(user?.email);
  const current=state?.required?state.steps[state.step]:null;
  async function load(){
    setError('');
    try{const response=await fetch(`/api/admin/tutorial?portal=${portal}`,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error();setState(await response.json());}
    catch{setError('No se pudo cargar el recorrido. Reinténtalo para continuar.');}
  }
  useEffect(()=>{if(user?.id&&!pro)void load();},[user?.id,portal,pro]);
  useEffect(()=>{
    if(!current)return;
    if(current.path){const path=new URL(current.path,window.location.origin);if(window.location.pathname!==path.pathname||window.location.search!==path.search){window.location.assign(path.href);return;}}
    navigation.current?.(current.section);
    let frame,timer;
    function place(){
      const target=(current.target.startsWith('button|')?[...document.querySelectorAll('button')].find(button=>button.textContent.trim().includes(current.target.slice(7))):document.querySelector(current.target))||document.querySelector('main')||document.body;
      const rect=target.getBoundingClientRect();
      if(rect.height<window.innerHeight*.7)target.scrollIntoView({block:'center',behavior:'instant'});
      const r=target.getBoundingClientRect();
      const x=Math.min(window.innerWidth-55,Math.max(8,r.x-6)),y=Math.min(window.innerHeight-55,Math.max(8,r.y-6));
      setBox({x,y,w:Math.min(window.innerWidth-x-8,r.width+12),h:Math.min(window.innerHeight-y-8,Math.max(45,r.height+12))});
    }
    frame=requestAnimationFrame(place);timer=setTimeout(place,180);
    window.addEventListener('resize',place);dialog.current?.focus();
    return()=>{cancelAnimationFrame(frame);clearTimeout(timer);window.removeEventListener('resize',place);};
  },[current?.id]);
  useEffect(()=>{
    if(!current&&!error)return;
    const root=document.getElementById('root');const previous=root?.inert;
    if(root)root.inert=true;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    function trap(event){
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();}
      if(event.key==='Tab'){
        const buttons=[...dialog.current?.querySelectorAll('button:not(:disabled)')||[]];
        if(!buttons.length){event.preventDefault();return;}
        const first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey&&(document.activeElement===first||!dialog.current.contains(document.activeElement))){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!dialog.current.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    }
    document.addEventListener('keydown',trap,true);
    return()=>{if(root)root.inert=previous;document.body.style.overflow=overflow;document.removeEventListener('keydown',trap,true);};
  },[Boolean(current),Boolean(error)]);
  async function advance(direction='next'){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/admin/tutorial',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({portal,revision:state.revision,step:state.step,direction,complete:direction==='next'&&state.step===state.steps.length-1})});
      if(response.status===409){await load();return;}
      if(!response.ok)throw new Error();
      setState(await response.json());
    }catch{setError('No se pudo guardar este paso. Reinténtalo para continuar.');}
    finally{setBusy(false);}
  }
  if(pro||!user?.id||(!current&&!error))return null;
  const left=box&&box.x>400?Math.max(20,box.x-390):Math.min(window.innerWidth-390,Math.max(20,(box?.x||20)+24));
  const top=box&&box.y>320?Math.max(20,box.y-270):Math.min(window.innerHeight-290,Math.max(30,(box?.y||90)+70));
  return createPortal(<div className="robin-tour" data-testid="admin-tutorial">
    <div className="robin-tour-blocker" style={{background:box?'transparent':undefined}}/>
    {box&&<div className="robin-tour-highlight" style={{left:box.x,top:box.y,width:box.w,height:box.h}}/>}
    <section ref={dialog} className="robin-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="robin-tour-title" aria-describedby="robin-tour-description" tabIndex={-1} style={{left:Math.max(16,left),top:Math.max(16,top)}}>
      <p className="robin-tour-kicker">Recorrido obligatorio{current?` · ${state.step+1} de ${state.steps.length}`:''}</p>
      <h2 id="robin-tour-title">{current?.title||'Tu recorrido de bienvenida'}</h2>
      <p id="robin-tour-description">{current?.description||'Completa el tutorial para conocer las áreas a las que tienes acceso.'}</p>
      {current&&<div className="robin-tour-progress" aria-hidden="true"><span style={{width:`${(state.step+1)/state.steps.length*100}%`}}/></div>}
      {error&&<p role="alert" className="robin-tour-error">{error}</p>}
      <div className="robin-tour-actions">
        {current&&state.step>0&&<button disabled={busy} onClick={()=>advance('back')}>Anterior</button>}
        {error?<button className="is-primary" disabled={busy} onClick={load}>Reintentar</button>:<button className="is-primary" disabled={busy} onClick={()=>advance()}>{busy?'Guardando…':state.step===state.steps.length-1?'Finalizar recorrido':'Siguiente'}</button>}
      </div>
      <small>Tu progreso se guarda. Si sales, continuarás donde lo dejaste.</small>
    </section>
  </div>,document.body);
}
