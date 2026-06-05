# -*- coding: utf-8 -*-
"""Build the correlation (compatibility) dataset for the Sheeltron configurator.

Reads the spares CSVs in docs/ and the chassis stock CSV in Configurator/Corelation/,
derives compatibility attributes (CPU socket, chassis socket/ram_type/form-factors,
RAM ddr-gen, storage interface/form-factor) and writes enriched catalogs the wizard
can join on at runtime.
"""
import csv, os, re, glob

# Paths resolve relative to this script so the pipeline is portable.
# Layout: <repo>/Configurator/Corelation/scripts/build_corr.py
_HERE = os.path.dirname(os.path.abspath(__file__))
OUT   = os.path.dirname(_HERE)                       # .../Configurator/Corelation
_REPO = os.path.dirname(os.path.dirname(OUT))        # .../<repo root>
DOCS  = os.path.join(_REPO, "docs")                  # legacy spares (not read by build)
def stock_file(prefix):
    """Find the actual-stock CSV by prefix (e.g. 'processor-stock-')."""
    hits = glob.glob(os.path.join(OUT, prefix + "*.csv"))
    if not hits: raise FileNotFoundError(prefix)
    return sorted(hits)[-1]
def g(row, *names):
    """Get the first present column (case/space tolerant)."""
    norm = {re.sub(r'[^a-z0-9]','',k.lower()): v for k,v in row.items()}
    for n in names:
        v = norm.get(re.sub(r'[^a-z0-9]','',n.lower()))
        if v is not None: return v.strip()
    return ""

KNOWN_SOCKETS = {"LGA1366","LGA1356","LGA2011","LGA2011-3","LGA3647","LGA4189",
                 "LGA4677","LGA1150","LGA1151","LGA1700","SP3","SP5","SP6",
                 "sWRX8","AM4","AM5","LGA1567","LGA771"}

