/* ════════════════════════════════════════════════════════
   MEP STUDIO — BODR (Basis of Design Report, .docx) export
   Builds a real OOXML package (zip, stored entries) with no
   dependencies. All numbers come from the live project state
   (S) and the calculation results (recalcAll()).

   Code citations: every section/table number below was
   verified against the published codes (June 2026):
   SBC 2024 series (ICC 2021-aligned), NFPA 13 (2025),
   NFPA 14 (2024), NFPA 20 (2025), NFPA 10 (2026),
   ASHRAE 62.1/90.1 (2025), UPC (2024), IPC (2021).
   Do NOT add citations from memory — verify first.
════════════════════════════════════════════════════════ */

/* ── discipline palette (mirrors the BODR template) ── */
const RPT_COL = {fire:'2E75B6', hvac:'2E7D32', plumb:'1F4E79', navy:'1F4E79', gray:'555555', border:'AAAAAA', hvacDark:'1E4620'};

/* ── governing codes per country — latest official editions ── */
const REPORT_CODES = {
  KSA:{
    note:'Saudi Building Code 2024 editions (in force since 1 July 2025), aligned with the ICC 2021 family.',
    fire:[['SBC 801 (2024)','Saudi Fire Code — fire protection requirements, Civil Defense compliance'],
      ['SBC 201 (2024)','Saudi General Building Code — occupancy classification'],
      ['NFPA 13 (2025 Ed.)','Installation of Sprinkler Systems'],
      ['NFPA 14 (2024 Ed.)','Standpipe and Hose Systems'],
      ['NFPA 20 (2025 Ed.)','Stationary Pumps for Fire Protection'],
      ['NFPA 10 (2026 Ed.)','Portable Fire Extinguishers']],
    hvac:[['SBC 501 (2024)','Saudi Mechanical Code — load calculations (§312.1), ventilation (Ch. 4)'],
      ['SBC 601 (2024)','Saudi Energy Conservation Code'],
      ['ASHRAE 62.1 (2025)','Ventilation and Acceptable Indoor Air Quality'],
      ['ASHRAE 90.1 (2025)','Energy Standard — equipment minimum efficiencies'],
      ['ASHRAE Handbook — Fundamentals (2025)','Cooling load methodology (Ch. 18, RTS)']],
    plumb:[['SBC 701 (2024)','Saudi Plumbing Code — fixtures, water sizing (App. E), drainage'],
      ['UPC (2024 Ed.)','Uniform Plumbing Code — cross-reference where accepted'],
      ['MEWA / Amanah guidelines','Water demand, storage reserve, site drainage']]
  },
  UAE:{
    note:'UAE Fire and Life Safety Code of Practice (2018 Ed., as amended) — confirm current amendment with the emirate Civil Defence.',
    fire:[['UAE Fire & Life Safety Code of Practice (2018 Ed., as amended)','Primary fire code — Civil Defence compliance'],
      ['NFPA 13 (2025 Ed.)','Sprinkler Systems'],['NFPA 14 (2024 Ed.)','Standpipe and Hose Systems'],
      ['NFPA 20 (2025 Ed.)','Fire Pumps'],['NFPA 10 (2026 Ed.)','Portable Fire Extinguishers']],
    hvac:[['ASHRAE 62.1 (2025)','Ventilation and Acceptable Indoor Air Quality'],
      ['ASHRAE 90.1 (2025)','Energy Standard — equipment minimum efficiencies'],
      ['Dubai GBR / Al Sa’fat or Estidama (per emirate)','Local energy overlay'],
      ['ASHRAE Handbook — Fundamentals (2025)','Load calculation methodology']],
    plumb:[['UPC (2024 Ed.)','Fixture units, pipe sizing, drainage design'],
      ['Local municipality regulations','Sanitary installation requirements'],
      ['DEWA / ADDC / SEWA guidelines','Utility connection standards']]
  },
  Egypt:{
    note:'Egyptian codes are issued in parts by HBRC — confirm the exact part number and edition with the AHJ.',
    fire:[['Egyptian Fire Code (Code 126, HBRC — latest ed.)','Primary national fire code (NFPA-aligned)'],
      ['NFPA 13 (2025 Ed.)','Sprinkler Systems'],['NFPA 14 (2024 Ed.)','Standpipe and Hose Systems'],
      ['NFPA 20 (2025 Ed.)','Fire Pumps'],['NFPA 10 (2026 Ed.)','Portable Fire Extinguishers']],
    hvac:[['Egyptian Code for HVAC works (HBRC)','Primary mechanical code (confirm edition with AHJ)'],
      ['ECP 306','Energy efficiency in buildings'],
      ['ASHRAE 62.1 (2025)','Ventilation'],['ASHRAE 90.1 (2025)','Energy efficiency'],
      ['ASHRAE Handbook — Fundamentals (2025)','Load calcs']],
    plumb:[['Egyptian Code for Sanitary Installations (HBRC)','Primary code (confirm edition with AHJ)'],
      ['UPC (2024 Ed.)','Reference for fixture units'],
      ['Local water authority guidelines','Connection standards']]
  },
  Qatar:{
    note:'QCS 2024 (QS 27/2024) replaced QCS 2014 — confirm applicable section numbers with the AHJ.',
    fire:[['QCDD Fire Safety Standards (latest)','Primary fire code — Qatar Civil Defence'],
      ['NFPA 13 (2025 Ed.)','Sprinkler Systems'],['NFPA 14 (2024 Ed.)','Standpipe and Hose Systems'],
      ['NFPA 20 (2025 Ed.)','Fire Pumps'],['NFPA 10 (2026 Ed.)','Portable Fire Extinguishers']],
    hvac:[['QCS 2024 (QS 27/2024)','Qatar Construction Specifications — mechanical sections'],
      ['ASHRAE 62.1 (2025)','Ventilation'],['ASHRAE 90.1 (2025)','Energy efficiency'],
      ['ASHRAE Handbook — Fundamentals (2025)','Load calcs']],
    plumb:[['QCS 2024 (QS 27/2024)','Plumbing / drainage sections'],
      ['UPC (2024 Ed.)','Reference for fixture units'],
      ['Kahramaa guidelines','Connection standards']]
  },
  Jordan:{
    note:'Confirm the governing Jordanian National Building Code volumes and editions with the AHJ.',
    fire:[['Jordanian National Building Codes (fire volumes)','Primary fire code — confirm edition with AHJ'],
      ['NFPA 13 (2025 Ed.)','Sprinkler Systems'],['NFPA 14 (2024 Ed.)','Standpipe and Hose Systems'],
      ['NFPA 20 (2025 Ed.)','Fire Pumps'],['NFPA 10 (2026 Ed.)','Portable Fire Extinguishers']],
    hvac:[['Jordanian National Building Codes (mechanical volumes)','Primary mechanical code'],
      ['ASHRAE 62.1 (2025)','Ventilation'],['ASHRAE 90.1 (2025)','Energy efficiency'],
      ['ASHRAE Handbook — Fundamentals (2025)','Load calcs']],
    plumb:[['Jordanian National Building Codes (plumbing volumes)','Primary code'],
      ['IPC (2021 Ed.)','Reference for fixture units and drainage'],
      ['Local water authority guidelines','Connection standards']]
  },
  Generic:{
    note:'No local code selected — NFPA / ASHRAE / IPC-UPC suite applied; confirm the local primary codes before issue.',
    fire:[['NFPA 13 (2025 Ed.)','Sprinkler Systems'],['NFPA 14 (2024 Ed.)','Standpipe and Hose Systems'],
      ['NFPA 20 (2025 Ed.)','Fire Pumps'],['NFPA 10 (2026 Ed.)','Portable Fire Extinguishers']],
    hvac:[['ASHRAE 62.1 (2025)','Ventilation'],['ASHRAE 90.1 (2025)','Energy efficiency'],
      ['ASHRAE Handbook — Fundamentals (2025)','Load calcs']],
    plumb:[['IPC (2021 Ed.) / UPC (2024 Ed.)','Fixture units, pipe sizing, drainage'],
      ['Local water authority guidelines','Connection standards']]
  }
};

