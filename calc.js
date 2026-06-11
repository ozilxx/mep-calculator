/* ════════════════════════════════════════════════════════
   MEP STUDIO — calculation engine (pure; reads global S)
   All values stored & computed in SI. UI converts for display.
════════════════════════════════════════════════════════ */

/* ── context helpers ── */
const CC = () => S.meta.country;
const bt = () => S.meta.buildingType;
const cd = () => {                            // merged HVAC design conditions
  const base = HVAC_CTRY[CC()] || HVAC_CTRY.Generic;
  const wx = (CITY_DATA[CC()] || {})[S.meta.city];
  return wx ? {...base, ...wx} : base;
};
const pd = () => PLUMB_CTRY[CC()] || PLUMB_CTRY.Generic;
const consCat = () => CONSUMPTION.Generic[bt()] != null ? bt() : 'office';

function allSpaces(){
  const a = [];
  S.floors.forEach(f => f.spaces.forEach(sp => a.push({floor:f, space:sp})));
  return a;
}
function findSpace(id){
  for(const f of S.floors) for(const sp of f.spaces) if(sp.id===id) return sp;
  return null;
}
function floorOf(sp){ return S.floors.find(f => f.spaces.includes(sp)); }
function totalOccupants(){ return allSpaces().reduce((a,x)=>a+(+x.space.occupants||0),0); }
function totalArea(){ return allSpaces().reduce((a,x)=>a+(+x.space.area||0),0); }

/* smart occupancy: context-aware density, type minimum */
function occDensity(type, bldg){
  const o = OCC_BY_BUILDING[type];
  if(o && o[bldg]!=null) return o[bldg];
  const t = SPACE_TYPES[type];
  return t && t.occD!=null ? t.occD : 0.10;
}
function spaceOcc(type, area, bldg){
  const d = occDensity(type, bldg||bt()), a = +area||0;
  if(a<=0 || d<=0) return 0;
  const min = OCC_MIN[type]!=null ? OCC_MIN[type] : 1;
  return Math.max(min, Math.round(a*d));
}