# ----------------------------------------------------------------------------
# CPU socket derivation
# ----------------------------------------------------------------------------
def derive_cpu_socket(family, series, model):
    """Return (socket, server_bool, needs_review_bool, note)."""
    m = model.upper().replace("®","").replace("™","").replace("INTEL","").replace("AMD","")
    m = re.sub(r"\s+"," ",m).strip()
    fam = (family or "").upper()

    # ---- AMD ----
    if "EPYC" in fam or "RYZEN" in fam or "THREADRIPPER" in fam or "EPYC" in m or "RYZEN" in m:
        if "THREADRIPPER" in model.upper() or re.search(r"\b\d{4}WX\b", m):
            return "sWRX8", False, True, "Threadripper PRO / workstation - not a server socket"
        if "RYZEN" in model.upper():
            return "AM5", False, True, "Ryzen desktop - not a server socket"
        # EPYC by generation number
        mo = re.search(r"\bEPYC\s*([0-9])([0-9B-Z])", m) or re.search(r"\b([0-9])([0-9B-Z])\d{2}", m)
        epyc_num = re.search(r"\b(\d)(\d|[A-Z])\d{2}[A-Z]*\b", m)
        if re.search(r"\b9[0-9B-Z]\d{2}", m):   # 9xxx / 9Bxx
            return "SP5", True, False, "AMD EPYC 9000 (Genoa/Bergamo/Turin)"
        if re.search(r"\b8[0-9]\d{2}", m):       # 8xxx
            return "SP6", True, False, "AMD EPYC 8000 (Siena)"
        if re.search(r"\b7[0-9B-Z]\d{1,2}[A-Z]*", m) or re.search(r"\b7[0-9]F\d", m):
            return "SP3", True, False, "AMD EPYC 7000 (Naples/Rome/Milan)"
        return "", True, True, "AMD EPYC - generation unresolved"

    # ---- Intel ----
    # Xeon Scalable: detect a 4-digit number whose 2nd digit is the generation.
    sc = re.search(r"\b([3-8])([1-5])(\d{2})[A-Z]*\b", m)
    is_scalable = ("SCALABLE" in fam or "GOLD" in (series or "").upper() or
                   "SILVER" in (series or "").upper() or "PLATINUM" in (series or "").upper() or
                   "BRONZE" in (series or "").upper() or
                   bool(re.search(r"\b(GOLD|SILVER|PLATINUM|BRONZE)\b", model.upper())))
    # bare Xeon 6336Y / 6348H style (Scalable without level word)
    bare_scalable = bool(re.match(r"^[ ]*([3-8])([1-5])\d{2}[A-Z]*$", m)) or bool(re.search(r"\b6[0-9]\d{2}[HY]\b", m))
    if (is_scalable or bare_scalable) and sc:
        gen = sc.group(2)
        if gen in ("1","2"): return "LGA3647", True, False, "Xeon Scalable Gen1/2 (Skylake/Cascade Lake)"
        if gen == "3":       return "LGA4189", True, False, "Xeon Scalable Gen3 (Ice Lake/Cooper Lake)"
        if gen in ("4","5"): return "LGA4677", True, False, "Xeon Scalable Gen4/5 (Sapphire/Emerald Rapids)"

    # Xeon E5-2600/4600 legacy by version
    ser = (series or "").upper()
    if "E5" in ser or re.search(r"\bE5-?\d{4}", model.upper()):
        if "V3" in ser or "V4" in ser or re.search(r"V[34]\b", model.upper()):
            return "LGA2011-3", True, False, "Xeon E5 v3/v4 (Haswell/Broadwell-EP)"
        if "V2" in ser or re.search(r"V2\b", model.upper()):
            return "LGA2011", True, False, "Xeon E5 v2 (Ivy Bridge-EP)"
        # plain E5-26xx (v1) vs old E55xx/E56xx (Nehalem/Westmere LGA1366)
        if re.search(r"E5-?2[0-9]{3}", model.upper()):
            return "LGA2011", True, False, "Xeon E5-2600 v1 (Sandy Bridge-EP)"
        if re.search(r"E5[5-6]\d{2}", model.upper()):
            return "LGA1366", False, True, "Xeon 5500/5600 (Nehalem/Westmere-EP) - legacy"
        return "LGA2011", True, True, "Xeon E5 - version unresolved"

    # Older / desktop / entry families -> keep but flag non-server
    if re.search(r"\bX5[5-6]\d{2}\b", model.upper()) or re.search(r"\bX3[34]\d{2}\b", model.upper()):
        return "LGA1366", False, True, "Xeon X55xx/X56xx (Westmere) or X34xx - legacy"
    if re.search(r"\bL[57]\d{3}\b", model.upper()):
        return "LGA1366", False, True, "Xeon L-series legacy"
    if re.search(r"\bE-2[13]\d{2}", model.upper()):
        return "LGA1151", False, True, "Xeon E-21xx/23xx entry (LGA1151)"
    if "E3" in ser:
        return "LGA1151", False, True, "Xeon E3 entry workstation"
    if re.search(r"\bW-?2\d{3}", model.upper()) or "XEON W" in ser:
        return "LGA2066", False, True, "Xeon W workstation"
    if re.search(r"E7\d{3}", model.upper()) or "E7" in ser:
        return "LGA1567", False, True, "Xeon 7x00 (Nehalem/Westmere-EX) legacy"
    if "CORE I" in ser or "PENTIUM" in ser or "CELERON" in ser or "CORE I" in fam:
        return "", False, True, "Desktop CPU - not a server part"
    if re.search(r"E5[34]\d{2}", model.upper()):
        return "LGA771", False, True, "Xeon 5400/5300 (Harpertown) very old"

    return "", False, True, "unresolved"


# ----------------------------------------------------------------------------
# Chassis attribute derivation (socket / ram_type / form factors)
# ----------------------------------------------------------------------------
def drive_form_factors(model):
    u = model.upper()
    ff = set()
    if "SFF" in u: ff.add('2.5" SFF')
    if "LFF" in u: ff.add('3.5" LFF')
    # bay tokens like 8SFF/12LFF already covered; default unknown -> empty
    return ";".join(sorted(ff))