/* Single-point design criteria — NFPA 13 (2025) Table 19.2.3.1.1 (verified) */
const RPT_SP = {
  LH: '0.10 gpm/ft² (4.1 mm/min) over 1,500 ft² (139 m²)',
  OH1:'0.15 gpm/ft² (6.1 mm/min) over 1,500 ft² (139 m²)',
  OH2:'0.20 gpm/ft² (8.1 mm/min) over 1,500 ft² (139 m²)',
  EH1:'0.30 gpm/ft² (12.2 mm/min) over 2,500 ft² (232 m²)',
  EH2:'0.40 gpm/ft² (16.3 mm/min) over 2,500 ft² (232 m²)'
};
/* NFPA 13 occupancy-classification sections (verified, 2022/2025 numbering) */
const RPT_HAZSEC = {LH:'4.3.2', OH1:'4.3.3.1', OH2:'4.3.3.2', EH1:'4.3.4', EH2:'4.3.5'};
/* Max coverage per standard spray sprinkler — Table 10.2.4.2.1 (verified) */
const RPT_COV = {LH:'225 ft² (20.9 m²)', OH1:'130 ft² (12.1 m²)', OH2:'130 ft² (12.1 m²)', EH1:'100 ft² (9.3 m²)', EH2:'100 ft² (9.3 m²)'};
/* SBC 201 (2024) / IBC 2021 occupancy groups by building type (verified) */
const RPT_OCCGRP = {office:['Business — Group B','§304'], retail:['Mercantile — Group M','§309'],
  residential:['Residential — Group R-2','§310'], hotel:['Residential — Group R-1','§310'],
  healthcare:['Institutional — Group I-2','§308'], educational:['Educational — Group E','§305'],
  mosque:['Assembly — Group A-3','§303'], industrial:['Factory — Group F','§306']};

/* ════════════════ OOXML helpers ════════════════ */
const XX = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function xRun(t,o){
  o=o||{};
  let pr='';
  if(o.b)pr+='<w:b/>';
  if(o.i)pr+='<w:i/><w:iCs/>';
  if(o.color)pr+='<w:color w:val="'+o.color+'"/>';
  if(o.sz)pr+='<w:sz w:val="'+o.sz+'"/><w:szCs w:val="'+o.sz+'"/>';
  return '<w:r>'+(pr?'<w:rPr>'+pr+'</w:rPr>':'')+'<w:t xml:space="preserve">'+XX(t)+'</w:t></w:r>';
}
function xPara(runs,p){
  p=p||{};
  let pr='';
  if(p.brk)pr+='<w:pageBreakBefore/>';
  if(p.bdr)pr+='<w:pBdr>'+p.bdr+'</w:pBdr>';
  if(p.before!=null||p.after!=null)pr+='<w:spacing w:before="'+(p.before||0)+'" w:after="'+(p.after==null?120:p.after)+'"/>';
  if(p.ind)pr+='<w:ind w:left="'+p.ind+'"/>';
  if(p.align)pr+='<w:jc w:val="'+p.align+'"/>';
  return '<w:p>'+(pr?'<w:pPr>'+pr+'</w:pPr>':'')+(Array.isArray(runs)?runs.join(''):runs)+'</w:p>';
}
const xT  = (t,o,p)=>xPara([xRun(t,o)],p);
const xBody = t => xPara([xRun(t)],{after:120});
function xH1(t,disc){
  return xPara([xRun(t,{b:1,sz:32,color:RPT_COL.navy})],
    {before:240,after:120,bdr:'<w:bottom w:val="single" w:sz="8" w:space="2" w:color="'+RPT_COL[disc]+'"/>'});
}
function xH2(t,disc){ return xPara([xRun(t,{b:1,sz:26,color:RPT_COL[disc]})],{before:160,after:80}); }
/* code-quote block: left accent border, italic gray 9pt */
function xQuote(t,disc){
  return xPara([xRun(t,{i:1,sz:18,color:RPT_COL.gray})],
    {before:60,after:60,ind:720,bdr:'<w:left w:val="single" w:sz="12" w:space="8" w:color="'+RPT_COL[disc]+'"/>'});
}
/* em-dash design note: italic gray 9pt */
function xNote(t){ return xPara([xRun('— '+t,{i:1,sz:18,color:RPT_COL.gray})],{before:80,after:80}); }

/* table: rows = array of cell-arrays; first row is the header.
   Emits an explicit tblGrid + fixed layout + per-cell widths — required for
   Word Online, which collapses width-less tables into unreadable strips. */
const RPT_PAGEW = 9026;   /* A4 content width in twips (11906 − 2×1440) */
function xTblBorders(){
  return '<w:tblBorders>'+['top','left','bottom','right','insideH','insideV']
    .map(s=>'<w:'+s+' w:val="single" w:sz="8" w:space="0" w:color="'+RPT_COL.border+'"/>').join('')+'</w:tblBorders>';
}
function xTable(rows,disc,opt){
  opt=opt||{};
  const n=rows[0].length;
  /* column weights: text-heavy first columns wider than numeric columns */
  let w=opt.widths;
  if(!w){
    if(n===2)w=[1.1,1.9];
    else if(n===3)w=[1.6,1.2,1.2];
    else { w=rows[0].map(()=>1); w[0]=1.9; w[1]=1.3; }
  }
  const sum=w.reduce((a,b)=>a+b,0);
  const cw=w.map(x=>Math.floor(RPT_PAGEW*x/sum));
  let x='<w:tbl><w:tblPr><w:tblW w:w="'+RPT_PAGEW+'" w:type="dxa"/>'+xTblBorders()+
    '<w:tblLayout w:type="fixed"/>'+
    '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>'+
    '<w:tblGrid>'+cw.map(c=>'<w:gridCol w:w="'+c+'"/>').join('')+'</w:tblGrid>';
  rows.forEach((cells,ri)=>{
    const hdr=ri===0, tot=opt.totalLast&&ri===rows.length-1;
    const fill=hdr?(disc==='hvac'?RPT_COL.hvacDark:RPT_COL[disc]) : tot?(disc==='hvac'?RPT_COL.hvacDark:RPT_COL[disc]) : (ri%2===0?'F5F5F5':'FFFFFF');
    x+='<w:tr>'+(hdr?'<w:trPr><w:tblHeader/></w:trPr>':'');
    cells.forEach((c,ci)=>{
      const white=hdr||tot;
      x+='<w:tc><w:tcPr><w:tcW w:w="'+cw[ci]+'" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="'+fill+'"/><w:vAlign w:val="center"/></w:tcPr>'+
        xPara([xRun(c,{b:white,sz:18,color:white?'FFFFFF':'000000'})],{after:0,align:(hdr||ci>=(opt.numFrom==null?2:opt.numFrom))?'center':'left'})+
        '</w:tc>';
    });
    x+='</w:tr>';
  });
  return x+'</w:tbl>'+xPara([xRun('',{sz:8})],{after:0});
}

/* two-column metadata table (cover pages) */
function xMetaTable(pairs){
  const w1=2600, w2=4800;
  let x='<w:tbl><w:tblPr><w:tblW w:w="'+(w1+w2)+'" w:type="dxa"/><w:jc w:val="center"/>'+xTblBorders()+
    '<w:tblLayout w:type="fixed"/>'+
    '<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr>'+
    '<w:tblGrid><w:gridCol w:w="'+w1+'"/><w:gridCol w:w="'+w2+'"/></w:tblGrid>';
  pairs.forEach(p=>{
    x+='<w:tr><w:tc><w:tcPr><w:tcW w:w="'+w1+'" w:type="dxa"/></w:tcPr>'+xPara([xRun(p[0],{b:1,sz:20})],{after:0})+'</w:tc>'+
       '<w:tc><w:tcPr><w:tcW w:w="'+w2+'" w:type="dxa"/></w:tcPr>'+xPara([xRun(p[1],{sz:20})],{after:0})+'</w:tc></w:tr>';
  });
  return x+'</w:tbl>';
}

