/* ════════════════════════════════════════════════════════
   MEP STUDIO — engineering data
   Sources: ASHRAE 62.1/90.1, ASHRAE Fundamentals (CLTD),
   NFPA 13/14/20, IPC/UPC (Hunter's method), local codes.
════════════════════════════════════════════════════════ */

const COUNTRY_CODES = {
  KSA:    ['SBC 2024 (501/701/801)', 'ASHRAE 90.1-2025', 'NFPA 13-2025', 'SBC 701 (IPC)'],
  UAE:    ['UAE FLSC 2018', 'Dubai GBR', 'ASHRAE 90.1-2025', 'UPC 2024'],
  Egypt:  ['Fire Code 126', 'ECP 306', 'ASHRAE 62.1-2025', 'NFPA 13-2025'],
  Qatar:  ['QCS 2024', 'GSAS', 'NFPA 13-2025', 'UPC 2024'],
  Jordan: ['JBC', 'ASHRAE 62.1-2025', 'NFPA 13-2025', 'IPC 2021'],
  Generic:['ASHRAE 90.1-2025', 'ASHRAE 62.1-2025', 'NFPA 13-2025', 'IPC/UPC']
};

/* Country-level HVAC defaults: design conditions + code envelope limits */
const HVAC_CTRY = {
  KSA:    {odb:46, owb:19, idb:24, irh:50, wallU:0.57, roofU:0.40, shgc:0.25, ach:0.5, sdt:10},
  UAE:    {odb:46, owb:28, idb:24, irh:50, wallU:0.57, roofU:0.40, shgc:0.25, ach:0.5, sdt:10},
  Egypt:  {odb:40, owb:22, idb:24, irh:50, wallU:0.60, roofU:0.45, shgc:0.30, ach:0.5, sdt:10},
  Qatar:  {odb:46, owb:28, idb:24, irh:50, wallU:0.57, roofU:0.40, shgc:0.25, ach:0.5, sdt:10},
  Jordan: {odb:38, owb:19, idb:24, irh:50, wallU:0.60, roofU:0.45, shgc:0.30, ach:0.5, sdt:10},
  Generic:{odb:40, owb:24, idb:24, irh:50, wallU:0.57, roofU:0.40, shgc:0.25, ach:0.5, sdt:10}
};

/* City cooling-design weather overrides (0.4% DB / MCWB approx) */
const CITY_DATA = {
  KSA: {
    'Riyadh':{odb:45,owb:22}, 'Jeddah':{odb:40,owb:29}, 'Mecca':{odb:46,owb:25},
    'Medina':{odb:44,owb:22}, 'Dammam':{odb:46,owb:30}, 'Taif':{odb:34,owb:18},
    'Tabuk':{odb:40,owb:19}, 'Abha':{odb:30,owb:17}
  },
  UAE: {
    'Dubai':{odb:46,owb:30}, 'Abu Dhabi':{odb:46,owb:30}, 'Sharjah':{odb:46,owb:30},
    'Al Ain':{odb:48,owb:24}, 'Ras Al Khaimah':{odb:45,owb:30}, 'Fujairah':{odb:42,owb:30}
  },
  Egypt: {
    'Cairo':{odb:40,owb:23}, 'Alexandria':{odb:34,owb:26}, 'Giza':{odb:40,owb:23},
    'Luxor':{odb:43,owb:21}, 'Aswan':{odb:44,owb:21}, 'Hurghada':{odb:39,owb:27},
    'Sharm El Sheikh':{odb:39,owb:26}
  },
  Qatar: {
    'Doha':{odb:46,owb:30}, 'Al Wakrah':{odb:45,owb:30}, 'Al Khor':{odb:45,owb:30}, 'Dukhan':{odb:46,owb:29}
  },
  Jordan: {
    'Amman':{odb:36,owb:19}, 'Aqaba':{odb:43,owb:22}, 'Irbid':{odb:35,owb:20}, 'Zarqa':{odb:38,owb:20}
  },
  Generic: {}
};

/* Rainfall design intensity mm/hr (for roof drainage) — typical 100-yr 1-hr values */
const RAIN_CTRY = {KSA:50, UAE:45, Egypt:30, Qatar:50, Jordan:60, Generic:75};