def derive_chassis(brand, model):
    """Return dict(socket, max_sockets, ram_type, server, needs_review, note)."""
    u = model.upper()
    u = re.sub(r"\bG(\d{1,2})\b", r"GEN\1", u)          # "G10 PLUS" -> "GEN10 PLUS"
    u = re.sub(r"POWEREDGE\s+(\d{3})", r"R\1", u)       # "POWEREDGE 430" -> "R430"
    b = (brand or "").upper()
    def R(socket, maxs, ram, note, nr=False, server=True):
        return dict(cpu_socket=socket, max_sockets=maxs, ram_type=ram,
                    needs_review=nr, server=server, note=note)

    # ---------- HPE ----------
    if b == "HPE":
        if "GEN11" in u or "GEN 11" in u:
            if any(k in u for k in ["DL385","DL325","DL365","DL345"]):
                return R("SP5",2,"DDR5","HPE EPYC Gen11")
            return R("LGA4677",2,"DDR5","HPE Intel Gen11")
        if "GEN10 PLUS" in u or "GEN 10 PLUS" in u:
            if any(k in u for k in ["DL385","DL325","DL365","DL345"]):
                return R("SP3",2,"DDR4","HPE EPYC Gen10 Plus")
            return R("LGA4189",2,"DDR4","HPE Intel Gen10 Plus (Ice Lake)")
        if "GEN10" in u or "GEN 10" in u:
            if any(k in u for k in ["DL385","DL325","DL365","DL345"]):
                return R("SP3",2,"DDR4","HPE EPYC Gen10")
            return R("LGA3647",2,"DDR4","HPE Intel Gen10 (Skylake/Cascade)")
        if "GEN9" in u or "GEN 9" in u:
            return R("LGA2011-3",2,"DDR4","HPE Gen9 (E5 v3/v4)")
        if "GEN8" in u or "GEN 8" in u:
            return R("LGA2011",2,"DDR3","HPE Gen8 (E5 v1/v2)")
        if "STORE EASY 1650" in u:
            return R("LGA2011-3",2,"DDR4","HPE StoreEasy 1650 (Gen9-based)")
    # ---------- DELL ----------
    if b == "DELL":
        if "R7525" in u or "R7515" in u or "R6515" in u or "R6525" in u:
            return R("SP3",2,"DDR4","Dell EPYC Rome/Milan")
        if "R7425" in u or "R7415" in u or "R6415" in u:
            return R("SP3",2,"DDR4","Dell EPYC Naples/Rome")
        if "R6615" in u or "R6625" in u or "R7615" in u or "R7625" in u:
            return R("SP5",2,"DDR5","Dell EPYC Genoa")
        if re.search(r"R[67]6\d", u):  # R660/R760
            return R("LGA4677",2,"DDR5","Dell 16G (Sapphire Rapids)")
        if "R840" in u or "R940" in u:
            return R("LGA3647",4,"DDR4","Dell 14G 4-socket (Skylake/Cascade)")
        if "R750" in u or "R650" in u or "R550" in u or "R450" in u:
            return R("LGA4189",2,"DDR4","Dell 15G (Ice Lake)")
        if "R740" in u or "R640" in u or "R540" in u or "R440" in u or "NX3240" in u:
            return R("LGA3647",2,"DDR4","Dell 14G (Skylake/Cascade)")
        if "R730" in u or "R630" in u or "R430" in u or "R530" in u or "R830" in u or "R930" in u or "NX3230" in u or " 730" in u or " 730XD" in u:
            return R("LGA2011-3",2,"DDR4","Dell 13G (E5 v3/v4)")
        if "R820" in u or "R920" in u:
            return R("LGA2011",4,"DDR3","Dell 12G 4-socket (E5-4600 v1/v2)")
        if "R720" in u or "R620" in u or "R520" in u:
            return R("LGA2011",2,"DDR3","Dell 12G (E5 v1/v2)")
        if "R420" in u or "R320" in u:
            return R("LGA1356",2,"DDR3","Dell 12G entry (E5-2400)")
        if "R350" in u or "R340" in u or "R250" in u or "R240" in u or "R230" in u or "R330" in u:
            return R("LGA1151",1,"DDR4","Dell entry tower (Xeon E)")
        if "E33S" in u or "E10S" in u:
            return R("",1,"","Dell Edge/embedded - verify",nr=True,server=False)
    # ---------- INSPUR ----------
    if b == "INSPUR":
        if "M6" in u: return R("LGA4189",2,"DDR4","Inspur M6 (Ice Lake)")
        if "M5" in u: return R("LGA3647",2,"DDR4","Inspur M5 (Skylake/Cascade)")
        if "M4" in u: return R("LGA2011-3",2,"DDR4","Inspur M4 (E5 v3/v4)")
    # ---------- GIGABYTE ----------
    if b == "GIGABYTE":
        if "Z20" in u or "Z21" in u or "Z12" in u or "MZ12" in u or "Z52" in u:
            if "Z52" in u: return R("SP5",2,"DDR5","Gigabyte EPYC Genoa")
            return R("SP3",2,"DDR4","Gigabyte EPYC Rome/Milan")
        if "N81" in u or "N8" in u: return R("LGA4189",2,"DDR4","Gigabyte N8x (Ice Lake)")
        if "HYVE" in u: return R("",2,"","Gigabyte Hyve Edge - verify",nr=True,server=False)
    # ---------- ASUS ----------
    if b == "ASUS":
        if "ESC4000A-E10" in u or "E10" in u: return R("SP3",2,"DDR4","ASUS A-series EPYC Rome/Milan")
        if "ASSEMBLED" in u: return R("",1,"","ASUS assembled - unknown",nr=True,server=False)
    # ---------- CISCO ----------
    if b == "CISCO":
        if "M4" in u: return R("LGA2011-3",2,"DDR4","Cisco UCS M4 (E5 v3/v4)")
        if "M5" in u: return R("LGA3647",2,"DDR4","Cisco UCS M5")
    # ---------- FUJITSU ----------
    if b.startswith("FUJ"):
        if "M1" in u or "RX2540 M1" in u: return R("LGA2011-3",2,"DDR4","Fujitsu RX2540 M1 (E5 v3)")
    # ---------- LENOVO ----------
    if b == "LENOVO":
        if "HR630" in u: return R("LGA3647",2,"DDR4","Lenovo HR630X (Scalable)")
        if "METRO" in u: return R("",2,"","Lenovo Metro - verify",nr=True,server=False)
    # ---------- QUANTA / QUAUNTA / Hitachi ----------
    if b.startswith("QUA") or "HITACHI" in u:
        if "DS220" in u or "DS120" in u or "T42S" in u or "T4TS" in u or "T41S" in u:
            return R("LGA3647",2,"DDR4","Quanta cloud (Scalable Gen1/2)")

    return R("",2,"","brand/model not in derivation table",nr=True,server=False)

