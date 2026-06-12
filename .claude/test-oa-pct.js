/* Node test: verify OA-as-%-of-supply mode (closed-form solve) against ASHRAE mode. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = ['data.js','calc.js','report-docx.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n');

const ctx = {console, TextEncoder, S:null, R:null};
vm.createContext(ctx);
vm.runInContext(src, ctx, {filename:'bundle.js'});

let uid=1; const nid=()=>uid++;
const mkSpace=(name,type,area,fix)=>({id:nid(),name,type,area,occAuto:true,
  occupants:vm.runInContext(`spaceOcc(${JSON.stringify(type)},${area})`,ctx),
  disc:{hvac:true,plumb:true,fire:true},ov:{hvac:{},plumb:{},fire:{}},fixtures:fix||{}});

ctx.S = {
  v:1, units:'si',
  meta:{name:'Test', client:'', engineer:'', date:'2026-06-12',
    country:'KSA', city:'Riyadh', buildingType:'office', height:16},
  ov:{hvac:{},plumb:{},fire:{}},
  hvacSys:{diversity:0.85},
  plumbSys:{municipalPressure:300,storageDays:null,rainfall:null,roofArea:null},
  fireSys:{standpipe:true,duration:null},
  floors:[]
};
ctx.S.floors=[{id:nid(),name:'GF',level:'ground',spaces:[ mkSpace('Reception & Lobby','Reception',120) ]}];
const sp = ctx.S.floors[0].spaces[0];

let fail = 0;
const check = (name, cond, detail)=>{ console.log((cond?'PASS':'FAIL')+'  '+name+(detail?'  — '+detail:'')); if(!cond) fail++; };

/* 1 — default mode unchanged: ASHRAE 62.1 */
let r = vm.runInContext('recalcAll()', ctx).spaces[sp.id].hvac;
const expAshrae = 2.5*sp.occupants + 0.30*sp.area;
check('ASHRAE default oaLs', Math.abs(r.oaLs-expAshrae)<1e-6, `oaLs=${r.oaLs.toFixed(1)} expected=${expAshrae.toFixed(1)}`);
const ashraeAir = r.airflowLs;

/* 2 — pct mode: oaLs must equal pct × supply exactly */
ctx.S.ov.hvac = {oaMode:'pct', oaPct:20};
r = vm.runInContext('recalcAll()', ctx).spaces[sp.id].hvac;
check('pct mode self-consistent', Math.abs(r.oaLs - 0.20*r.airflowLs) < 0.01,
  `oaLs=${r.oaLs.toFixed(2)} supply=${r.airflowLs.toFixed(2)} ratio=${(r.oaLs/r.airflowLs*100).toFixed(2)}%`);

/* 3 — pct=0 → no OA, supply equals no-OA baseline */
ctx.S.ov.hvac = {oaMode:'pct', oaPct:0};
r = vm.runInContext('recalcAll()', ctx).spaces[sp.id].hvac;
check('pct=0 gives zero OA', r.oaLs===0, `oaLs=${r.oaLs}`);
check('pct=0 supply < ASHRAE-mode supply', r.airflowLs < ashraeAir, `${r.airflowLs.toFixed(1)} < ${ashraeAir.toFixed(1)}`);

/* 4 — per-space override back to ASHRAE wins over project pct default */
ctx.S.ov.hvac = {oaMode:'pct', oaPct:30};
sp.ov.hvac = {oaMode:'ashrae'};
r = vm.runInContext('recalcAll()', ctx).spaces[sp.id].hvac;
check('space override → ASHRAE', Math.abs(r.oaLs-expAshrae)<1e-6, `oaLs=${r.oaLs.toFixed(1)}`);
sp.ov.hvac = {};

/* 5 — extreme pct clamps instead of exploding (denominator guard) */
ctx.S.ov.hvac = {oaMode:'pct', oaPct:100};
r = vm.runInContext('recalcAll()', ctx).spaces[sp.id].hvac;
check('pct=100 finite', isFinite(r.oaLs) && isFinite(r.airflowLs) && r.airflowLs>0,
  `oaLs=${r.oaLs.toFixed(0)} supply=${r.airflowLs.toFixed(0)}`);

/* 6 — report still builds in pct mode */
ctx.S.ov.hvac = {oaMode:'pct', oaPct:25};
const bytes = vm.runInContext('buildDesignReportDocx({fire:true,hvac:true,plumb:true})', ctx);
check('docx builds in pct mode', bytes && bytes.length>10000, bytes.length+' bytes');

process.exit(fail?1:0);