/* ASHRAE 90.1 lighting & equipment power densities by building type (W/m²) */
const LPD = {office:15, retail:28, residential:8, hotel:12, healthcare:20, educational:15, mosque:12, industrial:10};
const EPD = {office:20, retail:5,  residential:15, hotel:10, healthcare:35, educational:15, mosque:2,  industrial:5};

/* ASHRAE 62.1 Table 6-1 (SI): rp = L/s·person, ra = L/s·m² */
const VENT_621 = {
  'Office':{rp:2.5,ra:0.30}, 'Meeting Room':{rp:2.5,ra:0.30}, 'Reception':{rp:2.5,ra:0.30},
  'Server Room':{rp:0,ra:0.30}, 'Bedroom':{rp:2.5,ra:0.30}, 'Living Room / Majlis':{rp:2.5,ra:0.30},
  'Guest Room':{rp:2.5,ra:0.30},
  'Patient Room':{rp:5.0,ra:0.60,gov:'ASHRAE 170 (ACH-governed)'},
  'Operating Theater':{rp:5.0,ra:0.90,gov:'ASHRAE 170 (≥20 ACH)'},
  'Classroom':{rp:5.0,ra:0.60}, 'Library':{rp:2.5,ra:0.60}, 'Lab':{rp:5.0,ra:0.90},
  'Retail':{rp:3.8,ra:0.60}, 'Restaurant':{rp:3.8,ra:0.90}, 'Gym':{rp:10,ra:0.30},
  'Mosque':{rp:2.5,ra:0.30}, 'Kitchen':{rp:3.8,ra:0.60}, 'Workshop':{rp:5.0,ra:0.60},
  'Warehouse':{rp:5.0,ra:0.30},
  'Toilet':{rp:0,ra:0,gov:'Exhaust ≥10 ACH'}, 'Bathroom':{rp:0,ra:0,gov:'Exhaust ≥10 ACH'},
  'Shower / Ablution':{rp:0,ra:0,gov:'Exhaust ≥10 ACH'},
  'Corridor':{rp:0,ra:0.30}, 'Staircase':{rp:0,ra:0.30},
  'Parking':{rp:0,ra:3.8,gov:'Exhaust (CO-controlled)'},
  'Storage':{rp:0,ra:0.60}, 'Other':{rp:2.5,ra:0.30}
};
function ventRates(t){ return VENT_621[t] || VENT_621.Other; }

/* ── Mechanical exhaust — code minimum rates ──
   Source: ASHRAE 62.1-2019 Table 6-4 "Minimum Exhaust Rates".
   Area rates converted from the table's cfm/ft² (× 5.08 → L/s·m²);
   toilet/urinal rates are the table's per-fixture values (50 cfm = 25 L/s).
   These are NOT estimates — each carries its Table 6-4 citation in `ref`. */
const EXHAUST_621 = {
  'Parking':           {area:3.8,  ref:'ASHRAE 62.1-2019 Table 6-4 — Parking garage (0.75 cfm/ft²)'},
  'Kitchen':           {area:3.5,  ref:'ASHRAE 62.1-2019 Table 6-4 — Kitchen, commercial (0.7 cfm/ft²)'},
  'Workshop':          {area:7.6,  ref:'ASHRAE 62.1-2019 Table 6-4 — Auto repair rooms (1.5 cfm/ft²)'},
  'Storage':           {area:5.1,  ref:'ASHRAE 62.1-2019 Table 6-4 — Janitor / storage rooms (1.0 cfm/ft²)'},
  'Lab':               {area:5.1,  ref:'ASHRAE 62.1-2019 Table 6-4 — Educational science labs (1.0 cfm/ft²)'},
  'Shower / Ablution': {area:1.3,  ref:'ASHRAE 62.1-2019 Table 6-4 — Locker / dressing rooms (0.25 cfm/ft²)'},
  'Toilet':            {perWC:25,  ref:'ASHRAE 62.1-2019 Table 6-4 — Toilets, public (50 cfm per WC/urinal)'},
  'Bathroom':          {perWC:25,  ref:'ASHRAE 62.1-2019 Table 6-4 — Toilets, public (50 cfm per WC/urinal)'}
};
function exhaustSpec(t){ return EXHAUST_621[t] || null; }
/* default per-space exhaust area-rate (L/s·m²) for a type, 0 if the code rate is fixture-based or N/A */
function exhaustAreaRate(t){ const e=EXHAUST_621[t]; return (e && e.area!=null) ? e.area : 0; }
/* a space defaults to exhaust-only when ASHRAE 62.1 governs it by exhaust (gov note) */
function defaultHvacMode(t){
  const v=VENT_621[t];
  return (v && v.gov && /exhaust/i.test(v.gov)) ? 'exhaust' : 'cooling';
}