/* ════════════════════════════════════════════════════════
   FIELD SPECS — 3-tier resolution:
   space override → project default override → code/country default
════════════════════════════════════════════════════════ */
function hvacFields(s){
  const c = cd(), fl = s ? floorOf(s) : null;
  const act = s && SPACE_TYPES[s.type] ? SPACE_TYPES[s.type].act : 'light';
  const wallEst = s ? Math.round(Math.sqrt(Math.max(1,s.area))*4*0.6*3) : 30;
  return [
    {key:'odb', label:'Outdoor DB', qty:'temp', step:.5, shared:1, def:()=>c.odb},
    {key:'owb', label:'Outdoor WB', qty:'temp', step:.5, shared:1, def:()=>c.owb},
    {key:'idb', label:'Indoor DB',  qty:'temp', step:.5, shared:1, def:()=>c.idb},
    {key:'irh', label:'Indoor RH', unit:'%', step:5, shared:1, def:()=>c.irh, max:[80,'RH above 80% is unrealistic']},
    {key:'sdt', label:'Supply ΔT', qty:'dtemp', step:1, shared:1, def:()=>c.sdt, pos:1},
    {key:'ceilH', label:'Ceiling Height', qty:'length', step:.1, shared:1, def:()=>3, pos:1},
    {key:'wallU', label:'Wall U-Value', qty:'uval', step:.01, shared:1, def:()=>c.wallU, pos:1, codeMax:()=>c.wallU},
    {key:'roofU', label:'Roof U-Value', qty:'uval', step:.01, shared:1, def:()=>c.roofU, pos:1, codeMax:()=>c.roofU},
    {key:'winU', label:'Window U-Value', qty:'uval', step:.1, shared:1, def:()=>2.8, pos:1},
    {key:'shgc', label:'Window SHGC', step:.01, shared:1, def:()=>c.shgc, pos:1, codeMax:()=>c.shgc},
    {key:'ach', label:'Infiltration', unit:'ACH', step:.1, shared:1, def:()=>c.ach},
    {key:'safety', label:'Safety Factor', unit:'%', step:1, shared:1, def:()=>10, max:[30,'Above 30% oversizes equipment']},
    {key:'lpd', label:'Lighting LPD', qty:'pdens', step:1, shared:1, def:()=>LPD[bt()]??12, hint:'ASHRAE 90.1 by building type'},
    {key:'epd', label:'Equipment EPD', qty:'pdens', step:1, shared:1, def:()=>EPD[bt()]??10},
    /* per-space geometry */
    {key:'roofExposed', label:'Exposed Roof', type:'select', options:[['yes','Yes — top floor'],['no','No — intermediate']],
      def:()=> (fl && fl.level==='top') ? 'yes':'no'},
    {key:'wallArea', label:'Ext. Wall Area', qty:'area', step:1, def:()=>wallEst, pos:1},
    {key:'wallOri', label:'Wall Orientation', type:'select', options:ORI, def:()=>'W'},
    {key:'winArea', label:'Window Area', qty:'area', step:.5, def:()=>Math.round(wallEst*0.2)},
    {key:'winOri', label:'Window Orientation', type:'select', options:ORI_H, def:()=>'W'},
    {key:'occSens', label:'Sensible / Person', qty:'power', step:1, def:()=>H_ACT[act].s},
    {key:'occLat', label:'Latent / Person', qty:'power', step:1, def:()=>H_ACT[act].l}
  ];
}
function plumbFields(s){
  const p = pd();
  return [
    {key:'vel', label:'Max Supply Velocity', qty:'velocity', step:.1, shared:1, def:()=>p.vel, pos:1,
      max:[3,'High velocity risks water hammer & noise']},
    {key:'minP', label:'Min Residual Pressure', qty:'pressure', step:5, shared:1, def:()=>p.minP},
    {key:'slope', label:'Drain Slope', type:'select', shared:1,
      options:[['0.02','2% (1:50)'],['0.01','1% (1:100)'],['0.04','4% (1:25)']], def:()=>String(p.slope)},
    {key:'mat', label:'Pipe Material', type:'select', shared:1, options:MAT_OPTS, def:()=>p.mat}
  ];
}
function fireFields(s){
  const hazOpts = HAZ_ORDER.map(k=>[k, HAZ_DATA[k].name]);
  return [
    {key:'K', label:'Sprinkler K-Factor', unit:'K', step:5, shared:1, def:()=>80, pos:1},
    {key:'minOpP', label:'Min Operating Pressure', qty:'pressure', step:5, shared:1, def:()=>52, pos:1},
    {key:'fricKm', label:'Friction Allowance', unit:'kPa/m', step:.05, shared:1, def:()=>0.5, pos:1},
    {key:'haz', label:'Hazard Class', type:'select', options:hazOpts,
      def:()=> s && SPACE_TYPES[s.type] ? SPACE_TYPES[s.type].haz : 'LH'},
    {key:'covArea', label:'Coverage / Sprinkler', qty:'area', step:.5,
      def:()=>HAZ_DATA[fval(s,'fire','haz')].cov, pos:1}
  ];
}
const FIELD_FNS = {hvac:hvacFields, plumb:plumbFields, fire:fireFields};
function fieldSpec(disc, key, s){ return FIELD_FNS[disc](s).find(x=>x.key===key); }

/* resolve a field value (SI) */
function fval(s, disc, key){
  const spec = fieldSpec(disc, key, s); if(!spec) return 0;
  const ovS = s && s.ov && s.ov[disc] ? s.ov[disc][key] : undefined;
  if(ovS!==undefined && ovS!=='') return spec.type==='select' ? ovS : +ovS;
  if(spec.shared){
    const ovP = S.ov[disc] ? S.ov[disc][key] : undefined;
    if(ovP!==undefined && ovP!=='') return spec.type==='select' ? ovP : +ovP;
  }
  const d = spec.def();
  return spec.type==='select' ? d : +d;
}
/* project-level resolve (shared fields only) */
function pval(disc, key){
  const spec = fieldSpec(disc, key, null); if(!spec) return 0;
  const ovP = S.ov[disc] ? S.ov[disc][key] : undefined;
  if(ovP!==undefined && ovP!=='') return spec.type==='select' ? ovP : +ovP;
  const d = spec.def();
  return spec.type==='select' ? d : +d;
}

