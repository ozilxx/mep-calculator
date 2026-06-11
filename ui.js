/* ════════════════════════════════════════════════════════
   MEP STUDIO — UI rendering & interactions
════════════════════════════════════════════════════════ */
let R = null;                 // latest calc results
let activeTab = 'project';
let sheetId = null, sheetDisc = 'hvac';

const E = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ── units ── */
function uLbl(qty){ const u=UNITS[qty]; return u ? (S.units==='imp'?u.imp:u.si) : ''; }
function uOut(qty, si){          // SI → display
  const u=UNITS[qty]; if(!u || si==null || isNaN(si)) return si;
  if(S.units!=='imp') return +si;
  return u.to ? u.to(+si) : +si*u.f;
}
function uIn(qty, dv){           // display → SI
  const u=UNITS[qty]; if(!u || dv==null || dv==='') return dv;
  if(S.units!=='imp') return +dv;
  return u.from ? u.from(+dv) : +dv/u.f;
}
function fmt(v, dec){
  if(v==null || v==='' || !isFinite(+v)) return '—';
  return (+v).toLocaleString('en-US',{minimumFractionDigits:dec??0, maximumFractionDigits:dec??2});
}
function dv(qty, si, dec){ return fmt(uOut(qty,si), dec); }
function dvu(qty, si, dec){ return dv(qty,si,dec)+' '+uLbl(qty); }

/* ── tiny components ── */
function tile(cls, val, unit, lbl){
  return `<div class="tile ${cls}"><div class="v">${val}</div><div class="u">${E(unit)}</div><div class="l">${E(lbl)}</div></div>`;
}
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2200);
}

/* ════════════════════════════════════════════════════════
   FIELD COMPONENT — spec-driven, 3-tier override aware
   kind: 'p' (project default) | 's' (space override)
════════════════════════════════════════════════════════ */
function fieldHTML(disc, spec, kind, sid){
  const s = kind==='s' ? findSpace(sid) : null;
  const store = kind==='s' ? (s.ov[disc]||{}) : (S.ov[disc]||{});
  const ovHere = store[spec.key]!==undefined && store[spec.key]!=='';
  const resolved = kind==='s' ? fval(s,disc,spec.key) : pval(disc,spec.key);
  const qty = spec.type==='select' ? null : spec.qty;
  const val = qty ? parseFloat((+uOut(qty,resolved)).toPrecision(6)) : resolved;

  /* validation */
  let vmsg='', vcls='';
  if(spec.type!=='select'){
    if(spec.pos && +resolved<=0){ vmsg='Must be greater than zero'; vcls='err'; }
    else if(spec.max && +resolved>spec.max[0]){ vmsg=spec.max[1]; vcls='warn'; }
    else if(spec.codeMax && +resolved>spec.codeMax()+1e-9){ vmsg='Exceeds code maximum ('+dv(qty||'pdens',spec.codeMax(),2)+')'; vcls='warn'; }
  }
  const unit = qty ? uLbl(qty) : (spec.unit||'');
  const oc = `UI.setField(this,'${kind}','${sid||''}','${disc}','${spec.key}')`;
  let input;
  if(spec.type==='select'){
    input = `<select onchange="${oc}">`+
      spec.options.map(o=>`<option value="${E(o[0])}" ${String(o[0])===String(val)?'selected':''}>${E(o[1])}</option>`).join('')+
      `</select>`;
  } else {
    input = `<input type="number" value="${E(val)}" ${spec.step?`step="${spec.step}"`:''} onchange="${oc}">`;
  }
  const inherited = kind==='s' && spec.shared && !ovHere;
  return `<div class="f ${ovHere?'ov':''}">
    <label><span>${E(spec.label)}${unit?` <span class="u">(${E(unit)})</span>`:''}</span>
      ${ovHere?`<button class="rst" title="Reset to default" onclick="UI.resetField('${kind}','${sid||''}','${disc}','${spec.key}')">↺ reset</button>`:''}
    </label>
    ${input}
    ${vmsg?`<div class="vmsg ${vcls}">${E(vmsg)}</div>`:(spec.hint?`<div class="hint">${E(spec.hint)}</div>`:(inherited?`<div class="hint">project default — edit to override for this space</div>`:''))}
  </div>`;
}

function defaultsCard(disc, title, dotColor, sub){
  const fields = FIELD_FNS[disc](null).filter(f=>f.shared);
  return `<div class="card glass">
    <div class="card-hd"><div class="card-title"><span class="dot" style="color:${dotColor};background:${dotColor}"></span>${title}</div>
      <span class="chip gray">applies to every space · override per-space in its sheet</span></div>
    <div class="card-sub">${sub}</div>
    <div class="fg">${fields.map(f=>fieldHTML(disc,f,'p')).join('')}</div>
  </div>`;
}