/* Plumbing country defaults */
const PLUMB_CTRY = {
  KSA:    {vel:2.0, minP:100, slope:0.02, mat:'PPR'},
  UAE:    {vel:2.0, minP:100, slope:0.02, mat:'PPR'},
  Egypt:  {vel:2.0, minP:70,  slope:0.02, mat:'uPVC'},
  Qatar:  {vel:2.0, minP:100, slope:0.02, mat:'PPR'},
  Jordan: {vel:2.0, minP:70,  slope:0.02, mat:'Copper'},
  Generic:{vel:2.0, minP:100, slope:0.02, mat:'PPR'}
};

/* Daily water consumption L/person/day by country & building category */
const CONSUMPTION = {
  KSA:    {office:45, residential:200, hotel:350, mosque:30, healthcare:300, educational:40, retail:15},
  UAE:    {office:45, residential:250, hotel:400, mosque:30, healthcare:350, educational:40, retail:15},
  Egypt:  {office:40, residential:150, hotel:300, mosque:25, healthcare:250, educational:35, retail:12},
  Qatar:  {office:45, residential:250, hotel:400, mosque:30, healthcare:350, educational:40, retail:15},
  Jordan: {office:40, residential:150, hotel:300, mosque:25, healthcare:250, educational:35, retail:12},
  Generic:{office:45, residential:200, hotel:350, mosque:30, healthcare:300, educational:40, retail:15}
};
/* hot water share of daily demand & heater recovery, by category */
const HOTWATER = {
  office:{frac:.15}, residential:{frac:.30}, hotel:{frac:.35}, mosque:{frac:.20},
  healthcare:{frac:.35}, educational:{frac:.12}, retail:{frac:.10}, industrial:{frac:.10}
};

/* Min on-site potable storage days (municipal supply reliability) */
const STORAGE_DAYS = {KSA:2, UAE:1, Egypt:1, Qatar:2, Jordan:3, Generic:1};

const PIPE_C = {PPR:150, Copper:130, uPVC:140, CPVC:140, Galvanized:100, Steel:120};
const MAT_OPTS = [['PPR','PPR (C=150)'],['Copper','Copper (C=130)'],['uPVC','uPVC (C=140)'],['CPVC','CPVC (C=140)'],['Galvanized','Galvanized (C=100)']];

const BLDG_TYPES = ['office','retail','residential','hotel','healthcare','educational','mosque','industrial'];

const SPACE_TYPE_LIST = ['Office','Meeting Room','Reception','Server Room','Bedroom','Living Room / Majlis',
  'Guest Room','Patient Room','Operating Theater','Classroom','Library','Lab','Retail','Restaurant','Gym',
  'Mosque','Kitchen','Workshop','Warehouse','Toilet','Bathroom','Shower / Ablution','Corridor','Staircase',
  'Parking','Storage','Other'];