function xCover(ordinal,title,disc,codesLine,first){
  const m=S.meta;
  let x='';
  x+=xPara([xRun('')],first?{after:600}:{brk:1,after:600});
  x+=xT(ordinal,{b:1,sz:36,color:RPT_COL.navy},{align:'center',after:60});
  x+=xT(title,{b:1,sz:56,color:RPT_COL.navy},{align:'center',after:120});
  x+=xT('Concept Stage',{b:1,sz:44,color:RPT_COL.navy},{align:'center',after:120});
  x+=xT(m.name||'MEP Project',{b:1,sz:36,color:RPT_COL[disc]},{align:'center',after:480});
  x+=xMetaTable([
    ['Document Type','Basis of Design Report (BODR) — '+title],
    ['Discipline',{fire:'Fire Fighting (FF)',hvac:'Mechanical (HVAC)',plumb:'Plumbing (PL)'}[disc]],
    ['LOD','Concept Design'],
    ['Project',(m.name||'—')+(m.client?' — '+m.client:'')],
    ['Location',(m.city?m.city+', ':'')+m.country],
    ['Governing Codes',codesLine],
    ['Date',m.date||new Date().toISOString().slice(0,10)],
    ['Revision','R00 — Initial Issue'],
    ['Prepared By',m.engineer||'MEP Engineer']
  ]);
  x+=xPara([xRun('')],{after:240});
  /* revision history */
  x+=xH2('Revision History',disc);
  x+=xTable([['Rev.','Date','Prepared By','Description'],
    ['R00',m.date||'',m.engineer||'MEP Engineer','Initial Issue — '+title+' Design']],disc,{numFrom:99});
  x+=xPara([xRun('')],{brk:1,after:0});
  return x;
}

/* ════════════════ content builders ════════════════ */
const RF = (v,d)=>(v==null||!isFinite(+v))?'—':(+v).toLocaleString('en-US',{minimumFractionDigits:d??0,maximumFractionDigits:d??2});

function rptCodesTable(disc,extra){
  const cc=REPORT_CODES[CC()]||REPORT_CODES.Generic;
  let x=xH2('1.1 Governing Codes & Standards',disc);
  x+=xTable([['Code','Application']].concat(cc[disc]).concat(extra||[]),disc,{numFrom:99});
  if(cc.note)x+=xNote(cc.note);
  return x;
}
/* join a list as "a, b, and c" for scope sentences */
function rptList(a){ return a.length<2?a.join(''):a.slice(0,-1).join(', ')+(a.length>2?',':'')+' and '+a[a.length-1]; }
/* special-hazard rooms (IT / server / electrical / data) in fire scope */
function rptSpecialRooms(spaces){
  return spaces.filter(({space})=>space.type==='Server Room'||/server|electric|\bit\b|data room|comms?\b/i.test(space.name));
}
function rptCodesLine(disc){
  const cc=REPORT_CODES[CC()]||REPORT_CODES.Generic;
  return cc[disc].map(r=>r[0].replace(/\s*\(.*?\)/,'')).slice(0,5).join(' | ');
}