/* ════════════════════════════════════════════════════════
   PROJECT TAB
════════════════════════════════════════════════════════ */
function renderProject(){
  const m=S.meta;
  const wx=cd();
  const cities=Object.keys(CITY_DATA[m.country]||{});
  let h=`<div class="card glass">
    <div class="card-hd"><div class="card-title"><span class="dot" style="color:var(--purple);background:var(--purple)"></span>Project Information</div></div>
    <div class="fg">
      <div class="f"><label>Project Name</label><input type="text" value="${E(m.name)}" onchange="UI.meta('name',this.value)"></div>
      <div class="f"><label>Client</label><input type="text" value="${E(m.client)}" placeholder="—" onchange="UI.meta('client',this.value)"></div>
      <div class="f"><label>Engineer</label><input type="text" value="${E(m.engineer)}" placeholder="—" onchange="UI.meta('engineer',this.value)"></div>
      <div class="f"><label>Date</label><input type="date" value="${E(m.date)}" onchange="UI.meta('date',this.value)"></div>
      <div class="f"><label>Building Type</label><select onchange="UI.meta('buildingType',this.value)">
        ${BLDG_TYPES.map(b=>`<option value="${b}" ${b===m.buildingType?'selected':''}>${b[0].toUpperCase()+b.slice(1)}</option>`).join('')}</select></div>
      <div class="f"><label>Building Height <span class="u">(${uLbl('length')})</span></label>
        <input type="number" step="0.5" value="${E(parseFloat(uOut('length',m.height).toPrecision(5)))}" onchange="UI.meta('height',uIn('length',this.value))"></div>
    </div>
    <div class="sec">Location & Codes</div>
    <div class="pillrow" style="margin-bottom:10px">
      ${Object.keys(COUNTRY_CODES).map(c=>`<button class="cpill ${c===m.country?'sel':''}" onclick="UI.setCountry('${c}')">${
        ({KSA:'🇸🇦',UAE:'🇦🇪',Egypt:'🇪🇬',Qatar:'🇶🇦',Jordan:'🇯🇴',Generic:'🌐'})[c]} ${c}</button>`).join('')}
      ${cities.length?`<select style="width:auto;min-width:150px" onchange="UI.setCity(this.value)">
        <option value="">— city —</option>${cities.map(c=>`<option ${c===m.city?'selected':''}>${c}</option>`).join('')}</select>`:''}
      <span class="chip blue">☀ ${dv('temp',wx.odb,0)}${uLbl('temp')} DB / ${dv('temp',wx.owb,0)}${uLbl('temp')} WB</span>
    </div>
    <div class="codes">${(COUNTRY_CODES[m.country]||[]).map(c=>`<span class="code-pill">${c}</span>`).join('')}</div>
  </div>`;

  /* totals strip */
  const ts=allSpaces();
  h+=`<div class="hero">
    ${heroCard('Floors',S.floors.length,'','#5e7ce2','M4 20h16M4 14h16M4 8h16')}
    ${heroCard('Spaces',ts.length,'','#0a84ff','M3 9h18M9 3v18M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z')}
    ${heroCard('Total Area',dv('area',totalArea(),0),uLbl('area'),'#00c7be','M3 3h18v18H3z')}
    ${heroCard('Occupants',totalOccupants(),'persons','#ff9f0a','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87')}
  </div>`;

  /* floors */
  h+=`<div class="card glass">
    <div class="card-hd"><div class="card-title"><span class="dot" style="color:var(--accent);background:var(--accent)"></span>Floors & Spaces</div>
    <span class="chip gray">each space feeds all three disciplines</span></div>
    <div class="card-sub">Add floors top-down. Occupants auto-fill from area × type density (context-aware) — type a number to fix it manually. Click a space row to open its full calculation sheet.</div>`;
  if(!S.floors.length) h+=`<div class="empty"><div class="big">🏗️</div><div class="t">No floors yet</div><div class="s">Add your first floor below, or load the sample project from the ⋯ menu to see a full worked example.</div></div>`;
  S.floors.forEach(f=>{ h+=floorHTML(f); });
  h+=`<button class="add-btn" onclick="UI.addFloor()">＋ Add Floor</button></div>`;
  return h;
}
function heroCard(lbl,val,unit,color,path){
  return `<div class="hcard glass"><div class="hl2">${lbl}</div>
    <div class="ic" style="background:${color}"><svg viewBox="0 0 24 24"><path d="${path}"/></svg></div>
    <div class="hv">${val}</div><div class="hu">${unit}</div></div>`;
}
function floorHTML(f){
  let h=`<div class="floor">
    <div class="floor-hd">
      <input type="text" value="${E(f.name)}" onchange="UI.setFloor(${f.id},'name',this.value)">
      <select onchange="UI.setFloor(${f.id},'level',this.value)">
        <option value="ground" ${f.level==='ground'?'selected':''}>Ground / Basement</option>
        <option value="middle" ${f.level==='middle'?'selected':''}>Intermediate</option>
        <option value="top" ${f.level==='top'?'selected':''}>Top (exposed roof)</option>
      </select>
      <span class="chip gray">${f.spaces.length} space${f.spaces.length===1?'':'s'}</span>
      <span style="flex:1"></span>
      <button class="btn btn-g btn-sm" onclick="UI.dupFloor(${f.id})" title="Duplicate this floor with all its spaces">⧉ Duplicate</button>
      <button class="rm" title="Remove floor" onclick="UI.rmFloor(${f.id})">✕</button>
    </div>`;
  if(f.spaces.length){
    h+=`<table class="tbl"><thead><tr><th>Space</th><th>Type</th><th class="num">Area (${uLbl('area')})</th>
      <th class="num">Occ.</th><th>Disciplines</th><th></th></tr></thead><tbody>`;
    f.spaces.forEach(sp=>{
      const recs=(SPACE_CAT[bt()]||SPACE_TYPE_LIST).filter(t=>SPACE_TYPES[t]);
      const others=SPACE_TYPE_LIST.filter(t=>!recs.includes(t));
      const opt=t=>`<option value="${E(t)}" ${t===sp.type?'selected':''}>${E(t)}</option>`;
      h+=`<tr>
        <td><input type="text" value="${E(sp.name)}" style="min-width:110px" onchange="UI.setSpace(${sp.id},'name',this.value)"></td>
        <td><select style="min-width:130px" onchange="UI.setSpace(${sp.id},'type',this.value)">
          <optgroup label="Recommended">${recs.map(opt).join('')}</optgroup>
          <optgroup label="Other">${others.map(opt).join('')}</optgroup></select></td>
        <td class="num"><input type="number" min="0" step="1" value="${E(parseFloat(uOut('area',sp.area).toPrecision(5)))}" onchange="UI.setSpace(${sp.id},'area',uIn('area',this.value))"></td>
        <td class="num"><input type="number" min="0" step="1" value="${sp.occupants}" title="${sp.occAuto?'Auto from area × density':'Manual'}"
          style="${sp.occAuto?'opacity:.75':''}" onchange="UI.setOcc(${sp.id},this.value)">${sp.occAuto?'':`<button class="rst" title="Back to auto" onclick="UI.occAuto(${sp.id})">↺</button>`}</td>
        <td><div class="dtog">
          <button class="${sp.disc.hvac?'on h':''}" title="HVAC" onclick="UI.tglDisc(${sp.id},'hvac')"><svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/></svg></button>
          <button class="${sp.disc.plumb?'on p':''}" title="Plumbing" onclick="UI.tglDisc(${sp.id},'plumb')"><svg viewBox="0 0 24 24"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg></button>
          <button class="${sp.disc.fire?'on f':''}" title="Fire" onclick="UI.tglDisc(${sp.id},'fire')"><svg viewBox="0 0 24 24"><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 2 3 4 3 6a5 5 0 0 1-10 0c0-5 5-6 5-13z"/></svg></button>
        </div></td>
        <td style="white-space:nowrap"><button class="btn btn-g btn-sm" onclick="UI.openSheet(${sp.id})">Open ▸</button>
          <button class="rm" onclick="UI.rmSpace(${sp.id})">✕</button></td>
      </tr>`;
    });
    h+=`</tbody></table>`;
  }
  h+=`<button class="add-btn" style="margin-top:10px" onclick="UI.addSpace(${f.id})">＋ Add Space</button></div>`;
  return h;
}

/* ════════════════════════════════════════════════════════
   HVAC TAB
════════════════════════════════════════════════════════ */
function renderHvac(){
  const hv=R.hvac;
  let h=defaultsCard('hvac','HVAC Design Defaults','var(--hvac)',
    `Design conditions from <strong>${E(S.meta.city||S.meta.country)}</strong> weather + ${E(S.meta.country)} code envelope limits. Loads recalculate live.`);

  /* totals */
  h+=`<div class="card glass"><div class="card-hd">
      <div class="card-title"><span class="dot" style="color:var(--hvac);background:var(--hvac)"></span>Project Cooling Summary</div>
      <span class="f" style="flex-direction:row;align-items:center;gap:8px"><label style="min-height:0">Diversity</label>
      <input type="number" min="0.5" max="1" step="0.05" value="${S.hvacSys.diversity}" style="width:74px" onchange="UI.setHvacSys('diversity',+this.value)"></span></div>
    <div class="mgrid">
      ${tile('hl', fmt(hv.kW,1), 'kW', 'Total Cooling (Σ spaces)')}
      ${tile('hl', fmt(hv.TR,1), 'TR', 'Total Tons')}
      ${tile('', fmt(hv.divTR,1), 'TR', `Plant Load @ ${Math.round((S.hvacSys.diversity)*100)}% diversity`)}
      ${tile('', dv('airflow',hv.air,0), uLbl('airflow'), 'Total Supply Air')}
      ${tile('', dv('airflow',hv.oa,0), uLbl('airflow'), 'Total Fresh Air (62.1)')}
      ${tile('', totalArea()>0?dv('pdens',hv.kW*1000/Math.max(1,totalArea()),0):'—', uLbl('pdens'), 'Avg Load Density')}
    </div>
    ${hv.divTR>0?`<div class="banner green">⚙️ Suggested plant: <strong>${E(hv.plant)}</strong></div>`:''}
    ${floorBars('kW','Cooling by floor — kW')}
  </div>`;

  /* per-space table */
  h+=spaceResultTable('hvac','Space Cooling Loads','var(--hvac)',
    ['Space','Floor',`Area (${uLbl('area')})`,'Occ.','kW','TR',`Supply (${uLbl('airflow')})`,`OA (${uLbl('airflow')})`,'Equipment'],
    (sp,fl,r)=>[E(sp.name),E(fl.name),dv('area',sp.area,0),sp.occupants,fmt(r.kW,1),fmt(r.TR,2),
      dv('airflow',r.airflowLs,0),dv('airflow',r.oaLs,0),`<span class="chip blue">${E(r.equip)}</span>`]);
  return h;
}