/* per-type properties: hazard class, metabolic activity, occupant density p/m² */
const SPACE_TYPES = {
  'Office':            {haz:'LH',  act:'seat',  occD:0.10, cat:'office'},
  'Meeting Room':      {haz:'LH',  act:'seat',  occD:0.50, cat:'office'},
  'Reception':         {haz:'LH',  act:'seat',  occD:0.30, cat:'office'},
  'Server Room':       {haz:'OH1', act:'light', occD:0,    cat:'office'},
  'Bedroom':           {haz:'LH',  act:'seat',  occD:0.05, cat:'residential'},
  'Living Room / Majlis':{haz:'LH',act:'seat',  occD:0.20, cat:'residential'},
  'Guest Room':        {haz:'LH',  act:'seat',  occD:0.05, cat:'hotel'},
  'Patient Room':      {haz:'LH',  act:'seat',  occD:0.07, cat:'healthcare'},
  'Operating Theater': {haz:'OH1', act:'light', occD:0.10, cat:'healthcare'},
  'Classroom':         {haz:'LH',  act:'seat',  occD:0.40, cat:'educational'},
  'Library':           {haz:'LH',  act:'seat',  occD:0.20, cat:'educational'},
  'Lab':               {haz:'OH2', act:'light', occD:0.07, cat:'healthcare'},
  'Retail':            {haz:'OH2', act:'light', occD:0.25, cat:'retail'},
  'Restaurant':        {haz:'OH1', act:'mod',   occD:0.70, cat:'hotel'},
  'Gym':               {haz:'OH1', act:'heavy', occD:0.20, cat:'office'},
  'Mosque':            {haz:'LH',  act:'asm',   occD:1.00, cat:'mosque'},
  'Kitchen':           {haz:'OH2', act:'mod',   occD:0.10, cat:'hotel'},
  'Workshop':          {haz:'OH2', act:'mod',   occD:0.05, cat:'office'},
  'Warehouse':         {haz:'OH2', act:'light', occD:0,    cat:'office'},
  'Toilet':            {haz:'LH',  act:'light', occD:0.05, cat:'office'},
  'Bathroom':          {haz:'LH',  act:'light', occD:0.05, cat:'office'},
  'Shower / Ablution': {haz:'LH',  act:'light', occD:0.05, cat:'hotel'},
  'Corridor':          {haz:'LH',  act:'light', occD:0,    cat:'office'},
  'Staircase':         {haz:'LH',  act:'light', occD:0,    cat:'office'},
  'Parking':           {haz:'OH1', act:'light', occD:0,    cat:'office'},
  'Storage':           {haz:'OH2', act:'light', occD:0,    cat:'office'},
  'Other':             {haz:'LH',  act:'light', occD:0.10, cat:'office'}
};

/* recommended space types per building type (rest still selectable) */
const SPACE_CAT = {
  office:      ['Office','Meeting Room','Reception','Server Room','Kitchen','Corridor','Toilet','Storage','Staircase','Parking'],
  retail:      ['Retail','Restaurant','Reception','Storage','Kitchen','Corridor','Toilet','Staircase','Parking'],
  residential: ['Bedroom','Living Room / Majlis','Kitchen','Bathroom','Shower / Ablution','Toilet','Corridor','Staircase','Parking','Storage','Gym'],
  hotel:       ['Guest Room','Reception','Restaurant','Kitchen','Gym','Meeting Room','Bathroom','Toilet','Corridor','Storage','Staircase','Parking'],
  healthcare:  ['Patient Room','Operating Theater','Lab','Reception','Office','Kitchen','Corridor','Toilet','Storage','Staircase','Parking'],
  educational: ['Classroom','Library','Lab','Office','Reception','Gym','Kitchen','Corridor','Toilet','Storage','Staircase','Parking'],
  mosque:      ['Mosque','Shower / Ablution','Toilet','Reception','Corridor','Storage','Staircase','Parking'],
  industrial:  ['Workshop','Warehouse','Storage','Office','Lab','Reception','Corridor','Toilet','Staircase','Parking']
};

/* ── smart space-type detection from a free-text space name ──
   ordered most-specific → most-generic; first keyword hit wins.
   keywords are matched whole-word (letters bounded by non-letters),
   so "driver room" → Bedroom, "conf." → Meeting Room, etc. */