/* ── FIRE ── */
function rptFire(){
  const m=S.meta, fr=R.fire, hd=HAZ_DATA[fr.maxHaz], ksa=CC()==='KSA';
  const spaces=allSpaces().filter(x=>x.space.disc.fire);
  const specRooms=rptSpecialRooms(spaces);
  const scope=['the automatic sprinkler system','fire hose cabinets','portable fire extinguishers'];
  if(fr.standpipe>0)scope.push('standpipe risers');
  if(specRooms.length)scope.push('special-hazard aerosol suppression for the electrical/IT rooms');
  scope.push('the fire pump set','the fire water storage tank');
  let x='';
  x+=xH1('1. Scope of Work','fire');
  x+=xBody('This report establishes the Concept Design basis of the automatic fire protection systems for '+(m.name||'the project')+
    ', a '+m.buildingType+' building'+(m.city?' located in '+m.city+', '+m.country:' in '+m.country)+
    ' comprising '+S.floors.length+' floor(s) with a total built-up area of approximately '+RF(totalArea(),0)+' m². '+
    'The fire protection scope covers '+rptList(scope)+'.');
  x+=rptCodesTable('fire',specRooms.length?[['NFPA 2010 (2025 Ed.)','Fixed Aerosol Fire-Extinguishing Systems — special-hazard rooms']]:null);

  x+=xH1('2. Occupancy & Hazard Classification','fire');
  x+=xH2('2.1 Occupancy Type','fire');
  const og=RPT_OCCGRP[m.buildingType];
  if(og){
    x+=xBody('The building is classified as '+og[0]+'.');
    if(ksa)x+=xQuote('SBC 201 (2024), '+og[1]+' — occupancy classification: '+og[0]+'. [Requirement]','fire');
  }
  x+=xH2('2.2 Hazard Classification (NFPA 13)','fire');
  const byHaz={};
  spaces.forEach(({space})=>{ const h=(R.spaces[space.id].fire||{}).haz||'LH';
    (byHaz[h]=byHaz[h]||{n:0,a:0}); byHaz[h].n++; byHaz[h].a+=+space.area||0; });
  const hazRows=[['Hazard Class','Spaces','Area (m²)']];
  HAZ_ORDER.forEach(h=>{ if(byHaz[h])hazRows.push([HAZ_DATA[h].name,String(byHaz[h].n),RF(byHaz[h].a,0)]); });
  x+=xTable(hazRows,'fire',{numFrom:1});
  x+=xBody('The governing hazard classification for the hydraulic design is '+hd.name+'.');
  if(fr.maxHaz==='LH'){
    x+=xQuote('NFPA 13 (2025), Section 4.3.2 — Light Hazard Occupancies: "Light hazard occupancies shall be defined as occupancies or portions of other occupancies where the quantity and/or combustibility of contents is low and fires with relatively low rates of heat release are expected." [Quote]','fire');
  } else {
    x+=xQuote('NFPA 13 (2025), Section '+RPT_HAZSEC[fr.maxHaz]+' — '+hd.name+' occupancy classification; the governing class is assigned per the contents and heat-release characteristics of the protected spaces. [Requirement]','fire');
  }
  if(specRooms.length){
    x+=xBody('The following rooms contain energized electrical and electronic equipment for which water-based suppression is not appropriate, and shall be provided with a dedicated Fixed Aerosol Fire-Extinguishing System (special hazard suppression) delivering the required extinguishing concentration upon detection, with full coverage of the protected enclosure volume: '+
      specRooms.map(({floor,space})=>space.name+' ('+floor.name+')').join(' · ')+'.');
    x+=xQuote('NFPA 2010 (2025), Section 1.1.1 — Scope: "This standard contains the requirements for the design, installation, operation, testing, and maintenance of condensed and dispersed aerosol fire-extinguishing systems for total flooding applications." [Quote]','fire');
    x+=xNote('Sprinkler heads shown in the schedule for these rooms are Concept-stage placeholders; the final protection scheme (aerosol in lieu of, or supplementary to, sprinklers) shall be confirmed with Civil Defense at detailed design.');
  }

  x+=xH1('3. Sprinkler System — Hydraulic Design','fire');
  x+=xH2('3.1 System Type','fire');
  x+=xBody('A wet pipe automatic sprinkler system shall protect all areas of the building, with pendent sprinklers at ceiling level in finished areas and upright sprinklers in unfinished/exposed areas.');
  x+=xQuote('NFPA 13 (2025), Section 3.3 (Definitions) — Wet Pipe Sprinkler System: "A sprinkler system employing automatic sprinklers attached to a piping system containing water and connected to a water supply so that water discharges immediately from sprinklers opened by heat from a fire." [Quote]','fire');
  if(ksa)x+=xQuote('SBC 801 (2024), Section 903.3.1.1 — "Where the provisions of this code require that a building or portion thereof be equipped throughout with an automatic sprinkler system in accordance with this section, sprinklers shall be installed throughout in accordance with NFPA 13 except as provided in Sections 903.3.1.1.1 and 903.3.1.1.2." [Quote]','fire');
  x+=xH2('3.2 Design Parameters','fire');
  x+=xTable([['Parameter','Value','Basis'],
    ['Design density',RF(hd.density,1)+' mm/min ('+RF(hd.density*0.0245424,2)+' gpm/ft²)','NFPA 13 (2025) Table 19.2.3.1.1'],
    ['Design area',RF(hd.designArea,0)+' m²','NFPA 13 (2025) Table 19.2.3.1.1'],
    ['Max coverage per sprinkler',RPT_COV[fr.maxHaz],'NFPA 13 (2025) Table 10.2.4.2.1'],
    ['Coverage applied',RF(pval('fire','covArea')||hd.cov,1)+' m² per sprinkler','Project design value'],
    ['Sprinkler K-factor','K'+RF(pval('fire','K'),0)+' (metric)','Project design value'],
    ['Min operating pressure',RF(pval('fire','minOpP'),0)+' kPa','Project design value']],'fire',{numFrom:1});
  x+=xQuote('NFPA 13 (2025), Section 19.2.3.1.1 and Table 19.2.3.1.1 — Single-Point Design Criteria: for '+hd.name+' occupancies, the minimum design density is '+RPT_SP[fr.maxHaz]+'. [Requirement — the density/area curves of pre-2022 editions were replaced by single-point criteria for new systems.]','fire');
  x+=xH2('3.3 Sprinkler Schedule','fire');
  const sprRows=[['Space','Floor','Area (m²)','Hazard','Heads','Branch Ø (mm)','Main Ø (mm)']];
  spaces.forEach(({floor,space})=>{ const r=R.spaces[space.id].fire;
    sprRows.push([space.name,floor.name,RF(space.area,0),r.haz,RF(r.count,0),RF(r.branchSize,0),RF(r.mainSize,0)]); });
  sprRows.push(['TOTAL','','',fr.maxHaz+' gov.',RF(fr.spr,0),'','']);
  x+=xTable(sprRows,'fire',{numFrom:2,totalLast:1});
  x+=xNote('Sprinkler counts are area ÷ coverage estimates for Concept stage; final counts and the hydraulically most demanding area shall be confirmed by hydraulic calculation (NFPA 13 Chapter 28) at detailed design.');

  x+=xH1('4. Design Flow Rate & Fire Storage Tank','fire');
  x+=xH2('4.1 Total Design Flow Rate','fire');
  const flowRows=[['Demand component','Flow (L/min)','Flow (gpm)'],
    ['Sprinkler demand (density × design area)',RF(fr.sprFlow,0),RF(fr.sprFlow/3.785,0)],
    ['Hose stream allowance',RF(fr.hose,0),RF(fr.hose/3.785,0)]];
  if(fr.standpipe>0)flowRows.push(['Standpipe demand (NFPA 14)',RF(fr.standpipe,0),RF(fr.standpipe/3.785,0)]);
  flowRows.push(['TOTAL DEMAND',RF(fr.totFlow,0),RF(fr.gpm,0)]);
  x+=xTable(flowRows,'fire',{numFrom:1,totalLast:1});
  x+=xQuote('NFPA 13 (2025), Table 19.2.3.1.2 — hose stream allowance for '+hd.name+': '+RF(fr.hose/3.785,0)+' gpm (combined inside and outside hose), applied in addition to the sprinkler demand. [Requirement]','fire');
  if(fr.standpipe>0)x+=xQuote('NFPA 14 (2024), Section 7.10 — minimum standpipe flow: 500 gpm for the hydraulically most remote standpipe plus 250 gpm for each additional standpipe, up to the code maximum. [Requirement]','fire');
  x+=xBody('Selected fire pump: '+RF(fr.pumpGpm,0)+' gpm @ '+RF(fr.pumpBar,1)+' bar (electric + diesel + jockey arrangement), the nearest standard rated capacity above the calculated demand of '+RF(fr.gpm,0)+' gpm, installed in accordance with NFPA 20 (2025).');
  if(ksa)x+=xQuote('SBC 801 (2024), Section 913.1 — where provided, fire pumps shall be installed in accordance with Section 913, SBC 201, and NFPA 20. [Requirement]','fire');
  x+=xNote('Note: A pump capacity of '+RF(fr.pumpGpm,0)+' gpm has been applied as a design margin, selecting the nearest standard pump size above the calculated demand of '+RF(fr.gpm,0)+' gpm. This conservative approach provides system flexibility and ensures compliance under variable demand conditions.');
  x+=xH2('4.2 Fire Storage Tank','fire');
  x+=xTable([['Parameter','Value'],
    ['Design duration',RF(fr.duration,0)+' min'],
    ['Total demand',RF(fr.totFlow,0)+' L/min'],
    ['Tank volume (demand × duration)',RF(fr.tank,0)+' m³']],'fire',{numFrom:1});
  x+=xQuote('NFPA 13 (2025), Table 19.2.3.1.2 — minimum water supply duration: Light Hazard — 30 minutes; Ordinary Hazard — 60 to 90 minutes; Extra Hazard — 90 to 120 minutes. [Requirement]','fire');
  if(ksa)x+=xQuote('SBC 801 (2024), Section 507.1 — "An approved water supply capable of supplying the required fire flow for fire protection shall be provided to premises upon which facilities, buildings or portions of buildings are hereafter constructed or moved into or within the jurisdiction." [Quote]','fire');
  const minDur=hd.duration;
  if(fr.duration>minDur)x+=xNote('Note: The design team has applied a duration of '+fr.duration+' minutes ('+RF(fr.duration/minDur,1)+'× the '+minDur+'-minute minimum for '+hd.name+' per NFPA 13 (2025) Table 19.2.3.1.2), providing an additional safety margin consistent with Civil Defense practice.');

  x+=xH1('5. Fire Hose Cabinets (FHC)','fire');
  x+=xBody('Class II fire hose cabinets (1½ in. / 40 mm hose) shall be distributed so that all portions of each floor are within reach of a hose stream; the Concept-stage estimate is '+fr.cabinets+' cabinet(s) across '+S.floors.length+' floor(s). Cabinets shall be mounted with the valve centreline 1,200–1,500 mm AFF (within the 900–1,500 mm code range).');
  if(ksa)x+=xQuote('SBC 801 (2024), Section 905.5 — "Class II standpipe hose connections shall be accessible and shall be located so that all portions of the building are within 30 feet (9144 mm) of a nozzle attached to 100 feet (30 480 mm) of hose." [Quote]','fire');
  x+=xQuote('NFPA 14 (2024), Section 7.3.3.1 — Class II systems shall be provided with 1½ in. (40 mm) hose stations located so that all portions of each floor level of the building are within 130 ft (39.7 m) of a hose connection. [Requirement]','fire');
  x+=xQuote('NFPA 14 (2024), Section 7.3.1 — hose connections and hose stations shall be located not less than 3 ft (0.9 m) and not more than 5 ft (1.5 m) above the floor, measured to the center of the valve. [Requirement]','fire');

  x+=xH1('6. Portable Fire Extinguishers','fire');
  x+=xBody('Portable fire extinguishers shall be installed throughout the facility in accordance with NFPA 10'+(ksa?' and SBC 801 Section 906':'')+', complementing the fixed systems above. Concept-stage estimate: '+fr.extTotal+' extinguisher(s) ('+fr.extPerFloor.map(f=>f.name+': '+f.n).join(' · ')+').');
  /* NFPA 10 (2026) Table 6.2.1.1 — values per the project's governing hazard */
  const ext10={LH:['Light (low) hazard','2-A','3,000 ft² (279 m²)'],
               OH:['Ordinary (moderate) hazard','2-A','1,500 ft² (139 m²)'],
               EH:['Extra (high) hazard','4-A','1,000 ft² (93 m²)']}[fr.maxHaz==='LH'?'LH':(fr.maxHaz[0]==='O'?'OH':'EH')];
  x+=xQuote('NFPA 10 (2026), Table 6.2.1.1 — for '+ext10[0]+' occupancies: minimum rated single extinguisher '+ext10[1]+'; maximum floor area per unit of A: '+ext10[2]+'; maximum floor area per extinguisher: 11,250 ft² (1,045 m²); maximum travel distance to extinguisher: 75 ft (22.9 m). [Requirement]','fire');
  x+=xQuote('NFPA 10 (2026), Section 6.4.1 — "Fire extinguishers with Class C ratings shall be required where energized electrical equipment can be encountered." Applies to electrical and IT/server rooms; the agent shall be electrically nonconductive. [Quote + application]','fire');
  x+=xQuote('NFPA 10 (2026), Section 6.1.3.8 — extinguishers with a gross weight not exceeding 40 lb (18.14 kg) shall be installed so that the top is not more than 5 ft (1.53 m) above the floor; clearance between the bottom of the extinguisher and the floor shall be not less than 4 in. (102 mm). [Requirement]','fire');
  if(ksa)x+=xQuote('SBC 801 (2024), Section 906.2 — "Portable fire extinguishers shall be selected, installed and maintained in accordance with this section and NFPA 10." [Quote]','fire');

  x+=xH1('7. Pump Room','fire');
  x+=xBody('Location: to be coordinated with the Architectural team. The fire pump room shall provide adequate space and clearance for service, equipment protection, ventilation, and floor drainage, and shall be separated from the remainder of the building by fire-rated construction.');
  x+=xQuote('NFPA 20 (2025), Section 4.14.1.1 and Table 4.14.1.1.2 — fire pump units shall be located in rooms separated from the remainder of the building: 2-hour fire-rated construction (or a pump house at least 50 ft / 15.3 m away) in non-sprinklered buildings; 1-hour in fully sprinklered buildings (2-hour for high-rise). [Requirement]','fire');
  if(ksa)x+=xQuote('SBC 801 (2024), Section 913.2 — rooms where fire pumps are located shall be separated from all other areas of the building by fire-rated construction in accordance with SBC 201. [Requirement]','fire');

  x+=xH1('8. Design Summary','fire');
  x+=xTable([['Item','Value'],
    ['Governing hazard',hd.name],
    ['Total sprinklers (estimate)',RF(fr.spr,0)+' heads'],
    ['Design density / area',RF(hd.density,1)+' mm/min over '+RF(hd.designArea,0)+' m²'],
    ['Total design flow',RF(fr.totFlow,0)+' L/min ('+RF(fr.gpm,0)+' gpm)'],
    ['Fire pump (selected)',RF(fr.pumpGpm,0)+' gpm @ '+RF(fr.pumpBar,1)+' bar'],
    ['Fire water tank',RF(fr.tank,0)+' m³ ('+fr.duration+' min)'],
    ['Fire hose cabinets',fr.cabinets+' no.'],
    ['Portable extinguishers',fr.extTotal+' no.']],'fire',{numFrom:1});
  return x;
}