function floorBars(key,title){
  const fl=S.floors.map(f=>({name:f.name, v:(R.floors[f.id]||{})[key]||0}));
  const mx=Math.max(...fl.map(x=>x.v),0.001);
  if(!fl.length||mx<=0.001) return '';
  return `<div class="sec">${title}</div><div class="bars">`+
    fl.map(x=>`<div class="bar"><span class="nm">${E(x.name)}</span><span class="tr"><span class="fl" style="width:${(x.v/mx*100).toFixed(1)}%"></span></span><span class="vl">${fmt(x.v,1)}</span></div>`).join('')+`</div>`;
}

function spaceResultTable(disc,title,color,heads,rowFn){
  const rows=allSpaces().filter(x=>x.space.disc[disc]);
  let h=`<div class="card glass"><div class="card-hd"><div class="card-title"><span class="dot" style="color:${color};background:${color}"></span>${title}</div>
    <span class="chip gray">${rows.length} space${rows.length===1?'':'s'} · click a row to edit</span></div>`;
  if(!rows.length){ h+=`<div class="empty"><div class="big">∅</div><div class="t">No spaces use this discipline</div><div class="s">Enable it per space in the Project tab (toggle icons on each row).</div></div></div>`; return h; }
  h+=`<div style="overflow-x:auto"><table class="tbl"><thead><tr>${heads.map((x,i)=>`<th class="${i>=2?'num':''}">${x}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(({floor,space})=>{
    const r=R.spaces[space.id][disc];
    const cells=rowFn(space,floor,r);
    h+=`<tr class="rowlink" onclick="UI.openSheet(${space.id},'${disc}')">${cells.map((c,i)=>`<td class="${i>=2?'num':''}">${c}</td>`).join('')}</tr>`;
  });
  h+=`</tbody></table></div></div>`;
  return h;
}

/* ════════════════════════════════════════════════════════
   PLUMBING TAB
════════════════════════════════════════════════════════ */
function renderPlumb(){
  const pl=R.plumb;
  let h=defaultsCard('plumb','Plumbing Design Defaults','var(--plumb)',
    `${E(S.meta.country)} practice: ${PLUMB_CTRY[CC()].mat} pipework, ${dv('pressure',PLUMB_CTRY[CC()].minP,0)} ${uLbl('pressure')} residual. Hunter's method per IPC/UPC.`);

  /* site inputs */
  h+=`<div class="card glass"><div class="card-hd"><div class="card-title"><span class="dot" style="color:var(--plumb);background:var(--plumb)"></span>Site & Storage Inputs</div></div>
    <div class="fg">
      <div class="f"><label>Municipal Pressure <span class="u">(${uLbl('pressure')})</span></label>
        <input type="number" step="10" value="${E(parseFloat(uOut('pressure',S.plumbSys.municipalPressure).toPrecision(5)))}" onchange="UI.setPlumbSys('municipalPressure',uIn('pressure',this.value))"></div>
      <div class="f"><label>Storage Duration <span class="u">(days)</span></label>
        <select onchange="UI.setPlumbSys('storageDays',+this.value)">
          ${[0.5,1,2,3].map(d=>`<option value="${d}" ${d===(S.plumbSys.storageDays??STORAGE_DAYS[CC()])?'selected':''}>${d} day${d===1?'':'s'}</option>`).join('')}</select>
        <div class="hint">default from ${CC()} supply reliability (${STORAGE_DAYS[CC()]}d)</div></div>
      <div class="f"><label>Rainfall Intensity <span class="u">(${uLbl('rain')})</span></label>
        <input type="number" step="5" value="${E(parseFloat(uOut('rain',S.plumbSys.rainfall??RAIN_CTRY[CC()]).toPrecision(4)))}" onchange="UI.setPlumbSys('rainfall',uIn('rain',this.value))"></div>
      <div class="f"><label>Roof Drainage Area <span class="u">(${uLbl('area')})</span></label>
        <input type="number" step="10" value="${E(parseFloat(uOut('area',S.plumbSys.roofArea??Math.round(totalArea()/Math.max(1,S.floors.length))).toPrecision(6)))}" onchange="UI.setPlumbSys('roofArea',uIn('area',this.value))"></div>
    </div></div>`;

  /* domestic water */
  h+=`<div class="card glass"><div class="card-hd"><div class="card-title"><span class="dot" style="color:var(--plumb);background:var(--plumb)"></span>Domestic Water</div></div>
    <div class="mgrid">
      ${tile('hl t-teal', fmt(pl.wsfu,0), 'WSFU', 'Total Supply Fixture Units')}
      ${tile('hl t-teal', dv('flow',pl.Qls,2), uLbl('flow'), "Peak Demand (Hunter)")}
      ${tile('', dv('dia',pl.mainDia,0), uLbl('dia'), 'Main Riser Ø')}
      ${tile('', dv('velocity',pl.actV,2), uLbl('velocity'), 'Actual Velocity')}
      ${tile('', fmt(pl.daily,1), 'm³/day', `Daily Demand (${pl.occ}p × ${pl.lpcd} L)`)}
      ${tile('', dv('flow',pl.hotQls,2), uLbl('flow'), 'Hot Water Peak')}
    </div>
    ${pl.actV>3?`<div class="banner amber">⚠️ Main velocity ${dv('velocity',pl.actV,1)} ${uLbl('velocity')} exceeds 3 m/s — upsize to avoid water hammer.</div>`:''}
    <div class="sec">Water Heater (central, 60 °C / 8-h recovery)</div>
    <div class="mgrid">
      ${tile('', fmt(pl.hotDaily,0), 'L/day', 'Hot Water Demand')}
      ${tile('', fmt(pl.heaterVol,0), 'L', 'Heater Storage Volume')}
      ${tile('', fmt(pl.heaterKW,1), 'kW', 'Heater Element / Coil')}
      ${tile('', dv('dia',pl.hotDia,0), uLbl('dia'), 'Hot Main Ø')}
    </div></div>`;

  /* tanks & pumps */
  const b=pl.booster, t=pl.transfer, sw=pl.sewage;
  h+=`<div class="card glass"><div class="card-hd"><div class="card-title"><span class="dot" style="color:var(--plumb);background:var(--plumb)"></span>Tanks & Pumps</div></div>
    <div class="sec">Storage Tanks (${pl.days} day${pl.days===1?'':'s'})</div>
    <div class="mgrid">
      ${tile('hl t-teal', dv('volume',pl.ugTank,1), uLbl('volume'), 'Underground Tank')}
      ${tile('', dv('volume',pl.roofTank,1), uLbl('volume'), 'Roof Tank (⅓ daily)')}
      ${tile('', fmt(pl.roofLoad,1), 'kN', 'Roof Load when Full')}
    </div>
    <div class="banner amber">⚠️ Flag the roof-tank load to the structural engineer for slab design.</div>
    <div class="sec">Booster Pump (bottom-fed, ${b.needed?'required':'check if required'})</div>
    <div class="mgrid">
      ${tile(b.needed?'hl t-teal':'', dv('head',b.tdh,1), uLbl('head'), 'TDH')}
      ${tile('', dv('flow',b.Qls,2), uLbl('flow'), 'Duty Flow')}
      ${tile('', fmt(b.kw,2)+' / '+fmt(b.hp,1), 'kW / HP', 'Motor (η 65%) · 1+1')}
    </div>
    ${!b.needed?`<div class="banner green">✓ Municipal pressure appears sufficient — verify at peak demand before omitting the booster.</div>`:''}
    <div class="sec">Transfer Pump (UG → roof tank, ≈2 h refill)</div>
    <div class="mgrid">
      ${tile('', dv('flow',t.Qls,2), uLbl('flow'), 'Flow')}
      ${tile('', dv('dia',t.dia,0), uLbl('dia'), 'Riser Ø')}
      ${tile('', dv('head',t.tdh,1), uLbl('head'), 'TDH')}
      ${tile('', fmt(t.kw,2)+' / '+fmt(t.hp,1), 'kW / HP', 'Motor · 1+1')}
    </div>
    <div class="sec">Sewage Lifting (ground/basement fixtures: ${fmt(sw.dfu,0)} DFU)</div>
    <div class="mgrid">
      ${tile('', dv('flow',sw.Qls,2), uLbl('flow'), 'Pump Flow')}
      ${tile('', dv('head',sw.tdh,1), uLbl('head'), 'TDH')}
      ${tile('', fmt(sw.kw,2)+' / '+fmt(sw.hp,1), 'kW / HP', 'Motor · 1+1')}
      ${tile('', dv('volume',sw.pit,2), uLbl('volume'), 'Pit Working Volume')}
    </div></div>`;

  /* drainage */
  const st=pl.storm;
  h+=`<div class="card glass"><div class="card-hd"><div class="card-title"><span class="dot" style="color:var(--plumb);background:var(--plumb)"></span>Drainage</div></div>
    <div class="mgrid">
      ${tile('hl t-teal', fmt(pl.dfu,0), 'DFU', 'Total Drainage Fixture Units')}
      ${tile('', dv('dia',pl.stackDia,0), uLbl('dia'), 'Soil Stack Ø')}
      ${tile('', dv('dia',pl.sewerDia,0), uLbl('dia'), 'Building Sewer Ø @ ' + (pval('plumb','slope')*100)+'%')}
    </div>
    <div class="sec">Storm / Roof Drainage (${dv('rain',st.rain,0)} ${uLbl('rain')})</div>
    <div class="mgrid">
      ${tile('', dv('flow',st.Qls,1), uLbl('flow'), 'Storm Runoff')}
      ${tile('', dv('dia',st.leader,0), uLbl('dia'), 'Leader / Downpipe Ø')}
      ${tile('', st.count, 'no.', 'Roof Drains (≈250 m² each)')}
    </div></div>`;

  /* per-space table */
  h+=spaceResultTable('plumb','Space Fixture Loads','var(--plumb)',
    ['Space','Floor','WSFU','DFU',`Peak (${uLbl('flow')})`,`Pipe Ø (${uLbl('dia')})`,`Drain Ø (${uLbl('dia')})`],
    (sp,fl,r)=>[E(sp.name),E(fl.name),fmt(r.wsfu,1),fmt(r.dfu,1),dv('flow',r.Qls,2),dv('dia',r.dia,0),r.branchD?dv('dia',r.branchD,0):'—']);
  return h;
}

