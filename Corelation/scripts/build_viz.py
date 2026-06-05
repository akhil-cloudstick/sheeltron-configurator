# -*- coding: utf-8 -*-
"""Generate a self-contained interactive Compatibility Explorer HTML from the
correlation CSVs, so the data can be understood visually (mirrors the wizard)."""
import csv, json, os, collections

# Resolve the Corelation folder relative to this script (.../Corelation/scripts/build_viz.py).
OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(f): return list(csv.DictReader(open(os.path.join(OUT,f), encoding="utf-8")))

cpus_raw, chassis_raw = load("cpus.csv"), load("chassis.csv")
ram_raw, storage_raw  = load("ram.csv"), load("storage.csv")

def vendor(c):
    b=(c.get("brand") or "").upper(); f=(c.get("family") or "").upper()
    if "AMD" in b or "AMD" in f or "EPYC" in f or "RYZEN" in f: return "AMD"
    return "Intel"

# CPUs: dedupe by model for the picker, keep server flag + socket
cpu_by_model={}
for c in cpus_raw:
    m=c["model"]
    if m in cpu_by_model: cpu_by_model[m]["count"]+=1; continue
    cpu_by_model[m]=dict(model=m, vendor=vendor(c), socket=c["socket"],
        family=c["family"] or "(unspecified)", series=c["series"] or "(unspecified)",
        cores=c["cores"], threads=c["threads"],
        is_server=c["is_server"], needs_review=c["needs_review"],
        cn=c["condition_new"], cr=c["condition_refurbished"], count=1)
cpus=list(cpu_by_model.values())

# Chassis: group by model_family
fam={}
for c in chassis_raw:
    k=c["model_family"] or c["model"]
    if k not in fam:
        fam[k]=dict(family=k, brand=c["brand"], model=c["model"],
            cpu_socket=c["cpu_socket"], ram_type=c["ram_type"],
            ff=c["drive_form_factors"], max_sockets=c["max_sockets"],
            needs_review=c["needs_review"], datasheet=c["datasheet"], count=0,
            cn=c["condition_new"], cr=c["condition_refurbished"])
    fam[k]["count"]+=1
    if c["condition_new"]=="yes": fam[k]["cn"]="yes"
    if c["condition_refurbished"]=="yes": fam[k]["cr"]="yes"
chassis=list(fam.values())

import re as _re
_PC={'12800':'1600','10600':'1333','8500':'1066','14900':'1866','17000':'2133',
     '19200':'2400','21300':'2666','23400':'2933','25600':'3200','38400':'4800','44800':'5600'}
def ram_speed(name):
    u=(name or "").upper()
    m=_re.search(r'PC[345]L?[ -]?(\d{4,5})', u)
    if m:
        v=m.group(1)
        if 2000<=int(v)<=8000: return v          # already MT/s (e.g. PC4 3200)
        return _PC.get(v,"")                       # PCx bandwidth -> MT/s
    m=_re.search(r'\b(1066|1333|1600|1866|2133|2400|2666|2933|3200|3600|4000|4800|5200|5600|6400)\b', u)
    return m.group(1) if m else ""

ram=[dict(name=r["product_name"], brand=r["brand"], capacity=r["capacity"],
    ram_type=r["ram_type"], speed=ram_speed(r["product_name"]),
    cn=r["condition_new"], cr=r["condition_refurbished"],
    needs_review=r["needs_review"]) for r in ram_raw]

def st_type(kind, iface):
    if (iface or "").upper()=="NVME" or iface=="NVMe": return "NVMe"
    return kind  # HDD / SSD (SATA/SAS)
def st_speed(s):
    v=(s or "").strip().replace("GB/s","Gb/s").replace("gb/s","Gb/s").replace("GB/S","Gb/s")
    return v
storage=[dict(name=s["product_name"], kind=s["kind"], type=st_type(s["kind"],s["interface"]),
    brand=s["brand"], capacity=s["capacity"], interface=s["interface"], ff=s["form_factor"],
    speed=st_speed(s["speed"]), cn=s["condition_new"], cr=s["condition_refurbished"],
    needs_review=s["needs_review"]) for s in storage_raw]