const SPACE_TYPE_KEYWORDS = [
  ['Operating Theater', ['operating theat','operation theat','operating room','operation room','operating','surgery','surgical','recovery room']],
  ['Patient Room',      ['patient','ward','icu','i.c.u','inpatient','exam room','consult','treatment','clinic']],
  ['Server Room',       ['server','data center','data centre','datacenter','rack room','comms room','mdf','idf','telecom','it room','network room']],
  ['Meeting Room',      ['meeting','conference','conf','boardroom','board room','seminar','huddle']],
  ['Classroom',         ['classroom','class room','lecture','tutorial','training room','teaching','nursery','kindergarten']],
  ['Library',           ['library','reading room','archive']],
  ['Lab',               ['laboratory','lab','labs','research room']],
  ['Mosque',            ['mosque','masjid','prayer','musalla','musallah','musalah','salah','jamaat']],
  ['Shower / Ablution', ['ablution','wudu','wudhu','wuzu','shower','changing room','locker']],
  ['Bathroom',          ['bathroom','bath room','bath','ensuite','en-suite','en suite']],
  ['Toilet',            ['toilet','wc','w.c','water closet','restroom','rest room','washroom','lavatory','powder room']],
  ['Kitchen',           ['kitchen','pantry','kitchenette','scullery']],
  ['Restaurant',        ['restaurant','dining','diner','cafe','café','cafeteria','canteen','food court','coffee shop']],
  ['Gym',               ['gym','gymnasium','fitness','workout','exercise','aerobics','sport hall','sports hall']],
  ['Guest Room',        ['guest','hotel room','suite','cabin']],
  ['Bedroom',           ['bedroom','bed room','driver','maid','nanny','servant','staff room','guard room','dormitory','dorm','sleeping','master room','kids room','child room']],
  ['Living Room / Majlis',['living','majlis','majles','sitting','lounge','family room','salon','saloon','drawing room','sitting room']],
  ['Reception',         ['reception','lobby','foyer','waiting','entrance','vestibule','front desk','welcome']],
  ['Retail',            ['retail','shop','store front','storefront','boutique','showroom','show room','market','mall']],
  ['Workshop',          ['workshop','work shop','maintenance','repair','machine room','plant room','mechanical room','technical room','fabrication']],
  ['Warehouse',         ['warehouse','loading','goods','distribution']],
  ['Parking',           ['parking','car park','carpark','garage','basement parking']],
  ['Staircase',         ['staircase','stairwell','stair','stairs','escalator','fire escape']],
  ['Corridor',          ['corridor','hallway','hall way','passage','passageway','walkway','lobby corridor']],
  ['Storage',           ['storage','store room','storeroom','store','closet','utility','janitor','linen','filing','archive room']],
  ['Office',            ['office','study','admin','administration','workspace','work room','manager','secretary','cubicle','open plan']]
];

/* return a SPACE_TYPE_LIST entry inferred from a free-text name, or null */
function guessSpaceType(name){
  if(!name) return null;
  const n = String(name).toLowerCase();
  for(const [type, kws] of SPACE_TYPE_KEYWORDS){
    for(const kw of kws){
      const k = kw.trim();
      const re = new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '([^a-z]|$)');
      if(re.test(n)) return type;
    }
  }
  return null;
}

/* context-aware occupant density overrides (persons/m²) by building type */
const OCC_BY_BUILDING = {
  'Toilet':            {office:0.06, retail:0.15, residential:0.02, hotel:0.06, healthcare:0.10, educational:0.12, mosque:0.18, industrial:0.05},
  'Bathroom':          {office:0.06, retail:0.15, residential:0.02, hotel:0.06, healthcare:0.10, educational:0.12, mosque:0.18, industrial:0.05},
  'Shower / Ablution': {office:0.05, retail:0.10, residential:0.02, hotel:0.05, healthcare:0.08, educational:0.08, mosque:0.22, industrial:0.06},
  'Reception':         {office:0.30, retail:0.45, residential:0.08, hotel:0.40, healthcare:0.55, educational:0.30, mosque:0.20, industrial:0.15},
  'Kitchen':           {office:0.08, retail:0.12, residential:0.03, hotel:0.10, healthcare:0.10, educational:0.10, mosque:0.10, industrial:0.08},
  'Office':            {office:0.10, retail:0.10, residential:0.05, hotel:0.10, healthcare:0.10, educational:0.10, mosque:0.08, industrial:0.06},
  'Meeting Room':      {office:0.50, retail:0.45, residential:0.30, hotel:0.55, healthcare:0.45, educational:0.50, mosque:0.40, industrial:0.40}
};
const OCC_MIN = {'Corridor':0,'Staircase':0,'Parking':0,'Storage':0,'Server Room':0,'Warehouse':0};