/* ── HVAC ── */
function rptHvac(){
  const m=S.meta, hv=R.hvac, c=cd(), ksa=CC()==='KSA';
  const spaces=allSpaces().filter(x=>x.space.disc.hvac);
  let x='';
  x+=xH1('1. Scope of Work','hvac');
  x+=xBody('This report establishes the Concept Design basis of the HVAC systems for '+(m.name||'the project')+
    ' ('+m.buildingType+', '+(m.city?m.city+', ':'')+m.country+'). It covers the cooling load estimation, ventilation (fresh air) strategy, air distribution concept, and main equipment selection for '+
    spaces.length+' conditioned space(s) totalling '+RF(spaces.reduce((a,s)=>a+(+s.space.area||0),0),0)+' m².');
  x+=rptCodesTable('hvac');

  x+=xH1('2. System Selection','hvac');
  x+=xBody('Block cooling load: '+RF(hv.kW,1)+' kW ('+RF(hv.TR,1)+' TR); with a diversity factor of '+RF((S.hvacSys.diversity||0.85)*100,0)+'% the plant duty is '+RF(hv.divKW,0)+' kW ('+RF(hv.divTR,1)+' TR). Selected concept: '+hv.plant+'.');
  x+=xQuote('ASHRAE 90.1 (2025), Section 6.4.1.1 — mechanical cooling equipment shall meet or exceed the minimum efficiency requirements of the tables of Section 6.8.1 (including the VRF equipment tables, rated per AHRI 1230). [Requirement]','hvac');
  if(ksa)x+=xQuote('SBC 501 (2024), Section 312.1 — "Heating and cooling system design loads for the purpose of sizing systems, appliances and equipment shall be determined in accordance with the procedures described in the ASHRAE/ACCA Standard 183. Alternatively, design loads shall be determined by an approved equivalent computation procedure, using the design parameters specified in Chapter 3." [Quote]','hvac');

  x+=xH1('3. Cooling Load Estimation','hvac');
  x+=xH2('3.1 Methodology','hvac');
  x+=xBody('Concept-stage loads are computed with a simplified CLTD component method (envelope conduction + solar + infiltration + internal gains + ventilation), applied per space with a '+RF(pval('hvac','safety'),0)+'% safety factor. Detailed loads shall be verified by full energy simulation (HAP) at the detailed design stage.');
  x+=xQuote('ASHRAE Handbook — Fundamentals (2025), Chapter 18 — Nonresidential Cooling and Heating Load Calculations: the Radiant Time Series (RTS) method is the recommended procedure for detailed cooling load calculations. [Requirement]','hvac');
  x+=xH2('3.2 Design Assumptions','hvac');
  x+=xTable([['Parameter','Value'],
    ['Outdoor design (cooling)',RF(c.odb,0)+'°C DB / '+RF(c.owb,0)+'°C WB'+(m.city?' ('+m.city+')':'')],
    ['Indoor design',RF(pval('hvac','idb'),0)+'°C / '+RF(pval('hvac','irh'),0)+'% RH'],
    ['Wall / Roof U-value','≤ '+RF(pval('hvac','wallU'),2)+' / '+RF(pval('hvac','roofU'),2)+' W/m²K'],
    ['Window U / SHGC',RF(pval('hvac','winU'),1)+' W/m²K / '+RF(pval('hvac','shgc'),2)],
    ['Lighting / Equipment density',RF(pval('hvac','lpd'),0)+' / '+RF(pval('hvac','epd'),0)+' W/m²'],
    ['Infiltration',RF(pval('hvac','ach'),1)+' ACH'],
    ['Safety factor / Diversity',RF(pval('hvac','safety'),0)+'% / '+RF((S.hvacSys.diversity||0.85)*100,0)+'%']],'hvac',{numFrom:1});
  x+=xH2('3.3 Zone-by-Zone Cooling Load','hvac');
  const hasExh=(hv.exhaust||0)>0;
  const zHead=['Space','Floor','Area (m²)','kW','TR','Supply (L/s)','Fresh Air (L/s)'];
  if(hasExh) zHead.push('Exhaust (L/s)');
  const zRows=[zHead];
  spaces.forEach(({floor,space})=>{ const r=R.spaces[space.id].hvac;
    const row = r.exhaust
      ? [space.name,floor.name,RF(space.area,0),'—','—','—','—']
      : [space.name,floor.name,RF(space.area,0),RF(r.kW,1),RF(r.TR,2),RF(r.airflowLs,0),RF(r.oaLs,0)];
    if(hasExh) row.push(r.exhaust?RF(r.exhaustLs,0):'—');
    zRows.push(row); });
  const totRow=['TOTAL','','',RF(hv.kW,1),RF(hv.TR,1),RF(hv.air,0),RF(hv.oa,0)];
  if(hasExh) totRow.push(RF(hv.exhaust,0));
  zRows.push(totRow);
  x+=xTable(zRows,'hvac',{numFrom:2,totalLast:1});
  x+=xNote('All cooling load values presented in the above schedule represent preliminary estimates appropriate for the Concept Design stage. Final cooling loads, equipment capacities, and system sizing shall be determined through detailed energy simulation using HAP (Hourly Analysis Program) in accordance with the ASHRAE Handbook — Fundamentals (2025), Chapter 18 (RTS method), prior to equipment procurement.');
  x+=xNote('It should be noted that the preliminary cooling load values presented herein are subject to revision upon completion of the detailed HAP energy simulation. Final calculated loads may deviate from the values indicated above by a margin of up to ±25%, subject to actual building envelope performance, occupancy patterns, and climatic data inputs applied during the detailed design stage.');

  x+=xH1('4. Ventilation (Fresh Air) Strategy','hvac');
  const oaPctMode = pval('hvac','oaMode')==='pct';
  if(hv.oa>0 && oaPctMode){
    x+=xBody('Fresh air quantities are taken as a fixed design fraction of zone supply air ('+RF(pval('hvac','oaPct'),0)+'% of supply, per the project ventilation directive), giving a total outdoor air requirement of '+RF(hv.oa,0)+' L/s'+(hv.air>0?' ('+RF(hv.oa/hv.air*100,0)+'% of the total supply air of '+RF(hv.air,0)+' L/s)':'')+'. The resulting per-zone rates shall be verified against the ASHRAE 62.1 (2025) Ventilation Rate Procedure (Vbz = Rp·Pz + Ra·Az) at the detailed design stage to confirm minimum outdoor-air compliance.');
  } else if(hv.oa>0){
    x+=xBody('Fresh air quantities are calculated per zone using the ASHRAE 62.1 Ventilation Rate Procedure (Vbz = Rp·Pz + Ra·Az), giving a total outdoor air requirement of '+RF(hv.oa,0)+' L/s.');
    x+=xQuote('ASHRAE 62.1 (2025), Section 6.2 (Ventilation Rate Procedure) — the breathing-zone outdoor airflow for each zone shall be calculated as Vbz = Rp·Pz + Ra·Az (Equation 6-1), with the people outdoor air rate (Rp) and area outdoor air rate (Ra) taken from Table 6-1 for the applicable occupancy category of each zone. [Requirement — the per-zone rates applied in this report follow the Table 6-1 occupancy categories listed in the zone schedule.]','hvac');
    if(ksa)x+=xQuote('SBC 501 (2024), Sections 403.2 and 403.3 with Table 403.3.1.1 — the minimum outdoor airflow rate shall be determined in accordance with Section 403.3, using the occupancy-based ventilation rates of Table 403.3.1.1 (consistent with ASHRAE 62.1). [Requirement]','hvac');
  } else {
    x+=xBody('No mechanical outdoor-air (fresh air) requirement has resulted from the spaces scheduled at this stage. Ventilation compliance with ASHRAE 62.1 (2025), Section 6.2 shall be re-verified at detailed design once final occupancies are confirmed.');
  }
  const exhOnly=spaces.filter(({space})=>{ const r=R.spaces[space.id].hvac; return r&&r.exhaust; });
  if(exhOnly.length){
    const exhRows=[['Space','Floor','Exhaust (L/s)','Code basis']];
    exhOnly.forEach(({floor,space})=>{ const r=R.spaces[space.id].hvac;
      exhRows.push([space.name,floor.name,RF(r.exhaustLs,0),r.exhaustRef||'ASHRAE 62.1 (2025), Table 6-4']); });
    exhRows.push(['TOTAL','',RF(hv.exhaust,0),'']);
    x+=xH2('4.1 Mechanical Exhaust (Exhaust-Only Spaces)','hvac');
    x+=xBody('The following space(s) are served by dedicated mechanical exhaust without sensible cooling. Minimum exhaust airflow rates are taken from ASHRAE 62.1 (2025) Table 6-4 (Minimum Exhaust Rates); toilet rooms are computed on a per-fixture basis. Total mechanical exhaust at this stage is '+RF(hv.exhaust,0)+' L/s across '+exhOnly.length+' space(s).');
    x+=xTable(exhRows,'hvac',{numFrom:2,totalLast:1});
    x+=xQuote('ASHRAE 62.1 (2025), Section 6.5 and Table 6-4 (Minimum Exhaust Rates) — mechanical exhaust shall be provided for the occupancy categories listed in Table 6-4 at no less than the rates specified therein (e.g., parking garages 0.75 cfm/ft²; commercial kitchens 0.7 cfm/ft²; public toilet rooms 50 cfm per water closet or urinal). [Requirement]','hvac');
  }
  const exh=spaces.filter(({space})=>{ const r=R.spaces[space.id].hvac; return r&&r.oaGov; });
  if(exh.length)x+=xNote('Exhaust-governed spaces (mechanical exhaust in lieu of supply OA): '+exh.map(({space})=>space.name+' ('+(R.spaces[space.id].hvac.oaGov)+')').join(' · ')+'.');

  x+=xH1('5. Equipment Placement & Coordination','hvac');
  x+=xBody('Cooling plant: '+hv.plant+'. Outdoor/plant equipment location: Rooftop — TBC with the Architectural team. Fresh air AHU: Rooftop — TBC. Equipment shall be installed with the manufacturer’s required clearances and on vibration isolators.');
  if(ksa)x+=xQuote('SBC 501 (2024), Section 306.5 — mechanical equipment and appliances installed on roofs or elevated structures requiring service shall be provided with a permanent approved means of access. [Requirement]','hvac');
  x+=xQuote('ASHRAE 62.1 (2025), Section 5.5 and Table 5-1 — outdoor air intakes shall be located so that the separation distance to each contaminant source is not less than the minimum listed in Table 5-1 — e.g., 3 m (10 ft) from toilet/general building exhaust outlets and plumbing vents, and 4.5 m (15 ft) from significantly contaminated exhaust. [Requirement]','hvac');

  x+=xH1('6. Design Summary','hvac');
  x+=xTable([['Item','Value'],
    ['Block cooling load',RF(hv.kW,1)+' kW ('+RF(hv.TR,1)+' TR)'],
    ['Plant duty @ diversity',RF(hv.divKW,0)+' kW ('+RF(hv.divTR,1)+' TR)'],
    ['Selected plant concept',hv.plant],
    ['Total supply air',RF(hv.air,0)+' L/s'],
    ['Total fresh air ('+(oaPctMode?RF(pval('hvac','oaPct'),0)+'% of supply':'62.1')+')',RF(hv.oa,0)+' L/s'],
    ['Conditioned spaces',String(hv.count)]],'hvac',{numFrom:1});
  return x;
}