/* ════════════════════════════════════════════════════════
   FIRE TAB
════════════════════════════════════════════════════════ */
function renderFire(){
  const fr=R.fire, hd=HAZ_DATA[fr.maxHaz];
  let h=defaultsCard('fire','Fire Protection Defaults','var(--fire)',
    'NFPA 13 density/area method. Hazard class auto-assigned per space type — override per space.');

  h+=`<div class="card glass"><div class="card-hd"><div class="card-title"><span class="dot" style="color:var(--fire);background:var(--fire)"></span>System Options</div></div>
    <div class="fg">
      <div class="f"><label>Standpipe System (NFPA 14)</label>
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0">
          <label class="sw"><input type="checkbox" ${S.fireSys.standpipe?'checked':''} onchange="UI.setFireSys('standpipe',this.checked)"><span class="kn"></span></label>
          <span class="hint" style="font-size:11.5px">include Class I/III standpipe demand</span></div></div>
      <div class="f"><label>Water Supply Duration <span class="u">(min)</span></label>
        <select onchange="UI.setFireSys('duration',+this.value)">
          ${[30,60,90,120].map(d=>`<option value="${d}" ${d===(S.fireSys.duration??hd.duration)?'selected':''}>${d} min</option>`).join('')}</select>
        <div class="hint">NFPA 13 default for ${hd.name}: ${hd.duration} min</div></div>
    </div></div>`;

  /* demand */
  h+=`<div class="card glass"><div class="card-hd"><div class="card-title"><span class="dot" style="color:var(--fire);background:var(--fire)"></span>Hydraulic Demand & Fire Pump</div>
      <span class="chip red">governing: ${E(fr.hazName)}</span></div>
    <div class="mgrid">
      ${tile('hl t-red', fmt(fr.spr,0), 'heads', 'Total Sprinklers')}
      ${tile('', dv('fdens',hd.density,1), uLbl('fdens'), 'Design Density')}
      ${tile('', dv('area',hd.designArea,0), uLbl('area'), 'Remote Design Area')}
      ${tile('', fmt(fr.sprFlow,0), 'L/min', 'Sprinkler Demand')}
      ${tile('', fmt(fr.hose,0), 'L/min', 'Hose Allowance')}
      ${S.fireSys.standpipe?tile('', fmt(fr.standpipe,0), 'L/min', 'Standpipe Demand'):''}
    </div>
    <div class="mgrid">
      ${tile('hl t-red', fmt(fr.pumpGpm,0)+' gpm', '@ '+fmt(fr.pumpBar,1)+' bar', 'Fire Pump (standard rating)')}
      ${tile('', dv('flow',fr.totFlowLs,1), uLbl('flow'), 'Total Demand')}
      ${tile('', fmt(fr.pumpKW,0), 'kW', 'Pump Driver (est.)')}
      ${tile('hl t-red', dv('volume',fr.tank,0), uLbl('volume'), `Fire Tank (${fr.duration} min)`)}
    </div>
    <div class="steps">Demand = density × design area + hose ${S.fireSys.standpipe?'+ standpipe ':''}
= ${fmt(hd.density,1)} mm/min × ${fmt(hd.designArea,0)} m² + ${fmt(fr.hose,0)}${S.fireSys.standpipe?' + '+fmt(fr.standpipe,0):''} = ${fmt(fr.totFlow,0)} L/min  (${fmt(fr.gpm,0)} gpm)
Pump pressure ≈ min operating + elevation (${fmt(+S.meta.height||0,0)} m) + friction + 100 kPa margin = ${fmt(fr.pumpKpa,0)} kPa
Tank = demand × ${fr.duration} min = ${fmt(fr.tank,0)} m³ — electric duty + diesel standby + jockey per NFPA 20</div>
    <div class="banner red">🧯 Portable extinguishers: <strong>${fr.extTotal}</strong> total (${fr.extPerFloor.map(x=>`${E(x.name)}: ${x.n}`).join(' · ')}) — max travel 23 m. Hose cabinets: <strong>${fr.cabinets}</strong>.</div>
  </div>`;

  /* per-space table */
  h+=spaceResultTable('fire','Space Sprinkler Layout','var(--fire)',
    ['Space','Floor',`Area (${uLbl('area')})`,'Hazard','Heads',`Branch Ø (${uLbl('dia')})`,`Main Ø (${uLbl('dia')})`],
    (sp,fl,r)=>[E(sp.name),E(fl.name),dv('area',sp.area,0),
      `<span class="chip ${r.haz==='LH'?'green':r.haz.startsWith('OH')?'amber':'red'}">${r.haz}</span>`,
      fmt(r.count,0),dv('dia',r.branchSize,0),dv('dia',r.mainSize,0)]);
  return h;
}