def model_family(brand, model):
    u = model.upper()
    u = re.sub(r"\b\d{1,2}\s?(SFF|LFF)\b","",u)        # drop bay counts
    u = u.replace("PROLIANT","").replace("POWEREDGE","")
    u = re.sub(r"[^A-Z0-9 ]"," ",u)
    u = re.sub(r"\s+"," ",u).strip()
    return u

# Datasheet index ------------------------------------------------------------
DS_ROOT = os.path.join(_REPO, "Servers Data Sheet", "Servers Data Sheet")
def index_datasheets():
    out = []
    for root,_,files in os.walk(DS_ROOT):
        for f in files:
            if f.lower().endswith(".pdf"):
                folder = os.path.basename(root).upper()
                nf = re.sub(r"[^a-z0-9]","", f.lower())
                out.append((folder, re.sub(r"[^a-z0-9]","",os.path.join(folder,f).lower()) and folder, f, nf))
    # (brand_folder, original_filename, normalized_filename)
    return [(folder, f, nf) for (folder,_b,f,nf) in out]
DS = index_datasheets()

BRAND_FOLDER = {"FUJITSU":"FUJJITSU","QUAUNTA":"QUANTA"}
def _primary_token(model):
    m = model.upper()
    pats = [r"DL\d+[A-Z]*", r"RX\d+", r"NX\d+", r"ESC\d+[A-Z]?-?E?\d*",
            r"UCSC?-?C\d+[A-Z]*", r"DS\d+", r"NF\d+", r"SA\d+[A-Z]?\d*",
            r"[A-Z]\d{3}-[A-Z]\d{2}", r"R\d{3,4}[A-Z]*", r"PRIMERGY\s*RX\d+"]
    for p in pats:
        mo = re.search(p, m)
        if mo: return re.sub(r"[^a-z0-9]","", mo.group(0).lower())
    return ""

