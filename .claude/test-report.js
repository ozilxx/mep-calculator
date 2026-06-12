/* Node test harness: generate the .docx from a sample project and write it to disk. */
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
  meta:{name:'Al Noor Office Tower', client:'Al Noor Development', engineer:'Abdelrhman',
    date:'2026-06-11', country:'KSA', city:'Riyadh', buildingType:'office', height:16},
  ov:{hvac:{},plumb:{},fire:{}},
  hvacSys:{diversity:0.85},
  plumbSys:{municipalPressure:300,storageDays:null,rainfall:null,roofArea:null},
  fireSys:{standpipe:true,duration:null},
  floors:[]
};
ctx.S.floors=[
  {id:nid(),name:'Ground Floor',level:'ground',spaces:[
    mkSpace('Reception & Lobby','Reception',120),
    mkSpace('Cafeteria','Restaurant',90,{lav:2,sink:2,fd:2}),
    mkSpace('Toilets — GF','Toilet',28,{wc:6,lav:6,fd:3}),
    mkSpace('Server Room','Server Room',18)
  ]},
  {id:nid(),name:'Typical Floor',level:'middle',spaces:[
    mkSpace('Open Office','Office',320),
    mkSpace('Meeting Room','Meeting Room',35),
    mkSpace('Toilets','Toilet',26,{wc:5,lav:5,fd:2}),
    mkSpace('Pantry','Kitchen',12,{sink:1,fd:1})
  ]}
];

const bytes = vm.runInContext('buildDesignReportDocx({fire:true,hvac:true,plumb:true})', ctx);
const out = path.join(__dirname, 'test-report.docx');
fs.writeFileSync(out, Buffer.from(bytes));
console.log('OK wrote', out, bytes.length, 'bytes');