/* ── PLUMBING ── */
function rptPlumb(){
  const m=S.meta, pl=R.plumb, ksa=CC()==='KSA';
  const spaces=allSpaces().filter(x=>x.space.disc.plumb);
  const slope=+pval('plumb','slope');
  let x='';
  x+=xH1('1. Scope of Work','plumb');
  x+=xBody('This report establishes the Concept Design basis of the domestic water supply, drainage, and storm systems for '+(m.name||'the project')+
    ' ('+m.buildingType+', '+(m.city?m.city+', ':'')+m.country+'). It covers '+
    rptList(['the sanitary fixture schedule','water demand and pipe sizing','storage tanks','pump sets'].concat(pl.hotDaily>0?['hot water']:[]).concat(['the sanitary'+(pl.storm&&pl.storm.roofA>0?'/storm':'')+' drainage concept']))+'.');
  x+=rptCodesTable('plumb');

  let sn=2; /* section numbers adapt when optional sections are skipped */
  x+=xH1(sn+'. Sanitary Fixture Schedule','plumb'); sn++;
  const used=FIXTURES.filter(fx=>spaces.some(({space})=>+(space.fixtures[fx.k]||0)>0));
  const fRows=[['Space','Floor'].concat(used.map(f=>f.n))];
  spaces.forEach(({floor,space})=>{
    if(!used.some(fx=>+(space.fixtures[fx.k]||0)>0))return;
    fRows.push([space.name,floor.name].concat(used.map(fx=>String(+(space.fixtures[fx.k]||0)||'—'))));
  });
  fRows.push(['TOTAL',''].concat(used.map(fx=>String(spaces.reduce((a,{space})=>a+(+(space.fixtures[fx.k]||0)),0)))));
  x+=fRows.length>2?xTable(fRows,'plumb',{numFrom:2,totalLast:1}):xBody('No plumbing fixtures have been scheduled yet.');

  const sWD=sn; sn++;
  x+=xH1(sWD+'. Water Demand Calculation','plumb');
  x+=xH2(sWD+'.1 Fixture Units (WSFU / DFU)','plumb');
  const uRows=[['Space','Floor','WSFU','DFU','Peak (L/s)','Branch Ø (mm)']];
  spaces.forEach(({floor,space})=>{ const r=R.spaces[space.id].plumb;
    uRows.push([space.name,floor.name,RF(r.wsfu,1),RF(r.dfu,1),RF(r.Qls,2),RF(r.dia,0)]); });
  uRows.push(['TOTAL','',RF(pl.wsfu,1),RF(pl.dfu,1),RF(pl.Qls,2),RF(pl.mainDia,0)]);
  x+=xTable(uRows,'plumb',{numFrom:2,totalLast:1});
  x+=xQuote((ksa?'SBC 701 (2024), Section 604 and Appendix E':'UPC (2024), Section 610.3 / IPC (2021), Appendix E')+
    ' — the water distribution system shall be sized for peak demand using the fixture-unit method: WSFU values are assigned per fixture and the total load is converted to a design flow rate using Hunter’s probability curve, with separate demand curves for flush-tank and flushometer-valve systems. [Requirement]','plumb');
  x+=xNote('Fixture-unit values applied are listed in the project fixture schedule; the demand conversion uses the flush-tank Hunter curve. Where flushometer-valve water closets are adopted, the flushometer demand curve shall be applied at detailed design. Verify the fixture-unit values against the governing code table before issue.');
  x+=xH2(sWD+'.2 Peak Flow & Main Sizing','plumb');
  x+=xTable([['Parameter','Value'],
    ['Total WSFU',RF(pl.wsfu,1)],
    ['Peak demand (Hunter)',RF(pl.Qls,2)+' L/s'],
    ['Main supply pipe',RF(pl.mainDia,0)+' mm Ø ('+pval('plumb','mat')+') @ '+RF(pl.actV,2)+' m/s'],
    ['Max design velocity',RF(pval('plumb','vel'),1)+' m/s'],
    ['Min residual pressure',RF(pval('plumb','minP'),0)+' kPa']],'plumb',{numFrom:1});
  x+=xH2(sWD+'.3 Daily Water Demand','plumb');
  x+=xTable([['Parameter','Value'],
    ['Occupants',RF(pl.occ,0)+' persons'],
    ['Per-capita rate',RF(pl.lpcd,0)+' L/person·day'],
    ['Daily demand',RF(pl.daily,1)+' m³/day']],'plumb',{numFrom:1});
  x+=xNote('The per-capita consumption rate of '+RF(pl.lpcd,0)+' L/person/day is a preliminary design value based on established engineering practice for '+m.buildingType+' occupancies in the region — it is not a code-table value and shall be confirmed with the local water authority during detailed design.');

  x+=xH1(sn+'. Water Storage Tanks','plumb'); sn++;
  x+=xTable([['Parameter','Value'],
    ['Storage basis',pl.days+' day(s) of daily demand'],
    ['Total storage',RF(pl.storage,1)+' m³'],
    ['Underground tank',RF(pl.ugTank,1)+' m³'],
    ['Roof tank',RF(pl.roofTank,1)+' m³ (≈ '+RF(pl.roofLoad,0)+' kN full — structural coordination)']],'plumb',{numFrom:1});
  x+=xNote('The '+pl.days+'-day storage basis reflects prevailing municipal-supply reliability practice for '+m.country+' — it is a design decision, not a code clause; confirm the required reserve with the local municipality and water authority. Tank locations: TBC — Architectural & Structural coordination.');

  x+=xH1(sn+'. Pumping Systems','plumb'); sn++;
  x+=xTable([['Pump set','Duty','Power'],
    ['Booster set (1 duty + 1 standby)',RF(pl.booster.Qls,1)+' L/s @ '+RF(pl.booster.tdh,0)+' m',RF(pl.booster.kw,1)+' kW each'],
    ['Transfer set UG → roof (1+1)',RF(pl.transfer.Qls,1)+' L/s @ '+RF(pl.transfer.tdh,0)+' m',RF(pl.transfer.kw,1)+' kW each'],
    ['Sewage submersible (1+1)',RF(pl.sewage.Qls,1)+' L/s @ '+RF(pl.sewage.tdh,0)+' m',RF(pl.sewage.kw,1)+' kW each']],'plumb',{numFrom:1});

  if(pl.hotDaily>0){
    x+=xH1(sn+'. Hot Water','plumb'); sn++;
    x+=xTable([['Parameter','Value'],
      ['Hot water daily demand',RF(pl.hotDaily,0)+' L/day'],
      ['Central heater storage',RF(pl.heaterVol,0)+' L'],
      ['Heater capacity',RF(pl.heaterKW,1)+' kW (8-hour recovery)'],
      ['Hot water peak flow / pipe',RF(pl.hotQls,2)+' L/s / '+RF(pl.hotDia,0)+' mm Ø']],'plumb',{numFrom:1});
  }

  x+=xH1(sn+'. Sanitary & Storm Drainage','plumb'); sn++;
  const drnRows=[['Parameter','Value'],
    ['Total DFU',RF(pl.dfu,1)],
    ['Main stack',RF(pl.stackDia,0)+' mm Ø'],
    ['Building drain / sewer',RF(pl.sewerDia,0)+' mm Ø @ '+RF(slope*100,0)+'% slope']];
  if(pl.storm&&pl.storm.roofA>0){
    drnRows.push(['Roof rainfall design intensity',RF(pl.storm.rain,0)+' mm/hr'],
      ['Roof leaders',pl.storm.count+' × '+RF(pl.storm.leader,0)+' mm Ø (roof area '+RF(pl.storm.roofA,0)+' m², '+RF(pl.storm.Qls,1)+' L/s)']);
  }
  x+=xTable(drnRows,'plumb',{numFrom:1});
  x+=xQuote((ksa?'SBC 701 (2024), Section 710.1 and Table 710.1(1)':'IPC (2021), Section 710.1 and Table 710.1(1)')+
    ' — the size of the building drain and its branches is determined by the total drainage fixture unit (DFU) load: a 100 mm (4 in.) building drain accommodates up to 180 DFU at 1% slope (1/8 in./ft) and up to 216 DFU at 2% slope (1/4 in./ft). [Requirement]','plumb');
  x+=xQuote((ksa?'SBC 701 (2024), Table 704.1':'IPC (2021), Table 704.1')+
    ' — minimum slope of horizontal drainage piping: 2½ in. (65 mm) and smaller — 1/4 in./ft (2%); 3 in. to 6 in. (80–150 mm) — 1/8 in./ft (1%); 8 in. (200 mm) and larger — 1/16 in./ft (0.5%). [Requirement. Where the UPC governs, UPC (2024) §708.1 requires 2% unless the AHJ approves 1% for 4 in. and larger.]','plumb');
  x+=xQuote((ksa?'SBC 701 (2024), Section 704.2':'IPC (2021), Section 704.2')+
    ' — the size of the drainage piping shall not be reduced in the direction of flow. [Requirement]','plumb');
  if(pl.sewerDia===100 && slope<0.02 && pl.dfu>180)
    x+=xNote('Attention: the connected load of '+RF(pl.dfu,1)+' DFU exceeds the 180-DFU capacity of a 100 mm drain at 1% slope (Table 710.1(1)) — increase the slope to 2% or upsize the drain at detailed design.');

  x+=xH1(sn+'. Design Summary','plumb');
  const sumRows=[['Item','Value'],
    ['Peak water demand',RF(pl.Qls,2)+' L/s ('+RF(pl.wsfu,1)+' WSFU)'],
    ['Main supply pipe',RF(pl.mainDia,0)+' mm Ø '+pval('plumb','mat')],
    ['Daily demand / storage',RF(pl.daily,1)+' m³/day / '+RF(pl.storage,1)+' m³ ('+pl.days+'-day)'],
    ['Tanks (UG + roof)',RF(pl.ugTank,1)+' + '+RF(pl.roofTank,1)+' m³'],
    ['Drainage',RF(pl.dfu,1)+' DFU → '+RF(pl.sewerDia,0)+' mm sewer @ '+RF(slope*100,0)+'%']];
  if(pl.hotDaily>0)sumRows.push(['Hot water',RF(pl.heaterVol,0)+' L / '+RF(pl.heaterKW,1)+' kW']);
  x+=xTable(sumRows,'plumb',{numFrom:1});
  return x;
}