/* ════════════════════════════════════════════════════════
   REPORT TAB
════════════════════════════════════════════════════════ */
function renderReport(){
  const m=S.meta, hv=R.hvac, pl=R.plumb, fr=R.fire;
  let h=`<div class="card glass"><div class="card-hd">
    <div class="card-title"><span class="dot" style="color:var(--green);background:var(--green)"></span>Design Summary Report</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-p" style="background:linear-gradient(145deg,#7680dd,#5e6ad2);box-shadow:0 4px 14px rgba(94,106,210,.4),inset 0 1px 0 rgba(255,255,255,.35)" onclick="openLinear()">${ICO_LINEAR_W}&nbsp;Add to Linear</button>
      <button class="btn btn-p" onclick="UI.print()">🖨 Print / Save PDF</button>
    </div></div>
    <div class="card-sub">${E(m.name)} · ${E(m.buildingType)} · ${E(m.city?m.city+', ':'')}${E(m.country)} · ${E(m.date||'')}
    ${m.client?` · Client: ${E(m.client)}`:''}${m.engineer?` · By: ${E(m.engineer)}`:''}</div>
    <div class="hero">
      ${heroCard('Cooling Plant', fmt(hv.divTR,1),'TR @ diversity','#0a84ff','M12 3v18M3 12h18')}
      ${heroCard('Peak Water', dv('flow',pl.Qls,1),uLbl('flow'),'#00c7be','M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z')}
      ${heroCard('Fire Pump', fmt(fr.pumpGpm,0)+' gpm','@ '+fmt(fr.pumpBar,1)+' bar','#ff453a','M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 2 3 4 3 6a5 5 0 0 1-10 0c0-5 5-6 5-13z')}
      ${heroCard('Storage', fmt(pl.ugTank+pl.roofTank,0)+' + '+fmt(fr.tank,0),'m³ domestic + fire','#ff9f0a','M4 8h16v12H4zM4 8l8-5 8 5')}
    </div></div>`;
  h+=collap('rH','❄️ HVAC — space schedule', reportTable('hvac'), true);
  h+=collap('rP','💧 Plumbing — space schedule', reportTable('plumb'));
  h+=collap('rF','🔥 Fire — space schedule', reportTable('fire'));
  h+=collap('rE','⚙️ Equipment schedule', equipTable());
  return h;
}
function collap(id,title,body,open){
  return `<div class="collap glass ${open?'open':''}" id="${id}">
    <div class="collap-h" onclick="this.parentElement.classList.toggle('open')">${title}<span class="car">▶</span></div>
    <div class="collap-b">${body}</div></div>`;
}
function reportTable(disc){
  const rows=allSpaces().filter(x=>x.space.disc[disc]);
  if(!rows.length) return `<div class="hint">No spaces.</div>`;
  let heads,fn,totRow;
  if(disc==='hvac'){
    heads=['Space','Floor',`Area`,'kW','TR',`Supply ${uLbl('airflow')}`,`OA ${uLbl('airflow')}`,'SHR','Equipment'];
    fn=(sp,fl,r)=>[E(sp.name),E(fl.name),dv('area',sp.area,0),fmt(r.kW,1),fmt(r.TR,2),dv('airflow',r.airflowLs,0),dv('airflow',r.oaLs,0),(r.SHR*100).toFixed(0)+'%',E(r.equip)];
    totRow=['TOTAL','','',fmt(R.hvac.kW,1),fmt(R.hvac.TR,1),dv('airflow',R.hvac.air,0),dv('airflow',R.hvac.oa,0),'',''];
  } else if(disc==='plumb'){
    heads=['Space','Floor','WSFU','DFU',`Peak ${uLbl('flow')}`,`Pipe ${uLbl('dia')}`,`Drain ${uLbl('dia')}`];
    fn=(sp,fl,r)=>[E(sp.name),E(fl.name),fmt(r.wsfu,1),fmt(r.dfu,1),dv('flow',r.Qls,2),dv('dia',r.dia,0),r.branchD?dv('dia',r.branchD,0):'—'];
    totRow=['TOTAL','',fmt(R.plumb.wsfu,1),fmt(R.plumb.dfu,1),dv('flow',R.plumb.Qls,2),dv('dia',R.plumb.mainDia,0),dv('dia',R.plumb.sewerDia,0)];
  } else {
    heads=['Space','Floor',`Area`,'Hazard','Heads',`Branch ${uLbl('dia')}`,`Main ${uLbl('dia')}`];
    fn=(sp,fl,r)=>[E(sp.name),E(fl.name),dv('area',sp.area,0),r.haz,fmt(r.count,0),dv('dia',r.branchSize,0),dv('dia',r.mainSize,0)];
    totRow=['TOTAL','','',R.fire.maxHaz+' gov.',fmt(R.fire.spr,0),'',''];
  }
  let h=`<div style="overflow-x:auto"><table class="tbl"><thead><tr>${heads.map((x,i)=>`<th class="${i>=2?'num':''}">${x}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(({floor,space})=>{
    h+=`<tr>${fn(space,floor,R.spaces[space.id][disc]).map((c,i)=>`<td class="${i>=2?'num':''}">${c}</td>`).join('')}</tr>`;
  });
  h+=`<tr class="tot">${totRow.map((c,i)=>`<td class="${i>=2?'num':''}">${c}</td>`).join('')}</tr></tbody></table></div>`;
  return h;
}
function equipTable(){
  const pl=R.plumb, fr=R.fire, hv=R.hvac;
  const rows=[
    ['Cooling plant', E(hv.plant), fmt(hv.divKW,0)+' kW cooling'],
    ['Booster pump set (1+1)', dv('flow',pl.booster.Qls,1)+' '+uLbl('flow')+' @ '+dv('head',pl.booster.tdh,0)+' '+uLbl('head'), fmt(pl.booster.kw,1)+' kW each'],
    ['Transfer pump set (1+1)', dv('flow',pl.transfer.Qls,1)+' '+uLbl('flow')+' @ '+dv('head',pl.transfer.tdh,0)+' '+uLbl('head'), fmt(pl.transfer.kw,1)+' kW each'],
    ['Sewage submersible (1+1)', dv('flow',pl.sewage.Qls,1)+' '+uLbl('flow')+' @ '+dv('head',pl.sewage.tdh,0)+' '+uLbl('head'), fmt(pl.sewage.kw,1)+' kW each'],
    ['Central water heater', fmt(pl.heaterVol,0)+' L storage', fmt(pl.heaterKW,1)+' kW'],
    ['UG water tank', dv('volume',pl.ugTank,1)+' '+uLbl('volume'), 'potable, '+pl.days+'-day'],
    ['Roof water tank', dv('volume',pl.roofTank,1)+' '+uLbl('volume'), fmt(pl.roofLoad,0)+' kN full'],
    ['Fire pump set (NFPA 20)', fmt(fr.pumpGpm,0)+' gpm @ '+fmt(fr.pumpBar,1)+' bar', 'electric + diesel + jockey'],
    ['Fire water tank', dv('volume',fr.tank,0)+' '+uLbl('volume'), fr.duration+' min duration'],
    ['Sprinkler heads', fmt(fr.spr,0)+' no.', 'K'+fmt(pval('fire','K'),0)+', '+fr.maxHaz+' governing'],
    ['Portable extinguishers', fr.extTotal+' no.', 'max 23 m travel'],
    ['Fire hose cabinets', fr.cabinets+' no.', 'NFPA 14 Class II']
  ];
  return `<table class="tbl"><thead><tr><th>Item</th><th>Duty / Size</th><th>Notes</th></tr></thead><tbody>`+
    rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td style="color:var(--text2)">${r[2]}</td></tr>`).join('')+`</tbody></table>`;
}

/* ════════════════════════════════════════════════════════
   SPACE SHEET
════════════════════════════════════════════════════════ */
function renderSheet(){
  const s=findSpace(sheetId); if(!s) return;
  document.getElementById('sheetTitle').textContent=s.name;
  document.getElementById('sheetSub').textContent=`${s.type} · ${dv('area',s.area,0)} ${uLbl('area')} · ${s.occupants} occupants`;
  const labels={hvac:['HVAC','var(--hvac)'],plumb:['Plumbing','var(--plumb)'],fire:['Fire','var(--fire)']};
  const enabled=['hvac','plumb','fire'].filter(d=>s.disc[d]);
  if(!enabled.includes(sheetDisc)) sheetDisc=enabled[0]||'hvac';
  document.getElementById('sheetTabs').innerHTML=enabled.map(d=>
    `<button class="${d===sheetDisc?'on':''}" style="${d===sheetDisc?'color:'+labels[d][1]:''}" onclick="UI.sheetTab('${d}')">${labels[d][0]}</button>`).join('');
  const body=document.getElementById('sheetBody');
  if(!enabled.length){ body.innerHTML='<div class="banner">No disciplines enabled for this space.</div>'; return; }
  const r=R.spaces[s.id][sheetDisc];
  if(sheetDisc==='hvac') body.innerHTML=sheetHvac(s,r);
  else if(sheetDisc==='plumb') body.innerHTML=sheetPlumb(s,r);
  else body.innerHTML=sheetFire(s,r);
}
function sheetHvac(s,r){
  const fields=hvacFields(s);
  let h=`<div class="sec">Results — live</div><div class="mgrid">
    ${tile('hl',fmt(r.kW,1),'kW','Cooling Load')}
    ${tile('hl',fmt(r.TR,2),'TR','Tons')}
    ${tile('',dv('airflow',r.airflowLs,0),uLbl('airflow'),'Supply Air')}
    ${tile('',dv('airflow',r.oaLs,0),uLbl('airflow'),'Fresh Air (62.1)')}
    ${tile('',(r.SHR*100).toFixed(0)+'%','SHR','Sensible Ratio')}
    ${tile('',fmt(r.ductD,0),'mm Ø','Supply Duct @ 5 m/s')}
  </div>
  <div class="banner">⚙️ Suggested unit: <strong>${E(r.equip)}</strong></div>
  ${r.oaGov?`<div class="banner amber">ℹ️ Fresh air governed by <strong>${E(r.oaGov)}</strong> — verify against the local mechanical code.</div>`:''}
  ${r.SHR<0.65?`<div class="banner amber">⚠️ Low SHR (${(r.SHR*100).toFixed(0)}%) — consider dedicated dehumidification.</div>`:''}
  ${donut(r.comps)}
  <table class="tbl" style="margin-top:12px"><thead><tr><th>Component</th><th class="num">Sensible ${uLbl('power')}</th><th class="num">Latent ${uLbl('power')}</th><th class="num">Total</th></tr></thead><tbody>
  ${r.comps.map(c=>`<tr><td>${E(c.n)}</td><td class="num">${c.s>0?dv('power',c.s,0):'—'}</td><td class="num">${c.l>0?dv('power',c.l,0):'—'}</td><td class="num"><strong>${dv('power',c.s+c.l,0)}</strong></td></tr>`).join('')}
  <tr class="tot"><td>TOTAL × safety</td><td class="num">${dv('power',r.totS,0)}</td><td class="num">${dv('power',r.totL,0)}</td><td class="num">${dv('power',r.totS+r.totL,0)}</td></tr></tbody></table>
  <div class="sec">Geometry & Internal Loads — this space</div>
  <div class="fg">${fields.filter(f=>!f.shared).map(f=>fieldHTML('hvac',f,'s',s.id)).join('')}</div>
  <div class="sec">Design Conditions — inherited project defaults</div>
  <div class="fg">${fields.filter(f=>f.shared).map(f=>fieldHTML('hvac',f,'s',s.id)).join('')}</div>`;
  return h;
}
function donut(comps){
  const tot=comps.reduce((a,c)=>a+c.s+c.l,0); if(tot<=0) return '';
  const colors=['#0A84FF','#34C759','#FF9F0A','#FF453A','#BF5AF2','#00C7BE','#FF2D55','#AEAE32','#FF7A1A'];
  const Rr=52, Cc=2*Math.PI*Rr; let off=0, segs='', leg='';
  comps.forEach((c,i)=>{
    const v=c.s+c.l; if(v<=0) return;
    const frac=v/tot, len=frac*Cc;
    segs+=`<circle r="${Rr}" cx="70" cy="70" fill="none" stroke="${colors[i%colors.length]}" stroke-width="22"
      stroke-dasharray="${len-1.5} ${Cc-len+1.5}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;
    off+=len;
    leg+=`<div class="li"><span class="sw2" style="background:${colors[i%colors.length]}"></span>${E(c.n)}<span class="pc">${(frac*100).toFixed(0)}%</span></div>`;
  });
  return `<div class="donutwrap"><svg width="140" height="140" viewBox="0 0 140 140">${segs}
    <text x="70" y="66" text-anchor="middle" font-size="17" font-weight="800" fill="currentColor">${fmt(tot/1000,1)}</text>
    <text x="70" y="82" text-anchor="middle" font-size="9.5" font-weight="700" fill="currentColor" opacity=".55">kW</text></svg>
    <div class="legend">${leg}</div></div>`;
}
function sheetPlumb(s,r){
  let h=`<div class="sec">Results — live</div><div class="mgrid">
    ${tile('hl t-teal',fmt(r.wsfu,1),'WSFU','Supply Fixture Units')}
    ${tile('',fmt(r.dfu,1),'DFU','Drainage Fixture Units')}
    ${tile('hl t-teal',dv('flow',r.Qls,2),uLbl('flow'),'Peak Flow (Hunter)')}
    ${tile('',dv('dia',r.dia,0),uLbl('dia'),'Branch Pipe Ø')}
    ${tile('',dv('velocity',r.actV,2),uLbl('velocity'),'Velocity')}
    ${tile('',r.branchD?dv('dia',r.branchD,0):'—',uLbl('dia'),'Drain Branch Ø')}
  </div>
  <div class="sec">Fixture Schedule
    ${FIX_SUGGEST[s.type]?`<button class="btn btn-g btn-sm" style="margin-left:auto" onclick="UI.suggestFix(${s.id})">✨ Auto-suggest for ${E(s.type)}</button>`:''}
  </div>
  <table class="tbl"><thead><tr><th>Fixture</th><th class="num">Qty</th><th class="num">WSFU ea</th><th class="num">DFU ea</th><th class="num">Σ WSFU</th><th class="num">Σ DFU</th></tr></thead><tbody>`;
  FIXTURES.forEach(fx=>{
    const q=+(s.fixtures[fx.k]||0);
    h+=`<tr><td>${fx.n}${fx.hot?' <span class="chip amber" style="font-size:9px;padding:1px 6px">hot</span>':''}</td>
      <td class="num"><input type="number" min="0" value="${q}" onchange="UI.setFix(${s.id},'${fx.k}',this.value)"></td>
      <td class="num">${fx.wsfu}</td><td class="num">${fx.dfu}</td>
      <td class="num">${fmt(q*fx.wsfu,1)}</td><td class="num">${fmt(q*fx.dfu,1)}</td></tr>`;
  });
  h+=`<tr class="tot"><td colspan="4">TOTAL</td><td class="num">${fmt(r.wsfu,1)}</td><td class="num">${fmt(r.dfu,1)}</td></tr></tbody></table>
  <div class="sec">Design Parameters — inherited project defaults</div>
  <div class="fg">${plumbFields(s).map(f=>fieldHTML('plumb',f,'s',s.id)).join('')}</div>`;
  return h;
}
function sheetFire(s,r){
  const hd=HAZ_DATA[r.haz];
  return `<div class="sec">Results — live</div><div class="mgrid">
    ${tile('hl t-red',fmt(r.count,0),'heads','Sprinklers')}
    ${tile('',dv('area',s.area,0),uLbl('area'),'Protected Area')}
    ${tile('',hd.name.split(' ').slice(0,2).join(' '),r.haz,'Hazard Class')}
    ${tile('',dv('fdens',r.density,1),uLbl('fdens'),'Design Density')}
    ${tile('',dv('dia',r.branchSize,0),uLbl('dia'),'Branch Ø')}
    ${tile('',dv('dia',r.mainSize,0),uLbl('dia'),'Main Ø')}
  </div>
  <div class="banner">Max spacing ${hd.spacing} m · coverage ≤ ${fmt(fval(s,'fire','covArea'),1)} m²/head · pipe sizes per NFPA 13 schedule (steel).</div>
  <div class="sec">Parameters</div>
  <div class="fg">${fireFields(s).map(f=>fieldHTML('fire',f,'s',s.id)).join('')}</div>`;
}