# coverage / stats
def cnt(rows,pred): return sum(1 for r in rows if pred(r))
sock_chassis=collections.Counter(c["cpu_socket"] for c in chassis if c["needs_review"]=="no" and c["cpu_socket"])
sock_cpu=collections.Counter(c["socket"] for c in cpus if c["is_server"]=="yes" and c["socket"])
stats=dict(
  cpu_total=len(cpus), cpu_server=cnt(cpus,lambda c:c["is_server"]=="yes"),
  chassis_total=len(chassis_raw), chassis_fam=len(chassis),
  chassis_ok=cnt(chassis,lambda c:c["needs_review"]=="no"),
  ram_total=len(ram), storage_total=len(storage),
  sockets=sorted(set(list(sock_chassis)+list(sock_cpu))),
  sock_chassis=dict(sock_chassis), sock_cpu=dict(sock_cpu),
  ram_types=dict(collections.Counter(r["ram_type"] for r in ram)),
)

DATA=json.dumps(dict(cpus=cpus,chassis=chassis,ram=ram,storage=storage,stats=stats),
                ensure_ascii=False).replace("</","<\\/")

HTML = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sheeltron · Compatibility Explorer</title>
<style>
:root{--red:#e53935;--ink:#1a1a1f;--muted:#6b7280;--line:#e6e7eb;--bg:#f6f7f9;--card:#fff;
  --ok:#16a34a;--warn:#d97706;--amd:#c0392b;--intel:#2563eb;}
*{box-sizing:border-box}body{margin:0;font-family:'Plus Jakarta Sans',system-ui,Segoe UI,Arial,sans-serif;
  background:var(--bg);color:var(--ink)}
h1,h2,h3{font-family:'Space Grotesk',system-ui,sans-serif;margin:0}
header{background:var(--card);border-bottom:1px solid var(--line);padding:14px 22px;display:flex;
  align-items:center;gap:14px;position:sticky;top:0;z-index:5}
.logo{font-family:'Space Grotesk';font-weight:700;font-size:18px}.logo b{color:var(--red)}
.sub{color:var(--muted);font-size:13px}
.stats{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.stat{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:6px 11px;font-size:12px;text-align:center}
.stat b{display:block;font-size:16px;font-family:'Space Grotesk'}
.wrap{max-width:1320px;margin:0 auto;padding:18px 22px}
.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
@media(max-width:1200px){.flow{grid-template-columns:1fr 1fr}}
@media(max-width:760px){.flow{grid-template-columns:1fr}}
.col{background:var(--card);border:1px solid var(--line);border-radius:14px;display:flex;flex-direction:column;min-height:60vh;overflow:hidden}
.col.dim{opacity:.45;filter:grayscale(.4)}
.ch{padding:12px 14px;border-bottom:1px solid var(--line)}
.ch .step{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--red);font-weight:700}
.ch h2{font-size:15px;margin-top:2px}.ch .hint{font-size:12px;color:var(--muted);margin-top:3px}
.tools{display:flex;gap:6px;padding:9px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.tools input{flex:1;min-width:90px;border:1px solid var(--line);border-radius:8px;padding:7px 9px;font-size:13px}
.chip{border:1px solid var(--line);background:#fff;border-radius:20px;padding:5px 11px;font-size:12px;cursor:pointer}
.chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.chip.amd.on{background:var(--amd);border-color:var(--amd)}.chip.intel.on{background:var(--intel);border-color:var(--intel)}
.list{overflow:auto;flex:1;padding:8px}
.row{border:1px solid var(--line);border-radius:10px;padding:9px 11px;margin-bottom:7px;cursor:pointer;background:#fff;transition:.12s}
.row:hover{border-color:var(--ink)}
.row.sel{border-color:var(--red);box-shadow:0 0 0 2px rgba(229,57,53,.15)}
.row .t{font-weight:600;font-size:13px;display:flex;justify-content:space-between;gap:8px}
.row .m{font-size:11.5px;color:var(--muted);margin-top:3px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.badge{font-size:10.5px;padding:2px 7px;border-radius:6px;background:var(--bg);border:1px solid var(--line);white-space:nowrap}
.badge.sock{background:#eef2ff;border-color:#c7d2fe;color:#3730a3;font-weight:600}
.badge.ram{background:#ecfdf5;border-color:#a7f3d0;color:#065f46;font-weight:600}
.badge.ff{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
.badge.amd{background:#fdecea;border-color:#f5c6c2;color:var(--amd)}
.badge.intel{background:#eff6ff;border-color:#bfdbfe;color:var(--intel)}
.badge.cn{background:#ecfeff;border-color:#a5f3fc;color:#155e75}
.badge.cr{background:#fefce8;border-color:#fde68a;color:#854d0e}
.empty{color:var(--muted);font-size:13px;padding:24px;text-align:center}
.facet{padding:8px 12px;border-bottom:1px solid var(--line)}
.facet .lbl{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;display:flex;align-items:center;gap:8px}
.facet .lbl a{color:var(--red);cursor:pointer;text-transform:none;letter-spacing:0;font-weight:600}
.facet .chips{display:flex;gap:6px;flex-wrap:wrap}
.fchip{border:1px solid var(--line);background:#fff;border-radius:18px;padding:4px 10px;font-size:11.5px;cursor:pointer;display:inline-flex;gap:5px;align-items:center}
.fchip:hover{border-color:var(--ink)}
.fchip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.fchip .n{font-size:10px;opacity:.7}
.crumb{font-size:12px;color:var(--muted);padding:8px 12px;border-bottom:1px solid var(--line)}
.crumb b{color:var(--ink)}
.count{font-size:11px;color:var(--muted);padding:4px 12px}
.why{background:#fff7f7;border:1px dashed #f3b6b3;border-radius:10px;padding:8px 11px;margin:8px;font-size:12px;color:#8a2b28}
.why b{color:var(--red)}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin:14px 2px 0;font-size:12px;color:var(--muted)}
.legend span{display:inline-flex;align-items:center;gap:5px}
.dot{width:10px;height:10px;border-radius:3px;display:inline-block}
.matrix{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-top:16px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:14px}
.cards .matrix{margin-top:0}
.matrix.full{grid-column:1/-1}
.matrix table{width:100%;border-collapse:collapse;font-size:13px}
.matrix th,.matrix td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line)}
.matrix th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.bar{height:8px;border-radius:4px;background:var(--red);display:inline-block;vertical-align:middle}
.tabs{display:flex;gap:8px;margin:0 0 14px}
.tab{padding:8px 14px;border:1px solid var(--line);background:#fff;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600}
.tab.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.nrtoggle{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;cursor:pointer;margin-left:auto}
.split{display:flex;flex-direction:column;gap:0;flex:1;overflow:hidden}
.split .half{flex:1;display:flex;flex-direction:column;overflow:hidden;border-bottom:1px solid var(--line)}
.split .half:last-child{border-bottom:0}
.half h3{font-size:12px;padding:8px 12px 4px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
</style></head><body>
<header>
  <div><div class="logo">SHEEL<b>TRON</b> · Compatibility Explorer</div>
  <div class="sub">Processor-first build · pick a CPU → see what fits</div></div>
  <div class="stats" id="stats"></div>
</header>
<div class="wrap">
  <div class="tabs">
    <div class="tab on" data-tab="flow">▶ Build flow</div>
    <div class="tab" data-tab="matrix">▦ Coverage by socket</div>
  </div>

  <div id="flow">
    <div class="flow">
      <div class="col" id="c1">
        <div class="ch"><div class="step">Step 1</div><h2>Processor</h2>
          <div class="hint">Narrow by family &amp; generation, then pick a CPU. Its <b>socket</b> decides which chassis appear.</div></div>
        <div class="tools">
          <input id="cpuSearch" placeholder="Search CPU model…">
          <span class="chip on" data-v="all">All</span>
          <span class="chip intel" data-v="Intel">Intel</span>
          <span class="chip amd" data-v="AMD">AMD</span>
          <label class="nrtoggle"><input type="checkbox" id="showAllCpu"> show non-server</label>
        </div>
        <div class="facet"><div class="lbl">1 · Family</div><div class="chips" id="famRow"></div></div>
        <div class="facet" id="serWrap" style="display:none"><div class="lbl">2 · Series <a id="famBack">↩ change family</a></div><div class="chips" id="serRow"></div></div>
        <div class="facet" id="coreWrap" style="display:none"><div class="lbl">3 · Cores</div><div class="chips" id="coreRow"></div></div>
        <div class="count" id="cpuCount"></div>
        <div class="list" id="cpuList"></div>
      </div>

      <div class="col dim" id="c2">
        <div class="ch"><div class="step">Step 2</div><h2>Chassis</h2>
          <div class="hint">Only chassis whose socket matches the chosen CPU.</div></div>
        <div id="why2"></div>
        <div class="facet" id="chBrandWrap" style="display:none"><div class="lbl">Brand</div><div class="chips" id="chBrandRow"></div></div>
        <div class="count" id="chCount"></div>
        <div class="list" id="chList"></div>
      </div>

      <div class="col dim" id="c3">
        <div class="ch"><div class="step">Step 3</div><h2>RAM</h2>
          <div class="hint">Only the chassis's DDR generation.</div></div>
        <div id="why3"></div>
        <div class="facet" id="ramGenWrap" style="display:none"><div class="lbl">DDR generation</div><div class="chips" id="ramGenRow"></div></div>
        <div class="facet" id="ramBrandWrap" style="display:none"><div class="lbl">Brand</div><div class="chips" id="ramBrandRow"></div></div>
        <div class="facet" id="ramSpeedWrap" style="display:none"><div class="lbl">Speed (MT/s)</div><div class="chips" id="ramSpeedRow"></div></div>
        <div class="count" id="ramCount"></div>
        <div class="list" id="ramList"></div>
      </div>

      <div class="col dim" id="c4">
        <div class="ch"><div class="step">Step 4</div><h2>Storage</h2>
          <div class="hint">Only the chassis's drive form factor.</div></div>
        <div id="why4"></div>
        <div class="facet" id="stTypeWrap" style="display:none"><div class="lbl">Type</div><div class="chips" id="stTypeRow"></div></div>
        <div class="facet" id="stBrandWrap" style="display:none"><div class="lbl">Brand</div><div class="chips" id="stBrandRow"></div></div>
        <div class="facet" id="stSpeedWrap" style="display:none"><div class="lbl">Speed</div><div class="chips" id="stSpeedRow"></div></div>
        <div class="count" id="stCount"></div>
        <div class="list" id="stList"></div>
      </div>
    </div>
    <div class="legend">
      <span><span class="dot" style="background:#3730a3"></span> socket (CPU↔chassis)</span>
      <span><span class="dot" style="background:#065f46"></span> ram_type (chassis↔RAM)</span>
      <span><span class="dot" style="background:#9a3412"></span> form factor (chassis↔storage)</span>
      <span><span class="dot" style="background:#155e75"></span> New</span>
      <span><span class="dot" style="background:#854d0e"></span> Refurbished</span>
    </div>
  </div>

  <div id="matrix" style="display:none"></div>
</div>
<script>
const DB = __DATA__;
const $=s=>document.querySelector(s); const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
let vfilter="all", selCpu=null, selCh=null, selFam=null, selSer=null, selCores=null, selChBrand=null;
let ramGen=null, ramBrand=null, ramSpeed=null, stType=null, stBrand=null, stSpeed=null;
const coresOf=c=>{const n=parseInt(c.cores);return isNaN(n)?null:n;};
function resetSpareFacets(){ramGen=ramBrand=ramSpeed=stType=stBrand=stSpeed=null;}
// generic facet row: All + a chip per distinct key (with counts)
function buildFacet(rowId, wrapId, pool, keyFn, cur, setFn, order){
  const wrap=$(wrapId), row=$(rowId);
  const m={}; pool.forEach(r=>{const k=keyFn(r); if(k)m[k]=(m[k]||0)+1;});
  let keys=Object.keys(m);
  if(!keys.length){wrap.style.display="none";return;}
  wrap.style.display=""; row.innerHTML="";
  keys.sort(order||((a,b)=>m[b]-m[a]));
  const all=el("span","fchip"+(cur==null?" on":""),`All<span class="n">${pool.length}</span>`);
  all.onclick=()=>setFn(null); row.appendChild(all);
  keys.forEach(k=>{const c=el("span","fchip"+(cur==k?" on":""),`${k}<span class="n">${m[k]}</span>`);
    c.onclick=()=>setFn(cur==k?null:k); row.appendChild(c);});
}
const byNumDesc=(a,b)=>(parseInt(b)||0)-(parseInt(a)||0);

// stats bar
const S=DB.stats;
$("#stats").innerHTML=[
  ["CPUs",S.cpu_total],["server CPUs",S.cpu_server],
  ["Chassis",S.chassis_total+" ("+S.chassis_fam+" models)"],
  ["confident",S.chassis_ok+"/"+S.chassis_fam],
  ["RAM",S.ram_total],["Storage",S.storage_total],
].map(([k,v])=>`<div class="stat"><b>${v}</b>${k}</div>`).join("");

function condBadges(o){let h="";if(o.cn=="yes")h+='<span class="badge cn">New</span>';if(o.cr=="yes")h+='<span class="badge cr">Refurb</span>';return h;}

// base set after vendor + server toggle (the pool the facets describe)
function cpuPool(){
  const showAll=$("#showAllCpu").checked;
  return DB.cpus.filter(c=>(showAll||(c.is_server=="yes"&&c.needs_review=="no")))
                .filter(c=>vfilter=="all"||c.vendor==vfilter);
}
function tally(rows,key){const m={};rows.forEach(r=>{m[r[key]]=(m[r[key]]||0)+1;});
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);}

function renderFacets(){
  const pool=cpuPool();
  // Family row
  const fr=$("#famRow"); fr.innerHTML="";
  tally(pool,"family").forEach(([f,n])=>{
    const c=el("span","fchip"+(selFam==f?" on":""),`${f}<span class="n">${n}</span>`);
    c.onclick=()=>{selFam=(selFam==f?null:f);selSer=null;selCores=null;selCpu=null;syncStep1();};
    fr.appendChild(c);
  });
  // Series row (only when a family is chosen)
  const sw=$("#serWrap"), sr=$("#serRow");
  if(selFam){
    sw.style.display="";
    sr.innerHTML="";
    const fam=pool.filter(c=>c.family==selFam);
    const sers=tally(fam,"series");
    const all=el("span","fchip"+(selSer==null?" on":""),`All<span class="n">${fam.length}</span>`);
    all.onclick=()=>{selSer=null;selCores=null;selCpu=null;syncStep1();}; sr.appendChild(all);
    if(sers.length>1) sers.forEach(([s,n])=>{
      const c=el("span","fchip"+(selSer==s?" on":""),`${s}<span class="n">${n}</span>`);
      c.onclick=()=>{selSer=(selSer==s?null:s);selCores=null;selCpu=null;syncStep1();};
      sr.appendChild(c);
    });
  } else { sw.style.display="none"; }

  // Cores row (once a family is chosen; narrows within family+series)
  const cw=$("#coreWrap"), cr=$("#coreRow");
  if(selFam){
    cw.style.display="";
    cr.innerHTML="";
    const pool2=pool.filter(c=>c.family==selFam).filter(c=>!selSer||c.series==selSer);
    const all=el("span","fchip"+(selCores==null?" on":""),`All<span class="n">${pool2.length}</span>`);
    all.onclick=()=>{selCores=null;selCpu=null;syncStep1();}; cr.appendChild(all);
    const m={}; pool2.forEach(c=>{const n=coresOf(c); if(n!=null)m[n]=(m[n]||0)+1;});
    Object.keys(m).map(Number).sort((a,b)=>a-b).forEach(n=>{
      const c=el("span","fchip"+(selCores==n?" on":""),`${n}C<span class="n">${m[n]}</span>`);
      c.onclick=()=>{selCores=(selCores==n?null:n);selCpu=null;syncStep1();};
      cr.appendChild(c);
    });
  } else { cw.style.display="none"; }
}
function syncStep1(){ renderFacets(); renderCpus(); renderChassis(); renderSpares(); }

function renderCpus(){
  const q=($("#cpuSearch").value||"").toLowerCase();
  const L=$("#cpuList"); L.innerHTML="";
  // require a family (or a search) first — no more flat dump
  if(!selFam && !q){
    $("#cpuCount").textContent="";
    L.appendChild(el("div","empty","Pick a family above to see processors — or type to search."));
    return;
  }
  let rows=cpuPool()
    .filter(c=>!selFam||c.family==selFam)
    .filter(c=>!selSer||c.series==selSer)
    .filter(c=>!q||c.model.toLowerCase().includes(q));
  // gate: once a family is chosen, narrow by cores before dumping a long list
  if(selFam && selCores==null && !q && rows.length>15){
    $("#cpuCount").textContent="";
    L.appendChild(el("div","empty","Pick a core count above to narrow — "+rows.length+" in "+(selSer||selFam)+"."));
    return;
  }
  rows=rows.filter(c=>selCores==null||coresOf(c)==selCores);
  rows.sort((a,b)=>(a.socket<b.socket?-1:1)||a.model.localeCompare(b.model));
  $("#cpuCount").textContent=rows.length+" processors"+(selFam?" · "+selFam+(selSer?" · "+selSer:"")+(selCores!=null?" · "+selCores+"C":""):"");
  if(!rows.length){L.appendChild(el("div","empty","No CPUs match."));return;}
  rows.forEach(c=>{
    const r=el("div","row"+(selCpu&&selCpu.model==c.model?" sel":""));
    const vb=`<span class="badge ${c.vendor.toLowerCase()}">${c.vendor}</span>`;
    const sb=c.socket?`<span class="badge sock">${c.socket}</span>`:`<span class="badge">no socket</span>`;
    r.innerHTML=`<div class="t"><span>${c.model}</span>${sb}</div>
      <div class="m">${vb}<span class="badge">${c.cores} / ${c.threads}</span>
      ${c.is_server=="yes"?"":'<span class="badge" style="color:#b45309">non-server</span>'}
      ${condBadges(c)}</div>`;
    r.onclick=()=>{selCpu=c;selCh=null;selChBrand=null;renderCpus();renderChassis();renderSpares();};
    L.appendChild(r);
  });
}
function renderChassis(){
  const c2=$("#c2"),c3=$("#c3"),bw=$("#chBrandWrap");
  if(!selCpu||!selCpu.socket){c2.classList.add("dim");$("#chList").innerHTML="";$("#why2").innerHTML="";
    $("#chCount").textContent="";bw.style.display="none";c3.classList.add("dim");return;}
  c2.classList.remove("dim");
  let match=DB.chassis.filter(c=>c.needs_review=="no"&&c.cpu_socket==selCpu.socket);
  $("#why2").innerHTML=`<div class="why">CPU <b>${selCpu.model}</b> is socket <b>${selCpu.socket}</b> → ${match.length} chassis models match.</div>`;
  // Brand facet (from the socket-matched set)
  const br=$("#chBrandRow");
  if(match.length){
    bw.style.display=""; br.innerHTML="";
    const all=el("span","fchip"+(selChBrand==null?" on":""),`All<span class="n">${match.length}</span>`);
    all.onclick=()=>{selChBrand=null;renderChassis();}; br.appendChild(all);
    tally(match,"brand").forEach(([b,n])=>{
      const c=el("span","fchip"+(selChBrand==b?" on":""),`${b}<span class="n">${n}</span>`);
      c.onclick=()=>{selChBrand=(selChBrand==b?null:b);
        if(selCh&&selChBrand&&selCh.brand!=selChBrand){selCh=null;renderSpares();}
        renderChassis();};
      br.appendChild(c);
    });
  } else bw.style.display="none";
  let rows=match.filter(c=>!selChBrand||c.brand==selChBrand);
  rows.sort((a,b)=>a.family.localeCompare(b.family));
  $("#chCount").textContent=rows.length+" chassis models"+(selChBrand?" · "+selChBrand:"");
  const L=$("#chList");L.innerHTML="";
  if(!rows.length){L.appendChild(el("div","empty","No chassis use this socket in stock."));}
  rows.forEach(c=>{
    const r=el("div","row"+(selCh&&selCh.family==c.family?" sel":""));
    r.innerHTML=`<div class="t"><span>${c.family}</span><span class="badge sock">${c.cpu_socket}</span></div>
      <div class="m"><span class="badge">${c.brand}</span>
      ${c.ram_type?`<span class="badge ram">${c.ram_type}</span>`:""}
      ${c.ff?`<span class="badge ff">${c.ff}</span>`:'<span class="badge">bays: n/a</span>'}
      <span class="badge">${c.count} in stock</span>${condBadges(c)}</div>`;
    r.onclick=()=>{selCh=c;resetSpareFacets();renderChassis();renderSpares();};
    L.appendChild(r);
  });
}
function renderSpares(){
  const c3=$("#c3"),c4=$("#c4");
  const wraps=["#ramGenWrap","#ramBrandWrap","#ramSpeedWrap","#stTypeWrap","#stBrandWrap","#stSpeedWrap"];
  if(!selCh){
    [c3,c4].forEach(c=>c.classList.add("dim"));
    ["#ramList","#stList","#why3","#why4"].forEach(s=>$(s).innerHTML="");
    wraps.forEach(s=>$(s).style.display="none");
    $("#ramCount").textContent="";$("#stCount").textContent="";return;
  }
  c3.classList.remove("dim");c4.classList.remove("dim");
  const rt=selCh.ram_type, ffs=(selCh.ff||"").split(";").filter(Boolean);

  // ---- Step 3 · RAM ----
  let rbase=DB.ram.filter(r=>r.needs_review=="no"&&r.ram_type==rt);
  buildFacet("#ramGenRow","#ramGenWrap",rbase,r=>r.ram_type,ramGen,v=>{ramGen=v;renderSpares();});
  buildFacet("#ramBrandRow","#ramBrandWrap",rbase,r=>r.brand,ramBrand,v=>{ramBrand=v;renderSpares();});
  buildFacet("#ramSpeedRow","#ramSpeedWrap",rbase,r=>r.speed,ramSpeed,v=>{ramSpeed=v;renderSpares();},byNumDesc);
  let rams=rbase.filter(r=>(!ramGen||r.ram_type==ramGen)&&(!ramBrand||r.brand==ramBrand)&&(!ramSpeed||r.speed==ramSpeed));
  $("#why3").innerHTML=`<div class="why">Chassis <b>${selCh.family}</b> uses <b>${rt||"?"}</b> → ${rbase.length} modules.</div>`;
  $("#ramCount").textContent=rams.length+" RAM modules";
  const RL=$("#ramList");RL.innerHTML="";
  if(!rams.length)RL.appendChild(el("div","empty","No modules match these filters."));
  rams.slice(0,150).forEach(r=>RL.appendChild(el("div","row",
    `<div class="t"><span>${r.capacity} ${r.brand}</span><span class="badge ram">${r.ram_type}${r.speed?" · "+r.speed:""}</span></div>
     <div class="m"><span>${r.name}</span>${condBadges(r)}</div>`)));

  // ---- Step 4 · Storage ----
  let sbase=DB.storage.filter(s=>s.needs_review=="no"&&(!ffs.length||ffs.includes(s.ff)));
  buildFacet("#stTypeRow","#stTypeWrap",sbase,s=>s.type,stType,v=>{stType=v;renderSpares();});
  buildFacet("#stBrandRow","#stBrandWrap",sbase,s=>s.brand,stBrand,v=>{stBrand=v;renderSpares();});
  buildFacet("#stSpeedRow","#stSpeedWrap",sbase,s=>s.speed,stSpeed,v=>{stSpeed=v;renderSpares();},byNumDesc);
  let sts=sbase.filter(s=>(!stType||s.type==stType)&&(!stBrand||s.brand==stBrand)&&(!stSpeed||s.speed==stSpeed));
  $("#why4").innerHTML=`<div class="why">Chassis bays <b>${ffs.join(", ")||"any"}</b> → ${sbase.length} drives${ffs.length?"":" (no bay data — showing all)"}.</div>`;
  $("#stCount").textContent=sts.length+" drives";
  const TL=$("#stList");TL.innerHTML="";
  if(!sts.length)TL.appendChild(el("div","empty","No drives match these filters."));
  sts.slice(0,150).forEach(s=>TL.appendChild(el("div","row",
    `<div class="t"><span>${s.capacity} ${s.type} · ${s.brand}</span>
       <span class="badge ff">${s.ff||"?"}</span></div>
     <div class="m">${s.interface?`<span class="badge">${s.interface}</span>`:""}${s.speed?`<span class="badge">${s.speed}</span>`:""}${condBadges(s)}</div>`)));
}
// matrix / coverage
function tallyArr(rows,keyFn){const m={};rows.forEach(r=>{let k=keyFn(r);
  (Array.isArray(k)?k:[k]).forEach(x=>{x=(x===""||x==null)?"(none)":x;m[x]=(m[x]||0)+1;});});
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);}
function card(title,entries,color){
  const max=Math.max(1,...entries.map(e=>e[1]));
  const body=entries.map(([k,v])=>`<tr><td><b>${k}</b></td><td style="white-space:nowrap">${v} <span class="bar" style="width:${Math.max(4,120*v/max)}px;background:${color||'var(--red)'}"></span></td></tr>`).join("");
  return `<div class="matrix"><h2 style="font-size:14px;margin-bottom:8px">${title}</h2><table>${body}</table></div>`;
}
function renderMatrix(){
  const m=$("#matrix");
  const ch=DB.chassis.filter(c=>c.needs_review=="no");
  const ram=DB.ram.filter(r=>r.needs_review=="no");
  const st=DB.storage.filter(s=>s.needs_review=="no");
  // CPU vs chassis by socket (full width)
  const max=Math.max(1,...S.sockets.map(s=>Math.max(S.sock_cpu[s]||0,S.sock_chassis[s]||0)));
  const srows=S.sockets.map(s=>{const cp=S.sock_cpu[s]||0,cc=S.sock_chassis[s]||0;
    const gap=cc>0&&cp==0?' style="color:#b91c1c"':'';
    return `<tr${gap}><td><b>${s}</b></td>
      <td>${cp} <span class="bar" style="width:${120*cp/max}px"></span></td>
      <td>${cc} <span class="bar" style="width:${120*cc/max}px;background:#3730a3"></span></td>
      <td>${cc>0&&cp==0?'⚠ chassis with no CPUs':'✓'}</td></tr>`;}).join("");
  const sockCard=`<div class="matrix full"><h2 style="font-size:15px;margin-bottom:8px">CPU ↔ Chassis — by socket</h2>
    <table><tr><th>Socket</th><th>Server CPUs</th><th>Chassis models</th><th>Status</th></tr>${srows}</table>
    <p class="sub" style="margin-top:6px">A CPU lists a chassis when sockets match. Red = chassis with no compatible CPU in stock.</p></div>`;
  const ffSplit=c=>{const a=(c.ff||"").split(";").filter(Boolean);return a.length?a:"(none)";};
  m.innerHTML = sockCard + `<div class="cards">` + [
    card("Chassis — by brand",            tallyArr(ch,c=>c.brand),       "#3730a3"),
    card("Chassis — by RAM type",         tallyArr(ch,c=>c.ram_type),    "#065f46"),
    card("Chassis — by drive form factor",tallyArr(ch,ffSplit),          "#9a3412"),
    card("RAM — by generation",           tallyArr(ram,r=>r.ram_type),   "#065f46"),
    card("RAM — by speed (MT/s)",         tallyArr(ram,r=>r.speed),      "#16a34a"),
    card("Storage — by type (HDD/SSD/NVMe)",tallyArr(st,s=>s.type),      "#9a3412"),
    card("Storage — by form factor",      tallyArr(st,s=>s.ff),          "#d97706"),
    card("Storage — by interface",        tallyArr(st,s=>s.interface),   "#b45309"),
  ].join("") + `</div>`;
}
// events
document.querySelectorAll(".chip[data-v]").forEach(ch=>ch.onclick=()=>{
  document.querySelectorAll(".chip[data-v]").forEach(x=>x.classList.remove("on"));
  ch.classList.add("on");vfilter=ch.dataset.v;selFam=null;selSer=null;selCores=null;selCpu=null;syncStep1();});
$("#cpuSearch").oninput=()=>{renderFacets();renderCpus();};
$("#showAllCpu").onchange=()=>{selFam=null;selSer=null;selCores=null;selCpu=null;syncStep1();};
$("#famBack").onclick=()=>{selFam=null;selSer=null;selCores=null;selCpu=null;syncStep1();};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("on"));t.classList.add("on");
  const f=t.dataset.tab=="flow";$("#flow").style.display=f?"":"none";$("#matrix").style.display=f?"none":"";});
renderFacets();renderCpus();renderChassis();renderSpares();renderMatrix();
</script></body></html>"""

html = HTML.replace("__DATA__", DATA)
out = os.path.join(OUT, "compatibility-explorer.html")
open(out,"w",encoding="utf-8").write(html)
print("wrote", out, "(%d KB)" % (len(html)//1024))