def match_datasheet(brand, model):
    folder = BRAND_FOLDER.get((brand or "").upper(), (brand or "").upper())
    prim = _primary_token(model)
    if not prim: return ""
    sec = [re.sub(r"[^a-z0-9]","",t.lower())
           for t in re.findall(r"GEN\d+|G\d+|PLUS|V\d|M\d", model.upper())]
    mnorm = re.sub(r"[^a-z0-9]","", model.lower())
    model_plus = "plus" in mnorm
    gen_mo = re.search(r"GEN\d+", model.upper())
    model_gen = gen_mo.group(0).lower() if gen_mo else ""
    best, best_score = "", -1
    for f_folder, fname, nf in DS:
        if f_folder != folder: continue
        if prim not in nf: continue
        if ("plus" in nf) != model_plus:          # hard filter: Plus must match (socket differs)
            continue
        if model_gen and model_gen not in nf:     # hard filter: same generation
            continue
        score = 10
        if "v2" in mnorm and "v2" in nf: score += 3
        if ("v2" in nf) != ("v2" in mnorm): score -= 1
        if "xd" in nf and "xd" not in mnorm: score -= 1
        score -= len(nf) * 0.01                    # tiebreak: prefer closer filename
        if score > best_score:
            best_score, best = score, os.path.join(f_folder, fname)
    return best

