import { useState, useEffect, useCallback } from "react";

// ─── Storage ────────────────────────────────────────────────────
const SK = "fittrack-v4";
const emptyData = () => ({ sessions: [], plans: [], workoutTemplates: [] });
function load() {
  try { const r = localStorage.getItem(SK); return r ? JSON.parse(r) : emptyData(); }
  catch { return emptyData(); }
}
function save(d) { try { localStorage.setItem(SK, JSON.stringify(d)); } catch {} }

// ─── Constants ──────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const dateKey = (y, m, d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const fmtDate = (iso) => new Date(iso+"T12:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"short"});
const fmtDateLong = (iso) => new Date(iso+"T12:00").toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
const fmtSec = (sec) => { const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60; return h>0?`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`; };
const calcPace = (km,sec) => { if(!km||!sec) return "–"; const mpk=sec/60/km; return `${Math.floor(mpk)}:${String(Math.round((mpk%1)*60)).padStart(2,"0")} /km`; };

const DAYS_DE = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const WDAYS = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const GYM_LABELS = ["Beinworkout","Oberkörper","Rücken & Bizeps","Brust & Trizeps","Schultern","Ganzkörper","Core & Bauch","Pull Day","Push Day","Leg Day"];
const EX_PRESETS = ["Kniebeuge","Beinpresse","Beinbeuger","Beinstrecker","Hip Thrust","Ausfallschritte","Wadenheben","Kreuzheben","Bankdrücken","Schrägbankdrücken","Schulterdrücken","Klimmzüge","Rudern","Bizepscurl","Trizepsdrücken","Seitheben","Frontheben","Butterfly","Latzug","Plank","Crunch","Sit-ups","Romanian Deadlift","Beinpresse eng","Hackenschmidt"];

// Cardio sports with emoji + color
const CARDIO_SPORTS = [
  { id:"jogging",    label:"Jogging",       emoji:"🏃", hasKm:true,  hasPace:true  },
  { id:"cycling",    label:"Fahrradfahren", emoji:"🚴", hasKm:true,  hasPace:false },
  { id:"hiking",     label:"Wandern",       emoji:"🥾", hasKm:true,  hasPace:false },
  { id:"volleyball", label:"Volleyball",    emoji:"🏐", hasKm:false, hasPace:false },
  { id:"swimming",   label:"Schwimmen",     emoji:"🏊", hasKm:false, hasPace:false },
  { id:"football",   label:"Fußball",       emoji:"⚽", hasKm:false, hasPace:false },
  { id:"basketball", label:"Basketball",    emoji:"🏀", hasKm:false, hasPace:false },
  { id:"tennis",     label:"Tennis",        emoji:"🎾", hasKm:false, hasPace:false },
  { id:"yoga",       label:"Yoga",          emoji:"🧘", hasKm:false, hasPace:false },
  { id:"boxing",     label:"Boxen",         emoji:"🥊", hasKm:false, hasPace:false },
  { id:"skiing",     label:"Skifahren",     emoji:"⛷️", hasKm:true,  hasPace:false },
  { id:"rowing",     label:"Rudern",        emoji:"🚣", hasKm:false, hasPace:false },
  { id:"dancing",    label:"Tanzen",        emoji:"💃", hasKm:false, hasPace:false },
  { id:"other",      label:"Sonstiges",     emoji:"🏅", hasKm:false, hasPace:false },
];
const cardioInfo = (id) => CARDIO_SPORTS.find(s=>s.id===id) || CARDIO_SPORTS[0];

// ─── Colors ─────────────────────────────────────────────────────
const C = {
  bg:"#F2F4F8", surface:"#FFFFFF", border:"#E2E8F2",
  text:"#111827", sub:"#6B7280", light:"#9CA3AF",
  gym:"#F97316", gymL:"#FFF7ED", gymB:"#FED7AA",
  cardio:"#0EA5E9", cardioL:"#F0F9FF", cardioB:"#BAE6FD",
  acc:"#6366F1", accL:"#EEF2FF", accB:"#C7D2FE",
  green:"#10B981", greenL:"#F0FDF4",
  red:"#EF4444", redL:"#FEF2F2",
  plan:"#8B5CF6", planL:"#F5F3FF", planB:"#DDD6FE",
  tpl:"#F59E0B", tplL:"#FFFBEB", tplB:"#FDE68A",
};