/* ── psychrometrics ── */
function satP(T){ return 610.78*Math.exp(17.2694*T/(T+238.3)); }
function Wo(Tdb,Twb){ const ws=.62198*satP(Twb)/(101325-satP(Twb)); return Math.max(0, ws-.000662*(Tdb-Twb)); }
function Wi(Tdb,RH){ const pv=satP(Tdb)*(RH/100); return .62198*pv/(101325-pv); }

/* ── hydraulics ── */
function hazenWilliams(Qm3s, C, dmm, L){
  const d=dmm/1000; if(d<=0||C<=0) return 0;
  return 10.67*L*Math.pow(Math.max(0,Qm3s),1.852)/(Math.pow(C,1.852)*Math.pow(d,4.87));
}
function pumpKW(Qm3s, Hm, eff){ return 9.81*Qm3s*Math.max(0,Hm)/(eff||0.65); }
function wsfu2Lps(w){
  if(w<=0) return 0;
  for(let i=0;i<HUNTERS.length-1;i++){
    if(w<=HUNTERS[i+1][0]){
      const t=(w-HUNTERS[i][0])/(HUNTERS[i+1][0]-HUNTERS[i][0]);
      return HUNTERS[i][1]+t*(HUNTERS[i+1][1]-HUNTERS[i][1]);
    }
  }
  return 0.013*Math.pow(w,0.55);
}
function velPipeSize(Qls, v){
  if(Qls<=0||v<=0) return 0;
  const D = Math.sqrt(4*(Qls/1000)/(Math.PI*v))*1000;
  return PIPE_SIZES.find(s=>s>=D) || PIPE_SIZES[PIPE_SIZES.length-1];
}
function actualVel(Qls, dmm){ return dmm>0 ? (Qls/1000)/(Math.PI/4*Math.pow(dmm/1000,2)) : 0; }
function dfu2Size(d){ const r=DRAIN_SIZES.find(x=>x[1]>=d); return r?r[0]:200; }
function dfu2Stack(d){ const r=STACK_SIZES.find(x=>x[1]>=d); return r?r[0]:200; }

/* ════════════════════════════════════════════════════════
   HVAC — per-space cooling load (CLTD-simplified)
════════════════════════════════════════════════════════ */
function calcHvacSpace(s){
  const f=(k)=>fval(s,'hvac',k);
  const odb=f('odb'), owb=f('owb'), idb=f('idb'), irh=f('irh');
  const area=+s.area||0, ch=f('ceilH'), vol=area*ch, dT=odb-idb;
  const comps=[];
  if(f('roofExposed')==='yes')
    comps.push({n:'Roof', s:f('roofU')*area*(dT+22), l:0});
  comps.push({n:'External Walls', s:f('wallU')*f('wallArea')*(dT+(WALL_ADD[f('wallOri')]||6)), l:0});
  const winA=f('winArea');
  if(winA>0){
    comps.push({n:'Windows — conduction', s:f('winU')*winA*dT, l:0});
    comps.push({n:'Windows — solar', s:(SHGF[f('winOri')]||400)*f('shgc')*winA, l:0});
  }
  const dW = Math.max(0, Wo(odb,owb)-Wi(idb,irh));
  const Vinf = vol*f('ach');                                   // m³/h
  comps.push({n:'Infiltration', s:0.34*Vinf*dT, l:840*Vinf*dW});
  comps.push({n:'People', s:s.occupants*f('occSens'), l:s.occupants*f('occLat')});
  comps.push({n:'Lighting', s:f('lpd')*area, l:0});
  comps.push({n:'Equipment', s:f('epd')*area, l:0});
  const vr = ventRates(s.type);
  const oaLs = vr.rp*s.occupants + vr.ra*area;                 // ASHRAE 62.1 Vbz
  const oaMh = oaLs*3.6;
  comps.push({n:'Ventilation (OA)', s:0.34*oaMh*dT, l:840*oaMh*dW});

  let totS=0, totL=0;
  comps.forEach(c=>{ c.s=Math.max(0,c.s); c.l=Math.max(0,c.l); totS+=c.s; totL+=c.l; });
  const sf = 1 + f('safety')/100;
  const tot=(totS+totL)*sf, kW=tot/1000, TR=kW/3.517;
  const airflowLs = (totS*sf)/(1.206*Math.max(1,f('sdt')));
  /* equipment suggestion */
  let equip;
  if(TR<=0.1) equip='—';
  else if(TR<=5.5){ const sz=DX_SIZES.find(x=>x>=TR)||5; equip=sz+' TR split / cassette'; }
  else if(TR<=25) equip=Math.ceil(TR)+' TR packaged / VRF';
  else equip='AHU / FAHU — '+Math.ceil(TR)+' TR (plant)';
  /* round supply duct at 5 m/s */
  const ductA=airflowLs/1000/5, ductD=Math.round(Math.sqrt(4*ductA/Math.PI)*1000/50)*50;

  return {kW, TR, BTUh:tot*3.412, SHR:tot>0?(totS*sf)/tot:1, airflowLs, oaLs, oaGov:vr.gov||null,
    loadDensity:area>0?tot/area:0, totS:totS*sf, totL:totL*sf, comps, equip, ductD};
}