/* ════════════════ package assembly ════════════════ */
function rptDocumentXml(parts){
  const m=S.meta;
  let body='';
  if(parts.fire){ body+=xCover('First:','FIRE PROTECTION SYSTEM DESIGN REPORT','fire',rptCodesLine('fire'),true); body+=rptFire(); }
  if(parts.hvac){ body+=xCover(parts.fire?'Second:':'First:','HVAC SYSTEM DESIGN REPORT','hvac',rptCodesLine('hvac'),!parts.fire); body+=rptHvac(); }
  if(parts.plumb){ const n=[parts.fire,parts.hvac].filter(Boolean).length;
    body+=xCover(['First:','Second:','Third:'][n],'PLUMBING & DRAINAGE DESIGN REPORT','plumb',rptCodesLine('plumb'),n===0); body+=rptPlumb(); }
  body+='<w:sectPr><w:headerReference w:type="default" r:id="rIdH1"/><w:footerReference w:type="default" r:id="rIdF1"/>'+
    '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
    '<w:body>'+body+'</w:body></w:document>';
}

function rptStylesXml(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>'+
  '<w:pPrDefault><w:pPr><w:spacing w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
}
function rptHeaderXml(){
  const m=S.meta;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  xPara([xRun('MEP BODR | '+(m.name||'MEP Project')+' | '+m.country,{sz:20,color:RPT_COL.gray})],{after:0})+
  '</w:hdr>';
}
function rptFooterXml(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  '<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="8" w:space="2" w:color="'+RPT_COL.fire+'"/></w:pBdr><w:jc w:val="right"/></w:pPr>'+
  '<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="'+RPT_COL.gray+'"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>'+
  '<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="'+RPT_COL.gray+'"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'+
  '<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="'+RPT_COL.gray+'"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
}