/* ════════════════════════════════════════════════════════
   PRINT REPORT
════════════════════════════════════════════════════════ */
function buildPrint(){
  const m=S.meta, hv=R.hvac, pl=R.plumb, fr=R.fire, hd=HAZ_DATA[fr.maxHaz];
  const t=(disc)=>reportTable(disc).replace(/class="tbl"/g,'').replace(/<div style="overflow-x:auto">|<\/div>$/g,'');
  return `
  <div class="phead">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.07 8A8 8 0 0 1 18.93 8L5.07 16A8 8 0 0 0 18.93 16"/></svg>
    <h1>${E(m.name)}</h1>
  </div>
  <div class="pmeta">MEP Concept Design Summary — ${E(m.buildingType)} · ${E(m.city?m.city+', ':'')}${E(m.country)} · ${E(m.date||'')}
   ${m.client?`· Client: ${E(m.client)} `:''}${m.engineer?`· Prepared by: ${E(m.engineer)}`:''}</div>
  <div class="pmeta">Codes: ${(COUNTRY_CODES[m.country]||[]).join(' · ')} · Units: ${S.units==='imp'?'Imperial':'SI'}</div>

  <h2>1. Project Summary</h2>
  <table><tr><th>Floors</th><th>Spaces</th><th>Total Area</th><th>Occupants</th><th>Height</th></tr>
  <tr><td>${S.floors.length}</td><td>${allSpaces().length}</td><td>${dvu('area',totalArea(),0)}</td><td>${totalOccupants()}</td><td>${dvu('length',m.height,1)}</td></tr></table>

  <h2>2. HVAC</h2>
  <div class="pmeta">Design: ${dv('temp',cd().odb,0)}/${dv('temp',cd().owb,0)} ${uLbl('temp')} outdoor DB/WB · ${dv('temp',cd().idb,0)} ${uLbl('temp')} / ${cd().irh}% RH indoor · ASHRAE 62.1 ventilation</div>
  <table><tr><th>Total Cooling</th><th>@ Diversity ${Math.round(S.hvacSys.diversity*100)}%</th><th>Supply Air</th><th>Fresh Air</th><th>Plant</th></tr>
  <tr><td>${fmt(hv.kW,1)} kW / ${fmt(hv.TR,1)} TR</td><td>${fmt(hv.divKW,1)} kW / ${fmt(hv.divTR,1)} TR</td>
  <td>${dvu('airflow',hv.air,0)}</td><td>${dvu('airflow',hv.oa,0)}</td><td>${E(hv.plant)}</td></tr></table>
  <h3>Space schedule</h3>${t('hvac')}

  <h2>3. Plumbing</h2>
  <table><tr><th>Peak Demand</th><th>Main Ø</th><th>Daily Demand</th><th>UG Tank</th><th>Roof Tank</th><th>Booster</th><th>Heater</th></tr>
  <tr><td>${fmt(pl.wsfu,0)} WSFU → ${dvu('flow',pl.Qls,2)}</td><td>${dvu('dia',pl.mainDia,0)}</td><td>${fmt(pl.daily,1)} m³/d</td>
  <td>${dvu('volume',pl.ugTank,1)}</td><td>${dvu('volume',pl.roofTank,1)}</td>
  <td>${dvu('flow',pl.booster.Qls,1)} @ ${dvu('head',pl.booster.tdh,0)} (${fmt(pl.booster.kw,1)} kW)</td>
  <td>${fmt(pl.heaterVol,0)} L / ${fmt(pl.heaterKW,1)} kW</td></tr></table>
  <table><tr><th>Total DFU</th><th>Soil Stack</th><th>Sewer</th><th>Sewage Pump</th><th>Storm Runoff</th><th>Leaders</th></tr>
  <tr><td>${fmt(pl.dfu,0)}</td><td>${dvu('dia',pl.stackDia,0)}</td><td>${dvu('dia',pl.sewerDia,0)}</td>
  <td>${dvu('flow',pl.sewage.Qls,1)} @ ${dvu('head',pl.sewage.tdh,0)}</td>
  <td>${dvu('flow',pl.storm.Qls,1)}</td><td>${pl.storm.count} × ${dvu('dia',pl.storm.leader,0)}</td></tr></table>
  <h3>Space schedule</h3>${t('plumb')}

  <h2>4. Fire Protection</h2>
  <div class="pmeta">NFPA 13 density/area · governing hazard: ${hd.name} (${fmt(hd.density,1)} mm/min over ${fmt(hd.designArea,0)} m²)</div>
  <table><tr><th>Sprinklers</th><th>Demand</th><th>Fire Pump</th><th>Pressure</th><th>Tank (${fr.duration} min)</th><th>Extinguishers</th><th>Cabinets</th></tr>
  <tr><td>${fmt(fr.spr,0)}</td><td>${fmt(fr.totFlow,0)} L/min (${fmt(fr.gpm,0)} gpm)</td><td>${fmt(fr.pumpGpm,0)} gpm</td>
  <td>${fmt(fr.pumpBar,1)} bar</td><td>${dvu('volume',fr.tank,0)}</td><td>${fr.extTotal}</td><td>${fr.cabinets}</td></tr></table>
  <h3>Space schedule</h3>${t('fire')}

  <h2>5. Equipment Schedule</h2>${equipTable().replace('class="tbl"','')}
  <div class="pmeta" style="margin-top:14px">Concept-stage estimates generated by MEP Studio · by Ozil — verify all values against governing local codes and detailed hydraulic/load calculations before issue.</div>`;
}

