/* ════════════════════════════════════════════════════════
   MEP STUDIO — state, persistence, boot
════════════════════════════════════════════════════════ */
const LS_KEY = 'mepstudio.project.v1';      // legacy single-project key (migrated into the store)
const LS_STORE = 'mepstudio.store.v1';      // {cur, projects:[{id,name,updated,data}]}
const LS_PREF = 'mepstudio.prefs.v1';

let S = null;

const App = {
  _uid: 1,
  nid(){ return App._uid++; },

  blank(){
    return {
      v: 1,
      units: 'si',
      meta: {
        name:'New MEP Project', client:'', engineer:'', date:new Date().toISOString().slice(0,10),
        country:'KSA', city:'', buildingType:'office', height:12
      },
      ov: {hvac:{}, plumb:{}, fire:{}},          // project-level field overrides
      hvacSys: {diversity:0.85},
      plumbSys: {municipalPressure:300, storageDays:null, rainfall:null, roofArea:null},
      fireSys: {standpipe:true, duration:null},
      floors: []
    };
  },

  newSpace(name, type){
    return {
      id: App.nid(), name, type: type||'Office',
      area: 25, occAuto: true, occupants: spaceOcc(type||'Office', 25),
      disc: {hvac:true, plumb:true, fire:true},
      ov: {hvac:{}, plumb:{}, fire:{}},
      fixtures: {}
    };
  },
  newFloor(name, level){ return {id:App.nid(), name, level:level||'middle', spaces:[]}; },

  /* sync uid counter above any loaded ids */
  syncUid(){
    let mx=0;
    (S.floors||[]).forEach(f=>{ mx=Math.max(mx,f.id||0); (f.spaces||[]).forEach(sp=>mx=Math.max(mx,sp.id||0)); });
    App._uid = mx+1;
  },

  /* ── persistence — multi-project store, every project saved locally ── */
  store: {cur:null, projects:[]},
  pid(){ return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); },

  persistStore(){
    try{
      localStorage.setItem(LS_STORE, JSON.stringify(App.store));
      const el=document.getElementById('saveState');
      if(el){ el.textContent='Saved ✓'; clearTimeout(App._sh); App._sh=setTimeout(()=>el.textContent='Saved',1400); }
    }catch(e){ /* storage unavailable (file:// in some browsers) — session-only */ }
  },
  save(){
    let p=App.store.projects.find(x=>x.id===App.store.cur);
    if(!p){ p={id:App.pid()}; App.store.projects.push(p); App.store.cur=p.id; }
    p.name=S.meta.name||'Untitled'; p.updated=Date.now(); p.data=S;
    App.persistStore();
    if(typeof UI!=='undefined' && UI.renderSidebar) UI.renderSidebar();
  },
  load(){
    try{
      const raw=localStorage.getItem(LS_STORE);
      if(raw){
        const st=JSON.parse(raw);
        if(st && Array.isArray(st.projects)) App.store=st;
      } else {
        /* migrate legacy single-project save into the store */
        const old=localStorage.getItem(LS_KEY);
        if(old){
          const data=JSON.parse(old);
          App.store={cur:null, projects:[{id:App.pid(), name:(data.meta&&data.meta.name)||'Untitled', updated:Date.now(), data}]};
          App.store.cur=App.store.projects[0].id;
          localStorage.removeItem(LS_KEY);
          App.persistStore();
        }
      }
    }catch(e){}
    const p=App.store.projects.find(x=>x.id===App.store.cur) || App.store.projects[0];
    if(p){ App.store.cur=p.id; S=Object.assign(App.blank(), p.data); App.syncUid(); return true; }
    S=App.blank();
    App.store.cur=null;
    return false;
  },
  openProject(id){
    if(id===App.store.cur) return;
    const p=App.store.projects.find(x=>x.id===id); if(!p) return;
    App.save();                      // snapshot current before switching
    App.store.cur=id;
    S=Object.assign(App.blank(), p.data); App.syncUid();
    App.persistStore();
    syncUnitSeg();
    UI.tab('project');
    UI.renderSidebar();
    toast('Opened "'+(p.name||'Untitled')+'"');
  },
  newProject(){
    App.save();
    S=App.blank(); App._uid=1;
    App.store.cur=null;              // App.save() will create the entry
    App.save();
    UI.tab('project');
    toast('New project started');
  },
  deleteProject(id){
    const p=App.store.projects.find(x=>x.id===id); if(!p) return;
    if(!confirm('Delete "'+(p.name||'Untitled')+'" permanently? This cannot be undone.')) return;
    App.store.projects=App.store.projects.filter(x=>x.id!==id);
    if(App.store.cur===id){
      const nxt=App.store.projects[0];
      if(nxt){ App.store.cur=nxt.id; S=Object.assign(App.blank(), nxt.data); App.syncUid(); }
      else { App.store.cur=null; S=App.blank(); App._uid=1; App.save(); }
      UI.tab('project');
    }
    App.persistStore();
    UI.renderSidebar();
    toast('Project deleted');
  },
  dupProject(id){
    const p=App.store.projects.find(x=>x.id===id); if(!p) return;
    if(id===App.store.cur) App.save();
    const cp={id:App.pid(), name:(p.name||'Untitled')+' copy', updated:Date.now(), data:JSON.parse(JSON.stringify(p.data))};
    cp.data.meta.name=cp.name;
    App.store.projects.push(cp);
    App.persistStore();
    UI.renderSidebar();
    toast('Project duplicated');
  },
  reset(){ S=App.blank(); App._uid=1; App.save(); UI.tab('project'); toast('Project cleared'); },

  exportFile(){
    const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=(S.meta.name||'mep-project').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-')+'.json';
    a.click(); URL.revokeObjectURL(a.href);
    toast('Project exported');
  },
  importFile(inp){
    const file=inp.files && inp.files[0]; if(!file) return;
    const rd=new FileReader();
    rd.onload=()=>{
      try{
        const data=JSON.parse(rd.result);
        if(!data.meta || !Array.isArray(data.floors)) throw new Error('not a MEP Studio project');
        App.save();                  // snapshot current before switching
        S=Object.assign(App.blank(), data);
        App.syncUid();
        App.store.cur=null;          // imported file becomes a new saved project
        App.save(); UI.tab('project'); toast('Project imported');
      }catch(e){ toast('⚠ Could not read that file'); }
    };
    rd.readAsText(file); inp.value='';
  },

  /* ── sample project ── */
  loadSample(){
    App.save();                      // snapshot current; sample becomes a new saved project
    App.store.cur=null;
    S=App.blank();
    App._uid=1;
    S.meta={name:'Al Noor Office Tower', client:'Al Noor Development', engineer:'MEP Engineer',
      date:new Date().toISOString().slice(0,10), country:'KSA', city:'Riyadh', buildingType:'office', height:16};
    const mk=(name,type,area,fix)=>{
      const sp=App.newSpace(name,type); sp.area=area; sp.occupants=spaceOcc(type,area); sp.fixtures=fix||{};
      return sp;
    };
    const g=App.newFloor('Ground Floor','ground');
    g.spaces=[
      mk('Reception & Lobby','Reception',120),
      mk('Meeting Room A','Meeting Room',45),
      mk('Cafeteria','Restaurant',90,{lav:2,sink:2,fd:2}),
      mk('Kitchen','Kitchen',30,{sink:2,fd:2}),
      mk('Toilets — GF','Toilet',28,{wc:6,lav:6,fd:3}),
      mk('Parking (covered)','Parking',400)
    ];
    const t1=App.newFloor('Typical Floor (×3)','middle');
    t1.spaces=[
      mk('Open Office','Office',320),
      mk('Manager Offices','Office',80),
      mk('Meeting Room','Meeting Room',35),
      mk('Server Room','Server Room',18),
      mk('Toilets','Toilet',26,{wc:5,lav:5,fd:2}),
      mk('Pantry','Kitchen',12,{sink:1,fd:1})
    ];
    const rf=App.newFloor('Roof Floor','top');
    rf.spaces=[
      mk('Executive Office','Office',150),
      mk('Boardroom','Meeting Room',60),
      mk('Prayer Room','Mosque',40),
      mk('Toilets — Roof','Toilet',20,{wc:4,lav:4,fd:2})
    ];
    S.floors=[g,t1,rf];
    App.save(); UI.tab('project'); toast('Sample project loaded');
  },

  /* ── prefs (theme/units/density persist separately) ── */
  savePrefs(){
    try{ localStorage.setItem(LS_PREF, JSON.stringify({
      theme:document.documentElement.dataset.theme,
      units:S.units,
      density:document.documentElement.dataset.density||''
    })); }catch(e){}
  },
  loadPrefs(){
    try{ return JSON.parse(localStorage.getItem(LS_PREF)||'{}'); }catch(e){ return {}; }
  }
};