// ─── Icons ───────────────────────────────────────────────────────
const IcoDumbbell = ({s=20}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s,flexShrink:0}}><path d="M6 5v14M18 5v14M6 9h12M6 15h12M3 7h3M3 17h3M18 7h3M18 17h3"/></svg>;
const IcoCardio = ({s=20}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:s,height:s,flexShrink:0}}><circle cx="13" cy="4" r="1.5"/><path d="m9 12 2 3 3-5 3 6"/><path d="M5 19c.5-1.5 1-3 2-4l2-2 3 3 2-5 3 3"/></svg>;
const IcoPlus = ({s=16}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:s,height:s,flexShrink:0}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoTrash = ({s=15}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s,flexShrink:0}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>;
const IcoX = ({s=15}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:s,height:s,flexShrink:0}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoChev = ({open,s=16}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s,transform:open?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>;
const IcoLeft = ({s=18}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:s,height:s}}><polyline points="15 18 9 12 15 6"/></svg>;
const IcoRight = ({s=18}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:s,height:s}}><polyline points="9 18 15 12 9 6"/></svg>;
const IcoCal = ({s=22}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoHome = ({s=22}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoHistory = ({s=22}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoRepeat = ({s=15}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const IcoClock = ({s=13}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoEdit = ({s=15}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoMove = ({s=15}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><polyline points="5 9 2 12 5 15"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/></svg>;
const IcoStar = ({s=15}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoStarFill = ({s=15}) => <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoTemplates = ({s=22}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:s,height:s}}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17 14v6M14 17h6"/></svg>;

// ─── Shared styles ───────────────────────────────────────────────
const card = (x={}) => ({background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 1px 4px #0000000a",...x});
const inp = (x={}) => ({width:"100%",background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"11px 13px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"inherit",WebkitAppearance:"none",...x});
const setInp = {background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 6px",color:C.text,fontSize:15,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",textAlign:"center",WebkitAppearance:"none"};
const iBtn = (x={}) => ({background:"transparent",border:"none",color:C.light,cursor:"pointer",padding:6,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,flexShrink:0,...x});
const pill = (color,active) => ({background:active?color+"18":C.bg,border:`1.5px solid ${active?color:C.border}`,color:active?color:C.sub,borderRadius:20,padding:"5px 12px",fontSize:13,fontWeight:active?700:500,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0});

// ─── Atoms ───────────────────────────────────────────────────────
const Lbl = ({children}) => <div style={{fontSize:11,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:".07em",marginBottom:7}}>{children}</div>;
const SecTitle = ({children}) => <div style={{fontSize:12,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>{children}</div>;
const Fld = ({label,children,mb=14}) => <div style={{marginBottom:mb}}><Lbl>{label}</Lbl>{children}</div>;
const Dot = ({color,dashed}) => <span style={{width:8,height:8,borderRadius:"50%",background:dashed?"transparent":color,border:dashed?`1.5px dashed ${color}`:"none",display:"inline-block",flexShrink:0}}/>;

// ─── Last-weight lookup helper ───────────────────────────────────
function getLastWeights(sessions, exerciseName) {
  // find most recent session that has this exercise
  for (const s of sessions) {
    if (s.type !== "gym") continue;
    const ex = s.exercises?.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
    if (ex) return ex.sets.map(s => s.weight);
  }
  return null;
}

// ─── Exercise Builder (with last-weight suggestions) ────────────
function ExerciseBuilder({ exercises, onChange, accentColor, sessions }) {
  const addEx = () => onChange([...exercises, {id:uid(),name:"",sets:[{reps:"10",weight:""}]}]);
  const removeEx = (id) => onChange(exercises.filter(e=>e.id!==id));
  const updEx = (id, name) => {
    const lastW = getLastWeights(sessions, name);
    onChange(exercises.map(e => {
      if (e.id !== id) return e;
      const sets = lastW
        ? e.sets.map((s,i) => ({...s, weight: lastW[i] !== undefined ? lastW[i] : (lastW[lastW.length-1]||"") }))
        : e.sets;
      return {...e, name, sets};
    }));
  };
  const addSet = (id) => {
    onChange(exercises.map(e => {
      if (e.id !== id) return e;
      const lastW = e.sets.length > 0 ? e.sets[e.sets.length-1].weight : "";
      const lastR = e.sets.length > 0 ? e.sets[e.sets.length-1].reps : "10";
      return {...e, sets:[...e.sets,{reps:lastR, weight:lastW}]};
    }));
  };
  const removeSet = (id,si) => onChange(exercises.map(e=>e.id===id?{...e,sets:e.sets.filter((_,i)=>i!==si)}:e));
  const updSet = (id,si,field,val) => onChange(exercises.map(e=>e.id===id?{...e,sets:e.sets.map((s,i)=>i===si?{...s,[field]:val}:s)}:e));

  return (
    <div>
      {exercises.map((ex,ei) => {
        const lastW = getLastWeights(sessions, ex.name);
        return (
          <div key={ex.id} style={{...card(),border:`1px solid ${accentColor}22`,marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{width:24,height:24,borderRadius:"50%",background:accentColor+"18",color:accentColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{ei+1}</span>
              <input value={ex.name} onChange={e=>updEx(ex.id,e.target.value)} placeholder="Übungsname…" style={inp({flex:1,fontSize:14,padding:"8px 11px"})}/>
              <button onClick={()=>removeEx(ex.id)} style={iBtn()}><IcoTrash/></button>
            </div>
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:8,marginBottom:8,WebkitOverflowScrolling:"touch"}}>
              {EX_PRESETS.map(p=><button key={p} onClick={()=>updEx(ex.id,p)} style={pill(accentColor,ex.name===p)}>{p}</button>)}
            </div>
            {lastW && (
              <div style={{background:accentColor+"0d",border:`1px solid ${accentColor}22`,borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:12,color:accentColor,fontWeight:600}}>
                💡 Letztes Mal: {lastW.map((w,i)=>`Set ${i+1}: ${w||"–"}kg`).join(" · ")}
              </div>
            )}
            <div style={{background:C.bg,borderRadius:10,padding:"10px 10px 6px"}}>
              <div style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 30px",gap:6,marginBottom:4}}>
                {["#","Wdh.","kg",""].map((h,i)=><span key={i} style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",textAlign:"center"}}>{h}</span>)}
              </div>
              {ex.sets.map((set,si)=>(
                <div key={si} style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 30px",gap:6,marginBottom:6,alignItems:"center"}}>
                  <span style={{width:22,height:22,borderRadius:"50%",background:accentColor+"18",color:accentColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,margin:"0 auto"}}>{si+1}</span>
                  <input type="number" min="1" value={set.reps} onChange={e=>updSet(ex.id,si,"reps",e.target.value)} style={setInp}/>
                  <input type="number" min="0" step="0.5" placeholder="kg" value={set.weight} onChange={e=>updSet(ex.id,si,"weight",e.target.value)} style={setInp}/>
                  <button onClick={()=>removeSet(ex.id,si)} style={iBtn({opacity:ex.sets.length<=1?.3:1})}><IcoTrash/></button>
                </div>
              ))}
            </div>
            <button onClick={()=>addSet(ex.id)} style={{background:"transparent",border:`1px dashed ${C.border}`,borderRadius:8,padding:"7px 12px",color:C.light,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,width:"100%",fontFamily:"inherit",marginTop:8}}>
              <IcoPlus s={13}/> Set hinzufügen
            </button>
          </div>
        );
      })}
      <button onClick={addEx} style={{width:"100%",background:accentColor+"10",border:`1.5px dashed ${accentColor}66`,borderRadius:12,padding:"13px",color:accentColor,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontFamily:"inherit"}}>
        <IcoPlus/> Übung hinzufügen
      </button>
    </div>
  );
}

// ─── Repeat section ──────────────────────────────────────────────
function RepeatPicker({value, onChange, date}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,background:C.bg,borderRadius:12,padding:12}}>
      {[["none","Einmalig"],["weekly","Jede Woche"],["biweekly","Alle 2 Wochen"]].map(([v,l])=>(
        <button key={v} onClick={()=>onChange(v)} style={{display:"flex",alignItems:"center",gap:10,background:value===v?C.accL:"transparent",border:`1.5px solid ${value===v?C.acc:"transparent"}`,borderRadius:10,padding:"10px 12px",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
          <span style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${value===v?C.acc:C.border}`,background:value===v?C.acc:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {value===v&&<span style={{width:8,height:8,borderRadius:"50%",background:"#fff",display:"block"}}/>}
          </span>
          <span style={{fontSize:14,fontWeight:value===v?700:500,color:value===v?C.acc:C.text}}>{l}</span>
          {v!=="none"&&value===v&&date&&<span style={{marginLeft:"auto",fontSize:12,color:C.acc,fontWeight:600}}>jeden {WDAYS[(new Date(date+"T12:00").getDay()+6)%7]}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Gym Plan/Log Form ───────────────────────────────────────────
function GymForm({initial, mode, onSave, onCancel, sessions, workoutTemplates, onSaveTemplate}) {
  const [form, setForm] = useState(()=>({
    id: initial.id||uid(), type:"gym",
    date: initial.date||todayISO(), time: initial.time||"",
    label: initial.label||"", exercises: initial.exercises?.map(e=>({...e,id:e.id||uid(),sets:e.sets.map(s=>({...s}))||[]})) || [],
    repeat: initial.repeat||"none",
  }));
  const u = (k,v) => setForm(f=>({...f,[k]:v}));
  const valid = form.label && form.exercises.length>0;
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [saveTplName, setSaveTplName] = useState("");
  const [showSaveTpl, setShowSaveTpl] = useState(false);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
        <button onClick={onCancel} style={iBtn({background:C.bg,border:`1px solid ${C.border}`,padding:"8px 12px",gap:5,color:C.sub})}><IcoX/><span style={{fontSize:13,fontFamily:"inherit"}}>Abbrechen</span></button>
        <h2 style={{margin:0,fontSize:18,fontWeight:800,flex:1,color:C.text}}>{mode==="plan"?"Gym planen":"Gym eintragen"}</h2>
        <button onClick={()=>valid&&onSave(form)} style={{background:C.gym,border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontSize:14,fontWeight:700,cursor:valid?"pointer":"not-allowed",opacity:valid?1:.4,fontFamily:"inherit"}}>Speichern</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <Fld label="Datum" mb={0}><input type="date" value={form.date} onChange={e=>u("date",e.target.value)} style={inp({fontSize:14})}/></Fld>
          {mode==="plan"&&<Fld label="Uhrzeit" mb={0}><input type="time" value={form.time} onChange={e=>u("time",e.target.value)} style={inp({fontSize:14})}/></Fld>}
        </div>

        {/* Template picker */}
        {workoutTemplates.length>0&&(
          <div style={{marginBottom:14}}>
            <button onClick={()=>setShowTplPicker(v=>!v)} style={{width:"100%",background:C.tplL,border:`1.5px solid ${C.tplB}`,borderRadius:12,padding:"11px 14px",color:C.tpl,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit"}}>
              <IcoStarFill s={16}/> Vorlage laden {showTplPicker?"▲":"▼"}
            </button>
            {showTplPicker&&(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginTop:6,overflow:"hidden"}}>
                {workoutTemplates.map(t=>(
                  <button key={t.id} onClick={()=>{u("label",t.label);u("exercises",t.exercises.map(e=>({...e,id:uid(),sets:e.sets.map(s=>({...s}))})));setShowTplPicker(false);}} style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,padding:"12px 14px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>{t.emoji||"💪"}</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.text}}>{t.label}</div>
                      <div style={{fontSize:12,color:C.sub}}>{t.exercises.length} Übungen</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Fld label="Einheit">
          <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:8,WebkitOverflowScrolling:"touch"}}>
            {GYM_LABELS.map(l=><button key={l} onClick={()=>u("label",l)} style={pill(C.gym,form.label===l)}>{l}</button>)}
          </div>
          <input placeholder="oder eigene Bezeichnung…" value={form.label} onChange={e=>u("label",e.target.value)} style={inp({marginTop:8})}/>
        </Fld>

        <Lbl>Übungen</Lbl>
        <ExerciseBuilder exercises={form.exercises} onChange={v=>u("exercises",v)} accentColor={C.gym} sessions={sessions}/>

        {/* Save as template */}
        {form.exercises.length>0&&onSaveTemplate&&(
          <div style={{marginBottom:14}}>
            {!showSaveTpl
              ? <button onClick={()=>{setSaveTplName(form.label);setShowSaveTpl(true);}} style={{width:"100%",background:C.tplL,border:`1px dashed ${C.tpl}`,borderRadius:10,padding:"10px",color:C.tpl,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontFamily:"inherit"}}>
                  <IcoStar s={14}/> Als Vorlage speichern
                </button>
              : <div style={{background:C.tplL,border:`1px solid ${C.tplB}`,borderRadius:10,padding:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.tpl,marginBottom:8}}>VORLAGENNAME</div>
                  <input value={saveTplName} onChange={e=>setSaveTplName(e.target.value)} placeholder="z.B. Leg Day #1" style={inp({marginBottom:8})}/>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setShowSaveTpl(false)} style={{...iBtn({background:C.bg,border:`1px solid ${C.border}`,padding:"8px 14px",color:C.sub}),fontSize:13,fontFamily:"inherit"}}>Abbrechen</button>
                    <button onClick={()=>{onSaveTemplate({id:uid(),label:saveTplName||form.label,emoji:"💪",exercises:form.exercises.map(e=>({...e,id:uid()}))});setShowSaveTpl(false);}} style={{flex:1,background:C.tpl,border:"none",borderRadius:9,padding:"9px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Speichern</button>
                  </div>
                </div>
            }
          </div>
        )}

        {mode==="plan"&&<Fld label="Wiederholung"><RepeatPicker value={form.repeat} onChange={v=>u("repeat",v)} date={form.date}/></Fld>}
        <div style={{height:30}}/>
      </div>
    </div>
  );
}

// ─── Cardio Form ─────────────────────────────────────────────────
function CardioForm({initial, mode, onSave, onCancel}) {
  const [form, setForm] = useState(()=>({
    id: initial.id||uid(), type:"cardio",
    date: initial.date||todayISO(), time: initial.time||"",
    sport: initial.sport||"jogging",
    minutes: initial.minutes||"",
    km: initial.km||"",
    note: initial.note||"",
    repeat: initial.repeat||"none",
  }));
  const u = (k,v) => setForm(f=>({...f,[k]:v}));
  const sport = cardioInfo(form.sport);
  const valid = form.sport && form.minutes;
  const pace = sport.hasPace && form.km && form.minutes
    ? calcPace(parseFloat(form.km), parseInt(form.minutes)*60)
    : null;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
        <button onClick={onCancel} style={iBtn({background:C.bg,border:`1px solid ${C.border}`,padding:"8px 12px",gap:5,color:C.sub})}><IcoX/><span style={{fontSize:13,fontFamily:"inherit"}}>Abbrechen</span></button>
        <h2 style={{margin:0,fontSize:18,fontWeight:800,flex:1}}>{mode==="plan"?"Cardio planen":"Cardio eintragen"}</h2>
        <button onClick={()=>valid&&onSave(form)} style={{background:C.cardio,border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontSize:14,fontWeight:700,cursor:valid?"pointer":"not-allowed",opacity:valid?1:.4,fontFamily:"inherit"}}>Speichern</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:16,WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <Fld label="Datum" mb={0}><input type="date" value={form.date} onChange={e=>u("date",e.target.value)} style={inp({fontSize:14})}/></Fld>
          {mode==="plan"&&<Fld label="Uhrzeit" mb={0}><input type="time" value={form.time} onChange={e=>u("time",e.target.value)} style={inp({fontSize:14})}/></Fld>}
        </div>

        <Fld label="Sportart">
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {CARDIO_SPORTS.map(s=>(
              <button key={s.id} onClick={()=>u("sport",s.id)} style={{background:form.sport===s.id?C.cardioL:C.bg,border:`1.5px solid ${form.sport===s.id?C.cardio:C.border}`,borderRadius:12,padding:"10px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontFamily:"inherit"}}>
                <span style={{fontSize:22}}>{s.emoji}</span>
                <span style={{fontSize:11,fontWeight:form.sport===s.id?700:500,color:form.sport===s.id?C.cardio:C.sub}}>{s.label}</span>
              </button>
            ))}
          </div>
        </Fld>

        <Fld label="Dauer (Minuten)">
          <input type="number" min="1" placeholder="45" value={form.minutes} onChange={e=>u("minutes",e.target.value)} style={inp()}/>
        </Fld>

        {sport.hasKm&&(
          <Fld label="Distanz (km) – optional">
            <input type="number" min="0" step="0.1" placeholder="5.0" value={form.km} onChange={e=>u("km",e.target.value)} style={inp()}/>
            {pace&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}><span style={{fontSize:12,color:C.cardio,fontWeight:700,background:C.cardioL,borderRadius:8,padding:"4px 10px"}}>⚡ {pace}</span></div>}
          </Fld>
        )}

        <Fld label="Notiz (optional)">
          <input placeholder="Route, Gefühl, Bemerkung…" value={form.note} onChange={e=>u("note",e.target.value)} style={inp()}/>
        </Fld>

        {mode==="plan"&&<Fld label="Wiederholung"><RepeatPicker value={form.repeat} onChange={v=>u("repeat",v)} date={form.date}/></Fld>}
        <div style={{height:30}}/>
      </div>
    </div>
  );
}

// ─── Move Plan Modal ─────────────────────────────────────────────
function MovePlanModal({plan, onMove, onClose}) {
  const [selectedDate, setSelectedDate] = useState(plan.date);
  return (
    <div style={{position:"fixed",inset:0,background:"#11182766",zIndex:400,display:"flex",alignItems:"flex-end"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"20px 20px 0 0",width:"100%",paddingBottom:"env(safe-area-inset-bottom,16px)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:C.border}}/></div>
        <div style={{padding:"8px 16px 16px"}}>
          <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Einheit verschieben</div>
          <div style={{fontSize:13,color:C.sub,marginBottom:16}}>Von: {fmtDate(plan.date)}</div>
          <Fld label="Neues Datum">
            <input type="date" value={selectedDate} min={todayISO()} onChange={e=>setSelectedDate(e.target.value)} style={inp()}/>
          </Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={onClose} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px",color:C.sub,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Abbrechen</button>
            <button onClick={()=>selectedDate&&selectedDate!==plan.date&&onMove(selectedDate)} style={{background:C.acc,border:"none",borderRadius:12,padding:"13px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:selectedDate&&selectedDate!==plan.date?1:.4}}>Verschieben</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Row ────────────────────────────────────────────────────
function PlanRow({plan, onStart, onEdit, onDelete, onMove}) {
  const isGym = plan.type==="gym";
  const isCardio = plan.type==="cardio";
  const overdue = plan.date<todayISO();
  const color = isGym?C.gym:C.cardio;
  const bgColor = isGym?C.gymL:C.cardioL;
  const sport = isCardio?cardioInfo(plan.sport):null;
  const totalSets = isGym?plan.exercises?.reduce((a,e)=>a+e.sets.length,0):0;
  return (
    <div style={{...card(),borderLeft:`3px solid ${overdue?C.red:color}`,marginBottom:8,padding:"12px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:bgColor,color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:isCardio?20:14}}>
          {isGym?<IcoDumbbell s={18}/>:sport.emoji}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2}}>
            {isGym?(plan.label||"Gym-Einheit"):`${sport.label}${plan.km?` · ${plan.km}km`:""}`}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:5}}>
            {plan.time&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:12,color:C.sub}}><IcoClock/> {plan.time} Uhr</span>}
            {plan.minutes&&<span style={{fontSize:12,color:C.sub}}>{plan.minutes} min</span>}
            {isGym&&plan.exercises?.length>0&&<span style={{fontSize:12,color:C.sub}}>{plan.exercises.length} Übg. · {totalSets} Sets</span>}
            {plan.repeat!=="none"&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11,background:C.accL,color:C.acc,borderRadius:6,padding:"2px 7px",fontWeight:600}}><IcoRepeat/> {plan.repeat==="weekly"?"Wöchentlich":"2-wöchentlich"}</span>}
            {overdue&&<span style={{fontSize:11,background:C.redL,color:C.red,borderRadius:6,padding:"2px 7px",fontWeight:700}}>Überfällig</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:3,flexShrink:0}}>
          <button onClick={onMove} style={iBtn({padding:5})} title="Verschieben"><IcoMove/></button>
          <button onClick={onEdit} style={iBtn({padding:5})}><IcoEdit/></button>
          <button onClick={onStart} style={{background:color,border:"none",borderRadius:9,padding:"7px 10px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Start</button>
          <button onClick={onDelete} style={iBtn({padding:5})}><IcoTrash/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Session Row ─────────────────────────────────────────────────
function SessionRow({session, expanded, onToggle, onDelete}) {
  const isGym = session.type==="gym";
  const isCardio = session.type==="cardio";
  const color = isGym?C.gym:C.cardio;
  const bgColor = isGym?C.gymL:C.cardioL;
  const sport = isCardio?cardioInfo(session.sport):null;
  const totalSets = isGym?session.exercises?.reduce((a,e)=>a+e.sets.length,0):0;
  const totalReps = isGym?session.exercises?.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(parseInt(s.reps)||0),0),0):0;
  return (
    <div style={card()}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={onToggle}>
        <div style={{width:40,height:40,borderRadius:11,background:bgColor,color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:isCardio?22:14}}>
          {isGym?<IcoDumbbell/>:sport.emoji}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:2}}>
            {isGym?session.label:`${sport.label}${session.km?` · ${session.km}km`:""}`}
          </div>
          <div style={{fontSize:12,color:C.sub}}>
            {fmtDate(session.date)} &nbsp;·&nbsp;
            {isGym?`${session.exercises?.length||0} Übg. · ${totalSets} Sets · ${totalReps} Wdh.`:`${session.minutes} min${session.km?` · ${calcPace(session.km,session.minutes*60)}`:""}` }
          </div>
        </div>
        <span style={{color:C.light}}><IcoChev open={expanded}/></span>
      </div>
      {expanded&&(
        <div style={{borderTop:`1px solid ${C.border}`,marginTop:12,paddingTop:12}}>
          {isGym?session.exercises?.map(ex=>(
            <div key={ex.id} style={{marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>{ex.name}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {ex.sets.map((s,i)=>(
                  <span key={i} style={{background:C.gymL,border:`1px solid ${C.gymB}`,color:C.gym,borderRadius:7,padding:"3px 9px",fontSize:12,fontWeight:600}}>{i+1}: {s.reps}×{s.weight||"–"}kg</span>
                ))}
              </div>
            </div>
          )):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              {[
                ["Sportart",sport.emoji+" "+sport.label],
                ["Dauer",session.minutes+" min"],
                ...(session.km?[["Distanz",session.km+" km"],["Pace",calcPace(session.km,session.minutes*60)]]: []),
                ...(session.note?[["Notiz",session.note]]:[]),
              ].map(([l,v])=>(
                <div key={l} style={{background:C.cardioL,border:`1px solid ${C.cardioB}`,borderRadius:9,padding:"9px 11px"}}>
                  <div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:15,fontWeight:800,color:C.text}}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={onDelete} style={{background:C.redL,border:`1px solid ${C.red}33`,borderRadius:9,color:C.red,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
            <IcoTrash/> Löschen
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Day Modal ───────────────────────────────────────────────────
function DayModal({dateISO, sessions, plans, onClose, onAddPlan, onEditPlan, onDeletePlan, onStartPlan, onLogDirect, onMovePlan}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#11182766",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"20px 20px 0 0",width:"100%",maxHeight:"85vh",display:"flex",flexDirection:"column",paddingBottom:"env(safe-area-inset-bottom,16px)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}><div style={{width:36,height:4,borderRadius:2,background:C.border}}/></div>
        <div style={{padding:"4px 16px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,color:C.light,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>Tag</div>
          <div style={{fontSize:18,fontWeight:800}}>{fmtDateLong(dateISO)}</div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16,WebkitOverflowScrolling:"touch"}}>
          {sessions.length>0&&(
            <div style={{marginBottom:14}}>
              <SecTitle>✅ Absolviert</SecTitle>
              {sessions.map(s=>{
                const isGym=s.type==="gym";
                const sport=s.type==="cardio"?cardioInfo(s.sport):null;
                return (
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,background:isGym?C.gymL:C.cardioL,borderRadius:11,padding:"10px 12px",marginBottom:7}}>
                    <span style={{fontSize:isGym?14:20,color:isGym?C.gym:C.cardio}}>{isGym?<IcoDumbbell s={17}/>:sport.emoji}</span>
                    <span style={{fontSize:14,fontWeight:700,flex:1}}>{isGym?s.label:`${sport.label}${s.minutes?" · "+s.minutes+" min":""}`}</span>
                    <span style={{fontSize:11,color:C.green,fontWeight:700}}>✓</span>
                  </div>
                );
              })}
            </div>
          )}
          {plans.length>0&&(
            <div style={{marginBottom:14}}>
              <SecTitle>📌 Geplant</SecTitle>
              {plans.map(p=>{
                const isGym=p.type==="gym";
                const sport=p.type==="cardio"?cardioInfo(p.sport):null;
                return (
                  <div key={p.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:11,padding:"10px 12px",marginBottom:7}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:isGym?14:20,color:isGym?C.gym:C.cardio}}>{isGym?<IcoDumbbell s={17}/>:sport.emoji}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700}}>{isGym?(p.label||"Gym-Einheit"):`${sport.label}${p.minutes?" · "+p.minutes+" min":""}`}</div>
                        {p.time&&<div style={{fontSize:12,color:C.sub}}>{p.time} Uhr</div>}
                        {isGym&&p.exercises?.length>0&&<div style={{fontSize:12,color:C.sub,marginTop:2}}>{p.exercises.map(e=>e.name).filter(Boolean).join(" · ")}</div>}
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>onMovePlan(p)} style={iBtn({padding:5})} title="Verschieben"><IcoMove/></button>
                        <button onClick={()=>onEditPlan(p)} style={iBtn({padding:5})}><IcoEdit/></button>
                        <button onClick={()=>{onStartPlan(p);onClose();}} style={{background:isGym?C.gym:C.cardio,border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Start</button>
                        <button onClick={()=>onDeletePlan(p.id)} style={iBtn({padding:5})}><IcoTrash/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <SecTitle>➕ Planen</SecTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <button onClick={()=>onAddPlan("gym")} style={{background:C.gymL,border:`1.5px solid ${C.gymB}`,borderRadius:12,padding:"14px 10px",color:C.gym,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,fontFamily:"inherit"}}>
              <IcoDumbbell s={22}/>Gym planen
            </button>
            <button onClick={()=>onAddPlan("cardio")} style={{background:C.cardioL,border:`1.5px solid ${C.cardioB}`,borderRadius:12,padding:"14px 10px",color:C.cardio,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,fontFamily:"inherit"}}>
              <IcoCardio s={22}/>Cardio planen
            </button>
          </div>
          <SecTitle>⚡ Direkt eintragen</SecTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={()=>{onLogDirect("gym");onClose();}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 10px",color:C.sub,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:"inherit"}}>
              <IcoDumbbell s={20}/>Gym eintragen
            </button>
            <button onClick={()=>{onLogDirect("cardio");onClose();}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 10px",color:C.sub,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:"inherit"}}>
              <IcoCardio s={20}/>Cardio eintragen
            </button>
          </div>
          <div style={{height:20}}/>
        </div>
      </div>
    </div>
  );
}

// ─── Templates Tab ───────────────────────────────────────────────
function TemplatesTab({templates, onDelete, onUse}) {
  return (
    <div style={{padding:"16px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Vorlagen</h2>
      </div>
      {templates.length===0?(
        <div style={{textAlign:"center",padding:"52px 0",color:C.light}}>
          <div style={{fontSize:48,marginBottom:10}}>💪</div>
          <div style={{fontSize:15,fontWeight:700,color:C.sub}}>Noch keine Vorlagen</div>
          <div style={{fontSize:13,marginTop:4,color:C.light}}>Speichere ein Workout als Vorlage<br/>beim Eintragen oder Planen</div>
        </div>
      ):templates.map(t=>(
        <div key={t.id} style={card()}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:C.tplL,color:C.tpl,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{t.emoji||"💪"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:3}}>{t.label}</div>
              <div style={{fontSize:12,color:C.sub}}>{t.exercises.length} Übungen · {t.exercises.reduce((a,e)=>a+e.sets.length,0)} Sets</div>
              <div style={{fontSize:12,color:C.light,marginTop:2}}>{t.exercises.map(e=>e.name).filter(Boolean).slice(0,3).join(", ")}{t.exercises.length>3?"…":""}</div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>onUse(t)} style={{background:C.tpl,border:"none",borderRadius:9,padding:"8px 12px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Nutzen</button>
              <button onClick={()=>onDelete(t.id)} style={iBtn()}><IcoTrash/></button>
            </div>
          </div>
          <div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:5}}>
            {t.exercises.map(e=>(
              <div key={e.id} style={{background:C.gymL,border:`1px solid ${C.gymB}`,borderRadius:8,padding:"4px 10px"}}>
                <span style={{fontSize:12,fontWeight:600,color:C.gym}}>{e.name}</span>
                <span style={{fontSize:11,color:C.sub,marginLeft:5}}>{e.sets.length}×{e.sets[0]?.reps||"?"} Wdh.</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(emptyData());
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState(null);
  const [calMonth, setCalMonth] = useState(()=>{const n=new Date();return{y:n.getFullYear(),m:n.getMonth()};});
  const [dayModal, setDayModal] = useState(null);
  const [movingPlan, setMovingPlan] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [histFilter, setHistFilter] = useState("all");

  useEffect(()=>{setData(load());setLoaded(true);},[]);
  const persist = useCallback((next)=>{setData(next);save(next);},[]);

  // Expand recurring plans
  const allPlans = (() => {
    const result = [];
    const future = new Date(); future.setDate(future.getDate()+60);
    const futureISO = future.toISOString().slice(0,10);
    data.plans.forEach(p=>{
      result.push(p);
      if(p.repeat==="weekly"||p.repeat==="biweekly"){
        const step=p.repeat==="weekly"?7:14;
        let dt=new Date(p.date+"T12:00");
        for(let i=0;i<20;i++){
          dt.setDate(dt.getDate()+step);
          const iso=dt.toISOString().slice(0,10);
          if(iso>futureISO) break;
          if(!data.plans.find(b=>b.date===iso&&b.type===p.type&&b.id!==p.id)){
            result.push({...p,id:p.id+"_"+iso,date:iso,_virtual:true,_parentId:p.id});
          }
        }
      }
    });
    return result;
  })();

  const sessionsByDate={};
  data.sessions.forEach(s=>{(sessionsByDate[s.date]=sessionsByDate[s.date]||[]).push(s);});
  const plansByDate={};
  allPlans.forEach(p=>{(plansByDate[p.date]=plansByDate[p.date]||[]).push(p);});

  const t = todayISO();
  const gymSessions = data.sessions.filter(s=>s.type==="gym");
  const cardioSessions = data.sessions.filter(s=>s.type==="cardio");
  const totalMinutes = cardioSessions.reduce((a,s)=>a+(parseInt(s.minutes)||0),0);
  const todayPlans = (plansByDate[t]||[]).filter(p=>!sessionsByDate[t]?.some(s=>s.type===p.type&&(p.type!=="cardio"||s.sport===p.sport)));
  const upcomingPlans = allPlans.filter(p=>p.date>t).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const filtered = histFilter==="all"?data.sessions:data.sessions.filter(s=>s.type===histFilter);

  const buildGrid=(y,m)=>{
    let dow=new Date(y,m,1).getDay();dow=dow===0?6:dow-1;
    const cells=new Array(dow).fill(null);
    for(let d=1;d<=new Date(y,m+1,0).getDate();d++) cells.push(d);
    return cells;
  };
  const calGrid = buildGrid(calMonth.y,calMonth.m);

  const savePlan = (form) => {
    const exists=data.plans.find(p=>p.id===form.id);
    const plans=exists?data.plans.map(p=>p.id===form.id?form:p):[...data.plans,form];
    persist({...data,plans});
    setScreen(null);setDayModal(null);
  };
  const deletePlan = (id) => {
    const realId=id.includes("_")?id.split("_")[0]:id;
    persist({...data,plans:data.plans.filter(p=>p.id!==realId)});
  };
  const movePlan = (plan, newDate) => {
    const realId=plan.id.includes("_")?plan.id.split("_")[0]:plan.id;
    const plans=data.plans.map(p=>p.id===realId?{...p,date:newDate,repeat:"none"}:p);
    persist({...data,plans});
    setMovingPlan(null);setDayModal(null);
  };
  const startPlan = (p) => {setScreen({type:"log",form:{...p,id:undefined}});setDayModal(null);};
  const saveSession = (form) => {
    const session={...form,id:uid()};
    const plans=data.plans.filter(p=>!(p.date===session.date&&p.type===session.type));
    persist({...data,sessions:[session,...data.sessions],plans});
    setScreen(null);
  };
  const deleteSession = (id) => persist({...data,sessions:data.sessions.filter(s=>s.id!==id)});
  const saveTemplate = (tpl) => persist({...data,workoutTemplates:[tpl,...(data.workoutTemplates||[])]});
  const deleteTemplate = (id) => persist({...data,workoutTemplates:(data.workoutTemplates||[]).filter(t=>t.id!==id)});

  const getRealPlan = (p) => data.plans.find(x=>x.id===(p._parentId||p.id))||p;

  if(!loaded) return <div style={{height:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:"system-ui",color:C.sub}}>Laden…</div>;

  if(screen){
    const isGym = screen.form.type==="gym";
    return (
      <div style={{height:"100dvh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"'DM Sans',system-ui,sans-serif",overflow:"hidden",paddingTop:"env(safe-area-inset-top,0px)",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {isGym
          ? <GymForm initial={screen.form} mode={screen.type} onSave={saveSession} onCancel={()=>setScreen(null)} sessions={data.sessions} workoutTemplates={data.workoutTemplates||[]} onSaveTemplate={saveTemplate}/>
          : <CardioForm initial={screen.form} mode={screen.type} onSave={saveSession} onCancel={()=>setScreen(null)}/>
        }
      </div>
    );
  }
  if(screen===null&&false) {} // placeholder

  return (
    <div style={{height:"100dvh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"'DM Sans',system-ui,sans-serif",overflow:"hidden",maxWidth:430,margin:"0 auto",paddingTop:"env(safe-area-inset-top,0px)"}}>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:"calc(72px + env(safe-area-inset-bottom,16px))"}}>

        {/* ── HOME ── */}
        {tab==="home"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[
                {label:"Krafttraining",val:gymSessions.length,icon:<IcoDumbbell s={18}/>,color:C.gym,bg:C.gymL},
                {label:"Cardio",val:cardioSessions.length,icon:<IcoCardio s={18}/>,color:C.cardio,bg:C.cardioL},
                {label:"Cardio-Zeit",val:totalMinutes+"min",icon:"⏱",color:"#8B5CF6",bg:"#F5F3FF"},
                {label:"Vorlagen",val:(data.workoutTemplates||[]).length,icon:<IcoStar s={18}/>,color:C.tpl,bg:C.tplL},
              ].map(({label,val,icon,color,bg})=>(
                <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 14px",boxShadow:"0 1px 4px #0000000a"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:10,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>
                    <span style={{color,background:bg,borderRadius:8,padding:6,display:"flex"}}>{typeof icon==="string"?<span style={{fontSize:16}}>{icon}</span>:icon}</span>
                  </div>
                  <div style={{fontSize:26,fontWeight:800,color:C.text,letterSpacing:"-.5px"}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              <button onClick={()=>setScreen({type:"log",form:{type:"gym",date:t}})} style={{background:C.gymL,border:`1.5px solid ${C.gymB}`,borderRadius:14,padding:"16px 12px",cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",gap:6,fontFamily:"inherit"}}>
                <span style={{color:C.gym,background:"#fff",borderRadius:9,padding:7,display:"inline-flex",boxShadow:`0 2px 8px ${C.gym}33`}}><IcoDumbbell s={20}/></span>
                <div style={{fontSize:14,fontWeight:800,color:C.text}}>Gym eintragen</div>
                <div style={{fontSize:11,color:C.sub}}>Sets, Reps & Gewicht</div>
              </button>
              <button onClick={()=>setScreen({type:"log",form:{type:"cardio",date:t}})} style={{background:C.cardioL,border:`1.5px solid ${C.cardioB}`,borderRadius:14,padding:"16px 12px",cursor:"pointer",textAlign:"left",display:"flex",flexDirection:"column",gap:6,fontFamily:"inherit"}}>
                <span style={{color:C.cardio,background:"#fff",borderRadius:9,padding:7,display:"inline-flex",boxShadow:`0 2px 8px ${C.cardio}33`}}><IcoCardio s={20}/></span>
                <div style={{fontSize:14,fontWeight:800,color:C.text}}>Cardio eintragen</div>
                <div style={{fontSize:11,color:C.sub}}>Joggen, Rad, Volleyball…</div>
              </button>
            </div>
            {todayPlans.length>0&&(
              <div style={{marginBottom:20}}>
                <SecTitle>⚡ Heute geplant</SecTitle>
                {todayPlans.map(p=><PlanRow key={p.id} plan={p} onStart={()=>startPlan(p)} onEdit={()=>setScreen({type:"plan",form:getRealPlan(p)})} onDelete={()=>deletePlan(p.id)} onMove={()=>setMovingPlan(p)}/>)}
              </div>
            )}
            {upcomingPlans.length>0&&(
              <div style={{marginBottom:20}}>
                <SecTitle>📅 Demnächst</SecTitle>
                {upcomingPlans.map(p=><PlanRow key={p.id} plan={p} onStart={()=>startPlan(p)} onEdit={()=>setScreen({type:"plan",form:getRealPlan(p)})} onDelete={()=>deletePlan(p.id)} onMove={()=>setMovingPlan(p)}/>)}
              </div>
            )}
            {data.sessions.length>0&&(
              <div>
                <SecTitle>🕐 Zuletzt</SecTitle>
                {data.sessions.slice(0,3).map(s=><SessionRow key={s.id} session={s} expanded={expanded===s.id} onToggle={()=>setExpanded(expanded===s.id?null:s.id)} onDelete={()=>deleteSession(s.id)}/>)}
              </div>
            )}
            {data.sessions.length===0&&data.plans.length===0&&(
              <div style={{textAlign:"center",padding:"40px 0",color:C.light}}>
                <div style={{fontSize:52,marginBottom:10}}>🏋️</div>
                <div style={{fontSize:16,fontWeight:700,color:C.sub}}>Los geht's!</div>
                <div style={{fontSize:13,marginTop:4}}>Eintragen oder im Kalender planen</div>
              </div>
            )}
          </div>
        )}

        {/* ── CALENDAR ── */}
        {tab==="calendar"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <button onClick={()=>setCalMonth(({y,m})=>m===0?{y:y-1,m:11}:{y,m:m-1})} style={{...iBtn(),background:C.surface,border:`1px solid ${C.border}`,padding:10}}><IcoLeft/></button>
              <span style={{fontSize:17,fontWeight:800}}>{MONTHS[calMonth.m]} {calMonth.y}</span>
              <button onClick={()=>setCalMonth(({y,m})=>m===11?{y:y+1,m:0}:{y,m:m+1})} style={{...iBtn(),background:C.surface,border:`1px solid ${C.border}`,padding:10}}><IcoRight/></button>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
              {[[C.gym,"Kraft"],[C.cardio,"Cardio"]].map(([c,l])=>(
                <span key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.sub}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:c}}/>{l} erledigt &nbsp;
                  <span style={{width:8,height:8,borderRadius:"50%",border:`1.5px dashed ${c}`,background:"transparent"}}/>{l} geplant
                </span>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
              {DAYS_DE.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.light,textTransform:"uppercase"}}>{d}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {calGrid.map((day,i)=>{
                if(!day) return <div key={i}/>;
                const ds=dateKey(calMonth.y,calMonth.m,day);
                const sess=sessionsByDate[ds]||[];
                const plans=plansByDate[ds]||[];
                const isToday=ds===t;
                const gymDone=sess.some(s=>s.type==="gym");
                const cardioDone=sess.some(s=>s.type==="cardio");
                const gymPlan=plans.some(p=>p.type==="gym");
                const cardioPlan=plans.some(p=>p.type==="cardio");
                return (
                  <div key={i} onClick={()=>setDayModal(ds)} style={{background:isToday?C.accL:C.surface,border:`${isToday?2:1}px solid ${isToday?C.acc:C.border}`,borderRadius:10,padding:"6px 5px",minHeight:52,cursor:"pointer",display:"flex",flexDirection:"column",gap:3}}>
                    <span style={{fontSize:12,fontWeight:isToday?800:500,color:isToday?C.acc:C.text}}>{day}</span>
                    <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
                      {gymDone&&<Dot color={C.gym}/>}
                      {cardioDone&&<Dot color={C.cardio}/>}
                      {!gymDone&&gymPlan&&<Dot color={C.gym} dashed/>}
                      {!cardioDone&&cardioPlan&&<Dot color={C.cardio} dashed/>}
                    </div>
                  </div>
                );
              })}
            </div>
            {allPlans.filter(p=>p.date>=t).length>0&&(
              <div style={{marginTop:20}}>
                <SecTitle>📋 Alle geplanten Einheiten</SecTitle>
                {allPlans.filter(p=>p.date>=t).sort((a,b)=>a.date.localeCompare(b.date)).map(p=>(
                  <PlanRow key={p.id} plan={p} onStart={()=>startPlan(p)} onEdit={()=>setScreen({type:"plan",form:getRealPlan(p)})} onDelete={()=>deletePlan(p.id)} onMove={()=>setMovingPlan(p)}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab==="history"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Verlauf</h2>
              <div style={{display:"flex",gap:6}}>
                {[["all","Alle"],["gym","Gym"],["cardio","Cardio"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setHistFilter(v)} style={{background:histFilter===v?C.accL:C.surface,color:histFilter===v?C.acc:C.sub,border:`1px solid ${histFilter===v?C.accB:C.border}`,borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
                ))}
              </div>
            </div>
            {filtered.length===0
              ?<div style={{textAlign:"center",color:C.light,padding:"52px 0"}}>Keine Einträge.</div>
              :filtered.map(s=><SessionRow key={s.id} session={s} expanded={expanded===s.id} onToggle={()=>setExpanded(expanded===s.id?null:s.id)} onDelete={()=>deleteSession(s.id)}/>)}
          </div>
        )}

        {/* ── TEMPLATES ── */}
        {tab==="templates"&&(
          <TemplatesTab
            templates={data.workoutTemplates||[]}
            onDelete={deleteTemplate}
            onUse={(t)=>setScreen({type:"log",form:{type:"gym",date:todayISO(),label:t.label,exercises:t.exercises.map(e=>({...e,id:uid(),sets:e.sets.map(s=>({...s}))}))}})}
          />
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom,0px)",zIndex:100,boxShadow:"0 -2px 16px #0000000d"}}>
        {[
          {id:"home",label:"Home",icon:<IcoHome/>},
          {id:"calendar",label:"Kalender",icon:<IcoCal/>},
          {id:"templates",label:"Vorlagen",icon:<IcoTemplates/>},
          {id:"history",label:"Verlauf",icon:<IcoHistory/>},
        ].map(({id,label,icon})=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,background:"transparent",border:"none",padding:"10px 2px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontFamily:"inherit"}}>
            <span style={{color:tab===id?C.acc:C.light}}>{icon}</span>
            <span style={{fontSize:10,fontWeight:tab===id?700:500,color:tab===id?C.acc:C.light}}>{label}</span>
          </button>
        ))}
      </div>

      {dayModal&&(
        <DayModal
          dateISO={dayModal}
          sessions={sessionsByDate[dayModal]||[]}
          plans={plansByDate[dayModal]||[]}
          onClose={()=>setDayModal(null)}
          onAddPlan={(type)=>{setDayModal(null);setScreen({type:"plan",form:{id:uid(),type,date:dayModal,exercises:[],repeat:"none"}});}}
          onEditPlan={(p)=>{setDayModal(null);setScreen({type:"plan",form:getRealPlan(p)});}}
          onDeletePlan={deletePlan}
          onStartPlan={startPlan}
          onLogDirect={(type)=>setScreen({type:"log",form:{type,date:dayModal}})}
          onMovePlan={(p)=>{setDayModal(null);setMovingPlan(p);}}
        />
      )}

      {movingPlan&&(
        <MovePlanModal
          plan={movingPlan}
          onMove={(newDate)=>movePlan(movingPlan,newDate)}
          onClose={()=>setMovingPlan(null)}
        />
      )}
    </div>
  );
}