/* heat gain per person W (sensible/latent) by activity */
const H_ACT  = {seat:{s:60,l:40}, light:{s:65,l:45}, mod:{s:70,l:55}, asm:{s:75,l:55}, heavy:{s:90,l:85}};
/* CLTD wall orientation additions °C & solar heat gain factors W/m² */
const WALL_ADD = {N:2, NE:5, E:9, SE:8, S:6, SW:9, W:11, NW:6};
const SHGF = {N:150, NE:385, E:625, SE:505, S:355, SW:505, W:625, NW:385, H:880};
const ORI   = [['N','N'],['NE','NE'],['E','E'],['SE','SE'],['S','S'],['SW','SW'],['W','W'],['NW','NW']];
const ORI_H = ORI.concat([['H','Horizontal (skylight)']]);

/* ── plumbing fixtures: [label, WSFU, DFU, hotWater?] ── */
const FIXTURES = [
  {k:'wc',     n:'Water Closet (Tank)',       wsfu:2.5, dfu:4,  hot:false},
  {k:'wcfv',   n:'Water Closet (Flush Valve)',wsfu:6,   dfu:4,  hot:false},
  {k:'lav',    n:'Lavatory / Washbasin',      wsfu:1.0, dfu:1,  hot:true},
  {k:'sink',   n:'Kitchen Sink',              wsfu:1.5, dfu:2,  hot:true},
  {k:'shower', n:'Shower',                    wsfu:2.0, dfu:2,  hot:true},
  {k:'tub',    n:'Bathtub',                   wsfu:2.0, dfu:2,  hot:true},
  {k:'urinal', n:'Urinal',                    wsfu:2.5, dfu:4,  hot:false},
  {k:'df',     n:'Drinking Fountain',         wsfu:0.5, dfu:0.5,hot:false},
  {k:'mop',    n:'Service / Mop Sink',        wsfu:2.0, dfu:3,  hot:true},
  {k:'wm',     n:'Washing Machine',           wsfu:3.0, dfu:3,  hot:true},
  {k:'fd',     n:'Floor Drain',               wsfu:0,   dfu:2,  hot:false}
];

/* fixture auto-suggestion per space type (qty as fn of area a, occupants o) */
const FIX_SUGGEST = {
  'Toilet':            (a,o)=>({wc:Math.max(1,Math.round(a/4)), lav:Math.max(1,Math.round(a/5)), fd:Math.max(1,Math.round(a/8))}),
  'Bathroom':          (a,o)=>({wc:Math.max(1,Math.round(a/6)), lav:Math.max(1,Math.round(a/6)), shower:Math.max(1,Math.round(a/6)), fd:1}),
  'Shower / Ablution': (a,o)=>({shower:Math.max(1,Math.round(a/3)), lav:Math.max(1,Math.round(a/4)), fd:Math.max(1,Math.round(a/6))}),
  'Kitchen':           (a,o)=>({sink:Math.max(1,Math.round(a/20)), fd:Math.max(1,Math.round(a/25))}),
  'Guest Room':        ()=>({wc:1, lav:1, shower:1, fd:1}),
  'Patient Room':      ()=>({wc:1, lav:1, shower:1, fd:1}),
  'Bedroom':           ()=>({}),
  'Restaurant':        (a,o)=>({lav:Math.max(1,Math.round(o/30)), sink:Math.max(1,Math.round(a/40)), fd:Math.max(1,Math.round(a/40))}),
  'Lab':               (a)=>({sink:Math.max(1,Math.round(a/25)), fd:1}),
  'Mosque':            (a,o)=>({lav:Math.max(2,Math.round(o/25)), fd:Math.max(1,Math.round(a/40))})
};

/* Hunter's curve: WSFU → L/s (flush-tank systems) */
const HUNTERS = [[1,.19],[2,.31],[4,.50],[6,.63],[8,.75],[10,.87],[12,.97],[14,1.07],[16,1.15],[18,1.23],
  [20,1.31],[25,1.51],[30,1.70],[40,2.02],[50,2.30],[75,2.84],[100,3.28],[150,4.00],
  [200,4.59],[300,5.55],[400,6.35],[500,7.07],[750,8.60],[1000,9.85]];