/* ════════════════════════════════════════════════════════
   PLUMBING — per-space fixture units
════════════════════════════════════════════════════════ */
function calcPlumbSpace(s){
  let wsfu=0, dfu=0, hotWsfu=0;
  FIXTURES.forEach(fx=>{
    const q=+(s.fixtures[fx.k]||0);
    wsfu+=q*fx.wsfu; dfu+=q*fx.dfu;
    if(fx.hot) hotWsfu+=q*fx.wsfu*0.75;
  });
  const vel=fval(s,'plumb','vel');
  const Qls=wsfu2Lps(wsfu);
  const dia=velPipeSize(Qls,vel);
  return {wsfu, dfu, hotWsfu, Qls, dia, actV:actualVel(Qls,dia), branchD:dfu>0?dfu2Size(dfu):0};
}

/* ════════════════════════════════════════════════════════
   FIRE — per-space sprinkler layout
════════════════════════════════════════════════════════ */
function calcFireSpace(s){
  const haz=fval(s,'fire','haz'), hd=HAZ_DATA[haz];
  const area=+s.area||0, cov=fval(s,'fire','covArea');
  const count=area>0?Math.ceil(area/Math.max(0.1,cov)):0;
  const branchSize=(PIPE_SCHED.find(r=>r.maxSpr>=Math.min(count,8))||PIPE_SCHED[0]).steel;
  const mainSize=(PIPE_SCHED.find(r=>r.maxSpr>=count)||PIPE_SCHED[PIPE_SCHED.length-1]).steel;
  return {haz, count, branchSize, mainSize, density:hd.density};
}