/* ════════════════════════════════════════════════════════
   UI ACTION NAMESPACE
════════════════════════════════════════════════════════ */
const UI = {
  refresh(keepSheet){
    R = recalcAll();
    document.getElementById('brandName').textContent = S.meta.name || 'MEP Studio';
    const v=document.getElementById('view');
    const scroll=v.scrollTop||window.scrollY;
    if(activeTab==='project') v.innerHTML=renderProject();
    else if(activeTab==='hvac') v.innerHTML=renderHvac();
    else if(activeTab==='plumb') v.innerHTML=renderPlumb();
    else if(activeTab==='fire') v.innerHTML=renderFire();
    else v.innerHTML=renderReport();
    window.scrollTo({top:scroll, left:0, behavior:'instant'});
    if(keepSheet!==false && sheetId!=null && document.getElementById('sheet').classList.contains('show')) renderSheet();
  },
  tab(t){
    activeTab=t;
    document.querySelectorAll('#mainTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
    UI.refresh(false);
    /* bubbly entrance on tab switch only — field edits re-render without replaying it */
    const v=document.getElementById('view');
    v.classList.remove('swap'); void v.offsetWidth; v.classList.add('swap');
    clearTimeout(UI._sw); UI._sw=setTimeout(()=>v.classList.remove('swap'),800);
  },
  /* meta & systems */
  meta(k,v){ S.meta[k]=v; if(k==='buildingType') allSpaces().forEach(x=>{ if(x.space.occAuto) x.space.occupants=spaceOcc(x.space.type,x.space.area); }); App.save(); UI.refresh(); },
  setCountry(c){ S.meta.country=c; S.meta.city=''; App.save(); UI.refresh(); },
  setCity(c){ S.meta.city=c; App.save(); UI.refresh(); },
  setHvacSys(k,v){ S.hvacSys[k]=v; App.save(); UI.refresh(); },
  setPlumbSys(k,v){ S.plumbSys[k]=v; App.save(); UI.refresh(); },
  setFireSys(k,v){ S.fireSys[k]=v; App.save(); UI.refresh(); },
  /* floors & spaces */
  addFloor(){ S.floors.push(App.newFloor('Floor '+(S.floors.length+1), S.floors.length===0?'ground':'middle')); App.save(); UI.refresh(); },
  rmFloor(id){ const f=S.floors.find(x=>x.id===id); if(f && f.spaces.length && !confirm(`Remove "${f.name}" and its ${f.spaces.length} space(s)?`)) return; S.floors=S.floors.filter(x=>x.id!==id); App.save(); UI.refresh(); },
  dupFloor(id){
    const f=S.floors.find(x=>x.id===id); if(!f) return;
    const cp=JSON.parse(JSON.stringify(f)); cp.id=App.nid(); cp.name=f.name+' copy';
    cp.spaces.forEach(sp=>sp.id=App.nid());
    S.floors.splice(S.floors.indexOf(f)+1,0,cp); App.save(); UI.refresh(); toast('Floor duplicated');
  },
  setFloor(id,k,v){ const f=S.floors.find(x=>x.id===id); if(f) f[k]=v; App.save(); UI.refresh(); },
  addSpace(fid){ const f=S.floors.find(x=>x.id===fid); if(!f) return;
    const types=SPACE_CAT[bt()]||['Office'];
    f.spaces.push(App.newSpace('Space '+(f.spaces.length+1), types[0])); App.save(); UI.refresh(); },
  rmSpace(id){ S.floors.forEach(f=>f.spaces=f.spaces.filter(s=>s.id!==id)); App.save(); UI.refresh(); },
  setSpace(id,k,v){
    const s=findSpace(id); if(!s) return;
    s[k]=k==='area'?Math.max(0,+v||0):v;
    if((k==='area'||k==='type') && s.occAuto) s.occupants=spaceOcc(s.type,s.area);
    App.save(); UI.refresh();
  },
  setOcc(id,v){ const s=findSpace(id); if(!s) return; s.occupants=Math.max(0,Math.round(+v||0)); s.occAuto=false; App.save(); UI.refresh(); },
  occAuto(id){ const s=findSpace(id); if(!s) return; s.occAuto=true; s.occupants=spaceOcc(s.type,s.area); App.save(); UI.refresh(); },
  tglDisc(id,d){ const s=findSpace(id); if(!s) return; s.disc[d]=!s.disc[d]; App.save(); UI.refresh(); },
  /* fields */
  setField(el,kind,sid,disc,key){
    const spec=fieldSpec(disc,key, kind==='s'?findSpace(+sid):null);
    let v=el.value;
    if(spec.type!=='select'){ if(v===''||isNaN(+v)){ UI.refresh(); return; } v=spec.qty?uIn(spec.qty,+v):+v; v=parseFloat((+v).toPrecision(8)); }
    if(kind==='s'){ const s=findSpace(+sid); (s.ov[disc]||(s.ov[disc]={}))[key]=v; }
    else { (S.ov[disc]||(S.ov[disc]={}))[key]=v; }
    App.save(); UI.refresh();
  },
  resetField(kind,sid,disc,key){
    if(kind==='s'){ const s=findSpace(+sid); if(s&&s.ov[disc]) delete s.ov[disc][key]; }
    else if(S.ov[disc]) delete S.ov[disc][key];
    App.save(); UI.refresh();
  },
  /* fixtures */
  setFix(id,k,v){ const s=findSpace(id); if(!s) return; s.fixtures[k]=Math.max(0,Math.round(+v||0)); App.save(); UI.refresh(); },
  suggestFix(id){
    const s=findSpace(id); if(!s) return;
    const fn=FIX_SUGGEST[s.type]; if(!fn){ toast('No suggestion for this type'); return; }
    s.fixtures=Object.assign({}, fn(+s.area||0, +s.occupants||0));
    App.save(); UI.refresh(); toast('Fixtures suggested — verify per IPC 403');
  },
  /* sheet */
  openSheet(id,disc){
    sheetId=id; if(disc) sheetDisc=disc;
    renderSheet();
    document.getElementById('sheetBg').classList.add('show');
    document.getElementById('sheet').classList.add('show');
  },
  closeSheet(){
    document.getElementById('sheetBg').classList.remove('show');
    document.getElementById('sheet').classList.remove('show');
    UI.refresh(false);
  },
  sheetTab(d){ sheetDisc=d; renderSheet(); },
  /* projects sidebar */
  toggleSidebar(force){
    const sb=document.getElementById('sidebar'), bg=document.getElementById('sideBg');
    const show = force!==undefined ? force : !sb.classList.contains('show');
    sb.classList.toggle('show',show); bg.classList.toggle('show',show);
    if(show) UI.renderSidebar();
  },
  renderSidebar(){
    const el=document.getElementById('sideList'); if(!el) return;
    const list=App.store.projects.slice().sort((a,b)=>(b.updated||0)-(a.updated||0));
    if(!list.length){ el.innerHTML='<div class="side-empty">No saved projects yet.<br>Your work saves here automatically.</div>'; return; }
    el.innerHTML=list.map(p=>{
      const fl=(p.data&&p.data.floors)||[], spc=fl.reduce((a,f)=>a+((f.spaces||[]).length),0);
      const d=p.updated?new Date(p.updated):null;
      const when=d?d.toLocaleDateString(undefined,{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}):'';
      return `<div class="side-item ${p.id===App.store.cur?'cur':''}" onclick="UI.openProject('${p.id}')">
        <div class="si-main">
          <div class="si-name">${E(p.name||'Untitled')}</div>
          <div class="si-meta">${E(when)} · ${fl.length} floor${fl.length===1?'':'s'} · ${spc} space${spc===1?'':'s'}</div>
        </div>
        <div class="si-act">
          <button title="Duplicate" onclick="event.stopPropagation();UI.dupProject('${p.id}')">⧉</button>
          <button class="del" title="Delete" onclick="event.stopPropagation();UI.deleteProject('${p.id}')">✕</button>
        </div></div>`;
    }).join('');
  },
  newProject(){ App.newProject(); },
  openProject(id){ App.openProject(id); },
  deleteProject(id){ App.deleteProject(id); },
  dupProject(id){ App.dupProject(id); },
  /* persistence shortcuts */
  print(){ document.getElementById('printArea').innerHTML=buildPrint(); window.print(); },
  saveProjectFile(){ App.exportFile(); },
  openProjectFile(inp){ App.importFile(inp); },
  loadSample(){ App.loadSample(); },
  resetProject(){ if(confirm('Clear this project back to blank? (Export first if needed.)')) App.reset(); }
};