const PIPE_SIZES  = [15,20,25,32,40,50,65,80,100,125,150,200,250];
/* drainage: [pipe mm, max DFU] horizontal branch */
const DRAIN_SIZES = [[50,3],[65,8],[75,26],[100,216],[125,480],[150,840],[200,1680]];
/* stacks: [pipe mm, max DFU on stack ≤3 storeys] */
const STACK_SIZES = [[50,10],[65,20],[75,48],[100,240],[125,540],[150,960],[200,2200]];
/* roof drainage: leader Ø mm → max roof area m² at 100 mm/hr (IPC 1106 scaled) */
const LEADER_SIZES = [[50,60],[65,110],[75,180],[100,380],[125,700],[150,1130],[200,2400]];

/* ── NFPA 13 hazard data (SI): density mm/min, design area m², hose L/min, coverage m²/spr ── */
const HAZ_DATA = {
  LH:  {name:'Light Hazard',      density:4.1,  designArea:139, hose:379,  cov:20.9, spacing:4.6, duration:30, extCov:1045},
  OH1: {name:'Ordinary Hazard 1', density:6.1,  designArea:139, hose:946,  cov:12.1, spacing:4.6, duration:60, extCov:1045},
  OH2: {name:'Ordinary Hazard 2', density:8.1,  designArea:139, hose:946,  cov:12.1, spacing:4.6, duration:60, extCov:1045},
  EH1: {name:'Extra Hazard 1',    density:12.2, designArea:232, hose:1893, cov:9.3,  spacing:3.7, duration:90, extCov:557},
  EH2: {name:'Extra Hazard 2',    density:16.3, designArea:232, hose:1893, cov:9.3,  spacing:3.7, duration:90, extCov:557}
};
const HAZ_ORDER = ['LH','OH1','OH2','EH1','EH2'];
/* NFPA 13 pipe schedule (steel): max sprinklers per pipe size */
const PIPE_SCHED = [{maxSpr:2,steel:25},{maxSpr:3,steel:32},{maxSpr:5,steel:40},{maxSpr:10,steel:50},
  {maxSpr:20,steel:65},{maxSpr:40,steel:80},{maxSpr:100,steel:100},{maxSpr:Infinity,steel:150}];
/* standard fire pump ratings (GPM) */
const PUMP_RATINGS_GPM = [250,300,400,450,500,750,1000,1250,1500,2000,2500];

/* standard DX equipment sizes TR */
const DX_SIZES = [1,1.5,2,2.5,3,4,5];

/* ── unit conversion (SI is canonical storage) ── */
const UNITS = {
  temp:    {si:'°C',   imp:'°F',     to:v=>v*9/5+32,        from:v=>(v-32)*5/9},
  dtemp:   {si:'K',    imp:'°F',     to:v=>v*1.8,           from:v=>v/1.8},
  area:    {si:'m²',   imp:'ft²',    f:10.7639},
  length:  {si:'m',    imp:'ft',     f:3.28084},
  dia:     {si:'mm',   imp:'in',     f:1/25.4},
  flow:    {si:'L/s',  imp:'gpm',    f:15.8503},
  airflow: {si:'L/s',  imp:'cfm',    f:2.11888},
  power:   {si:'W',    imp:'Btu/h',  f:3.41214},
  kw:      {si:'kW',   imp:'MBH',    f:3.41214},
  pressure:{si:'kPa',  imp:'psi',    f:0.145038},
  head:    {si:'m',    imp:'ft',     f:3.28084},
  velocity:{si:'m/s',  imp:'ft/s',   f:3.28084},
  volume:  {si:'m³',   imp:'gal',    f:264.172},
  liters:  {si:'L',    imp:'gal',    f:0.264172},
  uval:    {si:'W/m²K',imp:'Btu/h·ft²·°F', f:0.17611},
  pdens:   {si:'W/m²', imp:'W/ft²',  f:0.092903},
  fdens:   {si:'mm/min',imp:'gpm/ft²',f:0.0245424},
  consump: {si:'L/p·d',imp:'gal/p·d',f:0.264172},
  mass:    {si:'kg',   imp:'lb',     f:2.20462},
  rain:    {si:'mm/hr',imp:'in/hr',  f:1/25.4}
};