# ============================================================================
# 1. CPUs + socket_map
# ============================================================================
def build_cpus():
    src = stock_file("processor-stock-")
    rows = []
    with open(src, encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            model = g(r, "MODEL")
            if not model: continue
            family, series = g(r,"FAMILY"), g(r,"SERIES")
            socket, server, nr, note = derive_cpu_socket(family, series, model)
            rows.append(dict(
                stock_id=g(r,"ID"),
                brand=g(r,"BRAND"), family=family, series=series, model=model,
                cores=g(r,"CORES"), threads=g(r,"TOTAL THREADS"),
                base_ghz=g(r,"BASE FREQUENCY"), turbo_ghz=g(r,"MAX TURBO FREQUENCY"),
                cache=g(r,"CACHE MEMORY"),
                condition_new=g(r,"CONDITION NEW") or "no",
                condition_refurbished=g(r,"CONDITION REFURBISHED") or "no",
                socket=socket, is_server="yes" if server else "no",
                needs_review="yes" if nr else "no", socket_note=note))
    with open(os.path.join(OUT,"cpus.csv"),"w",encoding="utf-8",newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    return rows

# ============================================================================
# 2. Chassis
# ============================================================================
def build_chassis():
    src = stock_file("chassis-stock-")
    rows = []
    with open(src, encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            brand = g(r,"BRAND")
            model = g(r,"MODEL")
            if not model: continue
            d = derive_chassis(brand, model)
            ff = drive_form_factors(model)
            ds = match_datasheet(brand, model)
            rows.append(dict(
                stock_id=g(r,"ID"),
                brand=brand, model=model, model_family=model_family(brand,model),
                cpu_socket=d["cpu_socket"], max_sockets=d["max_sockets"],
                ram_type=d["ram_type"], drive_form_factors=ff,
                condition_new=g(r,"CONDITION NEW") or "no",
                condition_refurbished=g(r,"CONDITION REFURBISHED") or "no",
                datasheet=ds or "none",
                source=("derived" if not d["needs_review"] else "manual"),
                is_server="yes" if d["server"] else "no",
                needs_review="yes" if (d["needs_review"] or not d["cpu_socket"]) else "no",
                note=d["note"]))
    with open(os.path.join(OUT,"chassis.csv"),"w",encoding="utf-8",newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    return rows

# ============================================================================
# 3. RAM
# ============================================================================
def build_ram():
    src = stock_file("memory-stock-")
    rows = []
    with open(src, encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            gen = g(r,"GENERATION").upper()
            rows.append(dict(
                stock_id=g(r,"ID"),
                brand=g(r,"MEMORY BRAND","BRAND"),
                capacity=g(r,"CAPACITY"),
                ram_type=gen, rank=g(r,"RANK"),
                condition_new=g(r,"CONDITION NEW") or "no",
                condition_refurbished=g(r,"CONDITION REFURBISHED") or "no",
                product_name=g(r,"PRODUCT NAME"),
                needs_review="no" if gen in ("DDR2","DDR3","DDR4","DDR5") else "yes"))
    with open(os.path.join(OUT,"ram.csv"),"w",encoding="utf-8",newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    return rows

# ============================================================================
# 4. Storage (HDD + SSD merged)
# ============================================================================
def norm_ff(s):
    s = (s or "").upper()
    if "2.5" in s or "SFF" in s: return '2.5" SFF'
    if "3.5" in s or "LFF" in s: return '3.5" LFF'
    return ""
def norm_iface(s, name=""):
    s = (s or "").upper(); name = (name or "").upper()
    for tok in ("NVME","SAS","SATA"):
        if tok in s or tok in name: return tok.replace("NVME","NVMe")
    return ""
def build_storage():
    rows = []
    for kind,prefix,brandcol in [("HDD","hdd-stock-","HDD BRAND"),
                                 ("SSD","ssd-stock-","SSD BRAND")]:
        with open(stock_file(prefix), encoding="utf-8-sig", newline="") as fh:
            for r in csv.DictReader(fh):
                name = g(r,"PRODUCT NAME")
                ff = norm_ff(g(r,"FORM FACTOR")) or norm_ff(name)
                iface = norm_iface(g(r,"INTERFACE"), name)
                rows.append(dict(
                    stock_id=g(r,"ID"), kind=kind, brand=g(r,brandcol,"BRAND"),
                    interface=iface, capacity=g(r,"CAPACITY"),
                    form_factor=ff, speed=g(r,"SPEED"),
                    rpm=g(r,"RPM SPEED") if kind=="HDD" else "",
                    condition_new=g(r,"CONDITION NEW") or "no",
                    condition_refurbished=g(r,"CONDITION REFURBISHED") or "no",
                    product_name=name,
                    needs_review="no" if (ff and iface) else "yes"))
    with open(os.path.join(OUT,"storage.csv"),"w",encoding="utf-8",newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    return rows

def write_socket_map():
    """Reference rule table documenting how CPU socket is derived."""
    ref = [
        ("AMD","EPYC 7000 / 7xFx / 7Bxx / 7Cxx / 7Rxx / 7Hxx / 7Kxx","SP3","DDR4","Naples/Rome/Milan, 1-2P server"),
        ("AMD","EPYC 8xxx","SP6","DDR5","Siena, edge/1P server"),
        ("AMD","EPYC 9xxx / 9Bxx","SP5","DDR5","Genoa/Bergamo/Turin, 1-2P server"),
        ("AMD","Threadripper PRO / xxxxWX","sWRX8","DDR4","workstation - NOT a server (excluded)"),
        ("AMD","Ryzen","AM4/AM5","DDR4/5","desktop - NOT a server (excluded)"),
        ("Intel","Xeon Scalable x1xx/x2xx (2nd digit 1-2)","LGA3647","DDR4","Gen1/2 Skylake/Cascade Lake"),
        ("Intel","Xeon Scalable x3xx (2nd digit 3)","LGA4189","DDR4","Gen3 Ice Lake / Cooper Lake"),
        ("Intel","Xeon Scalable x4xx/x5xx (2nd digit 4-5)","LGA4677","DDR5","Gen4/5 Sapphire/Emerald Rapids"),
        ("Intel","Xeon E5-26xx v3/v4","LGA2011-3","DDR4","Haswell/Broadwell-EP"),
        ("Intel","Xeon E5-26xx v1/v2","LGA2011","DDR3","Sandy/Ivy Bridge-EP"),
        ("Intel","Xeon E5-46xx (4P)","LGA2011","DDR3","4-socket EP"),
        ("Intel","Xeon 55xx/56xx, X55xx/X56xx","LGA1366","DDR3","Nehalem/Westmere-EP legacy (review)"),
        ("Intel","Xeon E-21xx/23xx, E3 v5/v6","LGA1151","DDR4","entry 1P server (review)"),
        ("Intel","Xeon E7 x8xx / 75xx","LGA1567/2011","DDR3/4","EX 4-8P legacy (review)"),
        ("Intel","Xeon W-2xxx","LGA2066","DDR4","workstation (review)"),
        ("Intel","Core i / Pentium / Celeron","(none)","-","desktop - NOT a server (excluded)"),
    ]
    with open(os.path.join(OUT,"socket_map.csv"),"w",encoding="utf-8",newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["vendor","family_or_pattern","socket","typical_ram","note"])
        w.writerows(ref)

if __name__ == "__main__":
    write_socket_map()
    cpus = build_cpus()
    chassis = build_chassis()
    ram = build_ram()
    storage = build_storage()

    # ---- coverage report ----
    def pct(n,d): return f"{100*n//d if d else 0}%"
    cpu_ok = sum(1 for c in cpus if c["needs_review"]=="no")
    cpu_srv = sum(1 for c in cpus if c["is_server"]=="yes")
    ch_ok = sum(1 for c in chassis if c["needs_review"]=="no")
    print("=== CPUS ===")
    print(f"unique cpus: {len(cpus)}  | server: {cpu_srv}  | confident socket: {cpu_ok} ({pct(cpu_ok,len(cpus))})")
    from collections import Counter
    print(" socket dist:", dict(Counter(c['socket'] or '(none)' for c in cpus)))
    print("=== CHASSIS ===")
    print(f"chassis rows: {len(chassis)}  | confident: {ch_ok} ({pct(ch_ok,len(chassis))})  | needs_review: {len(chassis)-ch_ok}")
    print(" socket dist:", dict(Counter(c['cpu_socket'] or '(none)' for c in chassis)))
    print(" ram dist:", dict(Counter(c['ram_type'] or '(none)' for c in chassis)))
    matched = sum(1 for c in chassis if c['datasheet']!='none')
    print(f" datasheet matched: {matched}/{len(chassis)}")
    print("=== RAM ===")
    print(f"ram rows: {len(ram)}  | ", dict(Counter(r['ram_type'] for r in ram)))
    print("=== STORAGE ===")
    print(f"storage rows: {len(storage)}  | ", dict(Counter(s['interface'] or '(none)' for s in storage)),
          dict(Counter(s['form_factor'] or '(none)' for s in storage)))
    print("=== chassis needing review ===")
    for c in chassis:
        if c["needs_review"]=="yes":
            print(f"  [{c['stock_id']}] {c['brand']} {c['model']}  -> {c['note']}")