/* ════════════════ minimal ZIP writer (stored) ════════════════ */
const RPT_CRC_TBL=(()=>{ const t=new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function rptCrc32(u8){ let c=0xFFFFFFFF;
  for(let i=0;i<u8.length;i++)c=RPT_CRC_TBL[(c^u8[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0; }
function rptZip(files){
  const enc=new TextEncoder();
  const chunks=[], central=[];
  let off=0;
  const d=new Date(), dosT=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,
        dosD=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  const W16=v=>[v&255,(v>>8)&255], W32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  files.forEach(f=>{
    const name=enc.encode(f.name), data=typeof f.data==='string'?enc.encode(f.data):f.data;
    const crc=rptCrc32(data);
    const hdr=new Uint8Array([0x50,0x4B,3,4, ...W16(20), ...W16(0), ...W16(0), ...W16(dosT), ...W16(dosD),
      ...W32(crc), ...W32(data.length), ...W32(data.length), ...W16(name.length), ...W16(0)]);
    chunks.push(hdr,name,data);
    central.push({name,crc,size:data.length,off});
    off+=hdr.length+name.length+data.length;
  });
  let cdLen=0;
  central.forEach(c=>{
    const e=new Uint8Array([0x50,0x4B,1,2, ...W16(20), ...W16(20), ...W16(0), ...W16(0), ...W16(dosT), ...W16(dosD),
      ...W32(c.crc), ...W32(c.size), ...W32(c.size), ...W16(c.name.length), ...W16(0), ...W16(0),
      ...W16(0), ...W16(0), ...W32(0), ...W32(c.off)]);
    chunks.push(e,c.name); cdLen+=e.length+c.name.length;
  });
  chunks.push(new Uint8Array([0x50,0x4B,5,6, ...W16(0), ...W16(0), ...W16(central.length), ...W16(central.length),
    ...W32(cdLen), ...W32(off), ...W16(0)]));
  let total=0; chunks.forEach(c=>total+=c.length);
  const out=new Uint8Array(total); let p=0;
  chunks.forEach(c=>{ out.set(c,p); p+=c.length; });
  return out;
}

function buildDesignReportDocx(parts){
  R=recalcAll();
  const CT='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
    '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'+
    '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'+
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'+
    '</Types>';
  const relsRoot='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'+
    '</Relationships>';
  const relsDoc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rIdS1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
    '<Relationship Id="rIdH1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'+
    '<Relationship Id="rIdF1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+
    '</Relationships>';
  const core='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">'+
    '<dc:title>'+XX('MEP Basis of Design Report (BODR) — '+(S.meta.name||''))+'</dc:title>'+
    '<dc:creator>'+XX(S.meta.engineer||'MEP Studio')+'</dc:creator></cp:coreProperties>';
  return rptZip([
    {name:'[Content_Types].xml',data:CT},
    {name:'_rels/.rels',data:relsRoot},
    {name:'word/document.xml',data:rptDocumentXml(parts)},
    {name:'word/_rels/document.xml.rels',data:relsDoc},
    {name:'word/styles.xml',data:rptStylesXml()},
    {name:'word/header1.xml',data:rptHeaderXml()},
    {name:'word/footer1.xml',data:rptFooterXml()},
    {name:'docProps/core.xml',data:core}
  ]);
}

/* ════════════════ Save As modal ════════════════ */
function openReportExport(){
  document.getElementById('projMenu')&&document.getElementById('projMenu').classList.remove('show');
  const def='BODR_'+(S.meta.name||'Project').replace(/[^\w؀-ۿ\- ]+/g,'').trim().replace(/\s+/g,'_')+'_R00';
  document.getElementById('rptName').value=def;
  /* default each discipline on only when at least one space uses it — unselected disciplines stay out of the report */
  document.getElementById('rptHvac').checked=discActive('hvac');
  document.getElementById('rptPlumb').checked=discActive('plumb');
  document.getElementById('rptFire').checked=discActive('fire');
  document.getElementById('rptResult').innerHTML='';
  openModal('modalReport');
}
function downloadDesignReport(){
  const res=document.getElementById('rptResult');
  const parts={fire:document.getElementById('rptFire').checked,
    hvac:document.getElementById('rptHvac').checked,
    plumb:document.getElementById('rptPlumb').checked};
  if(!parts.fire&&!parts.hvac&&!parts.plumb){ res.innerHTML='<div class="banner red">Select at least one discipline.</div>'; return; }
  let name=(document.getElementById('rptName').value||'BODR').trim().replace(/\.docx$/i,'');
  try{
    const bytes=buildDesignReportDocx(parts);
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=name+'.docx'; a.click(); URL.revokeObjectURL(a.href);
    res.innerHTML='<div class="banner green">✅ <strong>'+E(name)+'.docx</strong> downloaded — formal BODR with verified code citations (latest editions), adapted to this project\'s data. Open in Word to review.</div>';
    toast('BODR exported');
  }catch(e){
    res.innerHTML='<div class="banner red">❌ '+E(e.message||'Export failed')+'</div>';
  }
}
/* modal backdrop close */
(function(){
  if(typeof document==='undefined')return;
  const mb=document.getElementById('modalReport');
  if(mb)mb.addEventListener('click',e=>{ if(e.target.id==='modalReport')closeModal('modalReport'); });
})();