/* ── boot ── */
(function init(){
  App.load();
  const prefs=App.loadPrefs();
  if(prefs.units) S.units=prefs.units;
  setTheme(prefs.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'));
  if(prefs.density) document.documentElement.dataset.density=prefs.density;
  syncUnitSeg();

  /* main tab clicks */
  document.querySelectorAll('#mainTabs button').forEach(b=>b.addEventListener('click',()=>UI.tab(b.dataset.tab)));

  /* unit segment */
  document.querySelectorAll('#unitSeg button').forEach(b=>b.addEventListener('click',()=>{
    S.units=b.dataset.u; syncUnitSeg(); App.save(); App.savePrefs(); UI.refresh();
  }));

  /* theme */
  document.getElementById('themeBtn').addEventListener('click',()=>{
    setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
    App.savePrefs();
  });

  /* project menu */
  const menu=document.getElementById('projMenu');
  document.getElementById('menuBtn').addEventListener('click',e=>{ e.stopPropagation(); menu.classList.toggle('show'); });
  document.addEventListener('click',e=>{ if(!menu.contains(e.target)) menu.classList.remove('show'); });

  /* sheet close on backdrop / Esc */
  document.getElementById('sheetBg').addEventListener('click',()=>UI.closeSheet());
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ UI.closeSheet(); UI.toggleSidebar(false); closeModal('modalLinear'); } });

  /* macOS traffic lights */
  document.getElementById('lightClose').addEventListener('click',()=>{
    App.save();
    UI.toggleSidebar(true);
    toast('Project saved — pick or create another');
  });
  document.getElementById('lightMin').addEventListener('click',()=>{
    const on=document.documentElement.dataset.density==='compact';
    if(on) delete document.documentElement.dataset.density;
    else document.documentElement.dataset.density='compact';
    App.savePrefs();
    toast(on?'Comfortable layout':'Compact layout');
  });
  document.getElementById('lightZoom').addEventListener('click',()=>{
    if(document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(()=>toast('Fullscreen not available'));
  });

  /* projects sidebar */
  document.getElementById('sideBtn').addEventListener('click',()=>UI.toggleSidebar());
  document.getElementById('sideBg').addEventListener('click',()=>UI.toggleSidebar(false));
  document.getElementById('modalLinear').addEventListener('click',e=>{ if(e.target.id==='modalLinear') closeModal('modalLinear'); });
  UI.renderSidebar();

  UI.tab('project');
})();

function setTheme(t){
  document.documentElement.dataset.theme=t;
  document.getElementById('icSun').style.display = t==='dark'?'none':'';
  document.getElementById('icMoon').style.display = t==='dark'?'':'none';
}
function syncUnitSeg(){
  document.querySelectorAll('#unitSeg button').forEach(b=>b.classList.toggle('on',b.dataset.u===S.units));
}