/* ════════════════════════════════════════════════════════
   PROJECT-LEVEL AGGREGATION
════════════════════════════════════════════════════════ */
function recalcAll(){
  const R={spaces:{}, floors:{}, hvac:{}, plumb:{}, fire:{}};
  /* per-space */
  allSpaces().forEach(({floor,space})=>{
    const r={};
    if(space.disc.hvac)  r.hvac =calcHvacSpace(space);
    if(space.disc.plumb) r.plumb=calcPlumbSpace(space);
    if(space.disc.fire)  r.fire =calcFireSpace(space);
    R.spaces[space.id]=r;
    const fr = R.floors[floor.id] || (R.floors[floor.id]={kW:0,TR:0,air:0,oa:0,wsfu:0,dfu:0,spr:0,area:0,occ:0});
    fr.area+=+space.area||0; fr.occ+=+space.occupants||0;
    if(r.hvac){ fr.kW+=r.hvac.kW; fr.TR+=r.hvac.TR; fr.air+=r.hvac.airflowLs; fr.oa+=r.hvac.oaLs; }
    if(r.plumb){ fr.wsfu+=r.plumb.wsfu; fr.dfu+=r.plumb.dfu; }
    if(r.fire){ fr.spr+=r.fire.count; }
  });

  /* ── HVAC totals ── */
  const hv=R.hvac;
  hv.kW=0; hv.air=0; hv.oa=0; hv.count=0;
  Object.values(R.spaces).forEach(r=>{ if(r.hvac){ hv.kW+=r.hvac.kW; hv.air+=r.hvac.airflowLs; hv.oa+=r.hvac.oaLs; hv.count++; } });
  hv.TR=hv.kW/3.517;
  const div=S.hvacSys.diversity||0.85;
  hv.divKW=hv.kW*div; hv.divTR=hv.divKW/3.517;
  hv.plant = hv.divTR<=0 ? '—'
    : hv.divTR<=25 ? 'DX splits / VRF — '+Math.ceil(hv.divTR)+' TR total'
    : hv.divTR<=120 ? 'VRF or air-cooled chiller — '+Math.ceil(hv.divTR/5)*5+' TR plant'
    : 'Chiller plant (N+1) — '+Math.ceil(hv.divTR/10)*10+' TR';

  /* ── Plumbing totals ── */
  const pl=R.plumb, p=pd();
  pl.wsfu=0; pl.dfu=0; pl.hotWsfu=0;
  Object.values(R.spaces).forEach(r=>{ if(r.plumb){ pl.wsfu+=r.plumb.wsfu; pl.dfu+=r.plumb.dfu; pl.hotWsfu+=r.plumb.hotWsfu; } });
  pl.Qls=wsfu2Lps(pl.wsfu);
  const vel=pval('plumb','vel'), mat=pval('plumb','mat');
  pl.mainDia=velPipeSize(pl.Qls,vel);
  pl.actV=actualVel(pl.Qls,pl.mainDia);
  pl.stackDia=pl.dfu>0?dfu2Stack(pl.dfu):0;
  pl.sewerDia=pl.dfu>0?dfu2Size(pl.dfu):0;

  /* daily demand & tanks */
  const occ=totalOccupants();
  const lpcd=CONSUMPTION[CC()][consCat()]||45;
  pl.daily=occ*lpcd/1000;                                  // m³/day
  const days=S.plumbSys.storageDays ?? STORAGE_DAYS[CC()] ?? 1;
  pl.storage=pl.daily*days;
  pl.roofTank=Math.max(1, pl.daily/3);                     // 1/3 daily on roof
  pl.ugTank=Math.max(0.5, pl.storage-pl.roofTank);
  pl.roofLoad=pl.roofTank*1000*9.81/1000;                  // kN total when full
  pl.days=days; pl.lpcd=lpcd; pl.occ=occ;

  /* booster pump (bottom-fed) */
  const H=+S.meta.height||12;
  const reqP=pval('plumb','minP'), suction=S.plumbSys.municipalPressure||0;
  {
    const Qm3s=pl.Qls/1000, dia=pl.mainDia||25, C=PIPE_C[mat]||130;
    const fric=hazenWilliams(Qm3s,C,dia,H+20);
    const tdh=H+fric+reqP/9.81-suction/9.81;
    pl.booster={tdh, fric, kw:pumpKW(Qm3s,tdh), needed:tdh>0.5, Qls:pl.Qls};
    pl.booster.hp=pl.booster.kw*1.341;
  }
  /* transfer (lifting) pump UG → roof tank: refill roof tank in ~2 hr */
  {
    const Qls=Math.max(pl.Qls, pl.roofTank*1000/7200);
    const Qm3s=Qls/1000, dia=velPipeSize(Qls,2.0)||32, C=PIPE_C[mat]||130;
    const lift=H+3+2;                                      // roof + tank + UG depth
    const fric=hazenWilliams(Qm3s,C,dia,H+15);
    const tdh=lift+fric;
    pl.transfer={Qls, dia, tdh, kw:pumpKW(Qm3s,tdh)};
    pl.transfer.hp=pl.transfer.kw*1.341;
  }
  /* sewage pit & pump (basement fixtures) */
  {
    const baseDfu=allSpaces().reduce((a,{floor,space})=>{
      if(floor.level!=='ground'||!space.disc.plumb) return a;
      let d=0; FIXTURES.forEach(fx=>d+=(+(space.fixtures[fx.k]||0))*fx.dfu);
      return a+d;
    },0);
    const Qls=0.04*baseDfu+0.5;
    const Qm3s=Qls/1000, lift=5.5, dia=80;
    const fric=hazenWilliams(Qm3s,120,dia,20);
    const tdh=lift+fric;
    pl.sewage={dfu:baseDfu, Qls, tdh, kw:pumpKW(Qm3s,tdh), pit:Math.max(0.5,Qls*900/1000)};
    pl.sewage.hp=pl.sewage.kw*1.341;
  }
  /* hot water & heater */
  {
    const frac=(HOTWATER[consCat()]||HOTWATER.office).frac;
    pl.hotDaily=pl.daily*frac*1000;                        // L/day
    pl.heaterVol=Math.max(50, Math.round(pl.hotDaily*0.4/10)*10); // 40% storage
    const dTw=60-25;
    pl.heaterKW=pl.hotDaily>0 ? (pl.hotDaily*4.186*dTw)/(3600*8) : 0;  // 8-h recovery
    pl.hotQls=wsfu2Lps(pl.hotWsfu);
    pl.hotDia=velPipeSize(pl.hotQls,vel);
  }
  /* roof / storm drainage */
  {
    const rain=S.plumbSys.rainfall ?? RAIN_CTRY[CC()] ?? 75;
    const roofA=S.plumbSys.roofArea ?? Math.round(totalArea()/Math.max(1,S.floors.length));
    const Qls=roofA*rain/3600;                             // L/s
    const adjArea=roofA*(rain/100);                        // scale to 100 mm/hr table
    const leader=(LEADER_SIZES.find(x=>x[1]>=adjArea)||LEADER_SIZES[LEADER_SIZES.length-1])[0];
    const count=Math.max(2, Math.ceil(roofA/250));
    pl.storm={rain, roofA, Qls, leader, count};
  }

  /* ── Fire totals ── */
  const fr=R.fire;
  fr.spr=0; fr.maxHaz='LH';
  Object.values(R.spaces).forEach(r=>{
    if(r.fire){ fr.spr+=r.fire.count;
      if(HAZ_ORDER.indexOf(r.fire.haz)>HAZ_ORDER.indexOf(fr.maxHaz)) fr.maxHaz=r.fire.haz; }
  });
  const hd=HAZ_DATA[fr.maxHaz];
  fr.hazName=hd.name;
  /* hydraulic demand: density × design area + hose */
  fr.sprFlow=hd.density*hd.designArea;                     // L/min
  fr.hose=hd.hose;
  /* standpipe per NFPA 14 (if building > 1 floor) */
  const risers=Math.max(1, Math.ceil(S.floors.length/8));
  fr.standpipe = S.fireSys.standpipe ? Math.min(500+(risers-1)*250, 1250)*3.785 : 0;  // L/min
  fr.totFlow=fr.sprFlow+fr.hose+fr.standpipe;              // L/min
  fr.totFlowLs=fr.totFlow/60;
  fr.gpm=fr.totFlow/3.785;
  fr.pumpGpm=PUMP_RATINGS_GPM.find(x=>x>=fr.gpm)||PUMP_RATINGS_GPM[PUMP_RATINGS_GPM.length-1];
  /* pump pressure: operating + elevation + friction allowance */
  const Hb=+S.meta.height||12;
  fr.pumpKpa=pval('fire','minOpP') + Hb*9.81 + pval('fire','fricKm')*(Hb+30) + 100;
  fr.pumpBar=fr.pumpKpa/100;
  fr.pumpKW=pumpKW(fr.totFlowLs/1000, fr.pumpKpa/9.81, 0.6);
  /* fire water tank */
  fr.duration=S.fireSys.duration ?? hd.duration;
  fr.tank=fr.totFlow*fr.duration/1000;                     // m³
  /* extinguishers & cabinets */
  fr.extPerFloor=S.floors.map(f=>{
    const a=f.spaces.reduce((x,sp)=>x+(+sp.area||0),0);
    return {name:f.name, n:Math.max(a>0?1:0, Math.ceil(a/hd.extCov))};
  });
  fr.extTotal=fr.extPerFloor.reduce((a,x)=>a+x.n,0);
  fr.cabinets=S.floors.map(f=>{
    const a=f.spaces.reduce((x,sp)=>x+(+sp.area||0),0);
    return Math.max(a>0?1:0, Math.ceil(a/740));            // 23 m hose radius ≈ 740 m²
  }).reduce((a,b)=>a+b,0);

  return R;
}
