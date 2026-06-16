import { useEffect, useMemo, useState, useRef } from "react";
import html2canvas from "html2canvas";
import { supabase } from "./supabaseClient";

// ── Same food DB as original ─────────────────────────────────────────────────
const FOOD_DB = {
  Protein: {
    tofu:          { name: "Tofu",                         kcal: 140, protein: 16,  carbs: 3,    fat: 9    },
    seitan:        { name: "Seitan",                       kcal: 130, protein: 34,  carbs: 4.5,  fat: 6.5  },
    nooch:         { name: "Nooch",                        kcal: 400, protein: 50,  carbs: 35,   fat: 5    },
    lentils:       { name: "Lentils (cooked)",             kcal: 115, protein: 9,   carbs: 20,   fat: 0.4  },
    Wbeans:        { name: "White beans in tomato sauce",  kcal: 100, protein: 7,   carbs: 16,   fat: 0.5  },
    favaBeans:     { name: "Fava Beans (cooked)",          kcal: 110, protein: 7.6, carbs: 19.7, fat: 0.4  },
    Bbeans:        { name: "Black beans",                  kcal: 115, protein: 8,   carbs: 18,   fat: 0.5  },
    proteinpowder: { name: "Protein powder",               kcal: 423, protein: 77,  carbs: 12,   fat: 8    },
  },
  Carbs: {
    rice:       { name: "White rice",      kcal: 130, protein: 2.5, carbs: 28, fat: 0.3  },
    pasta:      { name: "Durum pasta",     kcal: 150, protein: 5,   carbs: 30, fat: 1    },
    soupalmonds:{ name: "Osem almonds",    kcal: 530, protein: 9,   carbs: 65, fat: 24   },
    peasoup:    { name: "Pea soup",        kcal: 85,  protein: 6,   carbs: 14, fat: 0.45 },
    oats:       { name: "Oats",            kcal: 389, protein: 17,  carbs: 66, fat: 7    },
    potatoes:   { name: "Potatoes",        kcal: 80,  protein: 2,   carbs: 18, fat: 0    },
    Oiledpopcorn:    { name: "Oil Popcorn",  kcal: 652, protein: 11,  carbs: 78, fat: 34   },
    MicrodPopcorn:  { name: "MicroPopcorn",  kcal: 387, protein: 13,   carbs: 78, fat: 4.5   },

    datesyrup:  { name: "Date syrup",      kcal: 300, protein: 0,   carbs: 80, fat: 0    },
    VanillaPudding:   { name: "VanillaPuddingPowder",  kcal: 364,  protein: 0,   carbs: 91, fat: 0    },
    ChocoPudding:   { name: "ChocPuddingPowder",   kcal: 359,  protein: 3.3,   carbs: 83, fat: 1.5    },
  },
  Fats: {
    tahini:      { name: "Tahini",        kcal: 600, protein: 17, carbs: 21, fat: 53  },
    oliveoil:    { name: "Olive oil",     kcal: 884, protein: 0,  carbs: 0,  fat: 100 },
    hummus:      { name: "Hummus",        kcal: 220, protein: 7,  carbs: 16, fat: 14  },
    peanutbutter:{ name: "Peanut butter", kcal: 590, protein: 25, carbs: 20, fat: 50  },
  },
  Veg: {
    tomato:     { name: "Tomato",      kcal: 18, protein: 0.9, carbs: 4,   fat: 0 },
    cucumber:   { name: "Cucumber",    kcal: 15, protein: 0.7, carbs: 3,   fat: 0 },
    cabbage:    { name: "Cabbage",     kcal: 25, protein: 1.2, carbs: 6,   fat: 0 },
    zucchini:   { name: "Zucchini",    kcal: 17, protein: 1.2, carbs: 3,   fat: 0 },
    onion:      { name: "Onion",       kcal: 40, protein: 1.1, carbs: 9,   fat: 0 },
    bellPepper: { name: "Bell Pepper", kcal: 26, protein: 1,   carbs: 6,   fat: 0 },
    Sauerkraut: { name: "Sauerkraut",  kcal: 19, protein: 0.9, carbs: 4.3, fat: 0 },
    greenChilli:{ name: "Green Chili", kcal: 40, protein: 2,   carbs: 9,   fat: 0 },
  },
  Flavor: {
    ketchup: { name: "Ketchup", kcal: 100, protein: 0, carbs: 5, fat: 0 },
    Chilli:  { name: "Chilli",  kcal: 87, protein: 0, carbs: 21.8, fat: 0 },
    amba:    { name: "Amba",    kcal: 25,  protein: 0, carbs: 6, fat: 0 },
    schug:   { name: "Schug",   kcal: 10,  protein: 0, carbs: 2, fat: 0 },
  },
  Beverages: {
    JohnnyWalkerRed: { name: "Johnnie Walker Red", kcal: 234, protein: 0, carbs: 0, fat: 0 },
  },
  Oils: {
    CanolaOil: { name: "Canola Oil", kcal: 884, protein: 0, carbs: 0, fat: 100 },
  },
};

const STORAGE_KEY = "macro_v9";
const BW_KEY      = "macro_bw_v1";
// dev-only: on localhost `npm run dev`, skip the magic-link login and work
// from localStorage only (never touches the Supabase cloud row). Always false
// in the production build that goes to Netlify, so real login still required.
const DEV_NOAUTH  = import.meta.env.DEV;
const todayKey    = () => new Date().toISOString().slice(0, 10);

// ── SVG Ring ─────────────────────────────────────────────────────────────────
const R  = 38;
const CIRC = 2 * Math.PI * R;

function Ring({ value, target, color, label, unit = "g" }) {
  const pct   = target > 0 ? Math.min(value / target, 1) : 0;
  const dash  = CIRC * pct;
  const done  = value >= target;

  return (
    <div style={RS.wrap}>
      <svg width={96} height={96} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={48} cy={48} r={R} fill="none" stroke="#1a1a1a" strokeWidth={7} />
        <circle
          cx={48} cy={48} r={R} fill="none"
          stroke={done ? "#4ade80" : color}
          strokeWidth={7}
          strokeDasharray={`${dash} ${CIRC}`}
          strokeLinecap="round"
          style={{ transition:"stroke-dasharray .4s ease" }}
        />
      </svg>
      <div style={RS.inner}>
        <div style={{ ...RS.val, color: done ? "#4ade80" : "#f1f5f9" }}>{Math.round(value)}</div>
        <div style={RS.tgt}>/ {Math.round(target)}{unit}</div>
        <div style={RS.lbl}>{label}</div>
      </div>
    </div>
  );
}

const RS = {
  wrap:  { position:"relative", width:96, height:96, flexShrink:0 },
  inner: { position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" },
  val:   { fontSize:17, fontWeight:700, lineHeight:1 },
  tgt:   { fontSize:9,  color:"#475569", marginTop:1 },
  lbl:   { fontSize:9,  color:"#64748b", marginTop:2, textTransform:"uppercase", letterSpacing:"0.08em" },
};

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function sendMagicLink() {
    if (!email.trim()) return;
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080808", padding:24 }}>
      <div style={{ width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:22, fontWeight:800, letterSpacing:"0.08em", color:"#fff", marginBottom:4 }}>MACRO TRACKER</div>
        <div style={{ fontSize:12, color:"#475569", marginBottom:32 }}>Sign in to sync your data across devices</div>

        {sent ? (
          <div style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.25)", borderRadius:12, padding:"20px 18px", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:12 }}>📬</div>
            <div style={{ color:"#4ade80", fontWeight:700, marginBottom:6 }}>Check your email</div>
            <div style={{ color:"#64748b", fontSize:13 }}>Magic link sent to <strong style={{ color:"#94a3b8" }}>{email}</strong></div>
          </div>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMagicLink()}
              placeholder="your@email.com"
              style={{ width:"100%", background:"#111", border:"1px solid #252525", color:"#f1f5f9", borderRadius:10, padding:"14px 16px", fontSize:15, fontFamily:"inherit", boxSizing:"border-box", marginBottom:12, outline:"none" }}
              autoFocus
            />
            {error && <div style={{ color:"#f87171", fontSize:12, marginBottom:10 }}>{error}</div>}
            <button
              onClick={sendMagicLink}
              disabled={loading || !email.trim()}
              style={{ width:"100%", background:"#4ade80", border:"none", color:"#000", borderRadius:10, padding:"14px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.06em", opacity: loading || !email.trim() ? 0.5 : 1 }}
            >
              {loading ? "Sending…" : "Send Magic Link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function MacroTrackerV2() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080808", color:"#475569", fontSize:13 }}>
      loading…
    </div>
  );

  if (!user && !DEV_NOAUTH) return <LoginScreen />;

  return <MacroTrackerApp user={user ?? { id: "local-dev" }} />;
}

function MacroTrackerApp({ user }) {
  const [group,  setGroup]  = useState("Protein");
  const [food,   setFood]   = useState(Object.keys(FOOD_DB.Protein)[0]);
  const [grams,  setGrams]  = useState(100);

  // Custom food state
  const [customMode,    setCustomMode]    = useState(false);
  const [customName,    setCustomName]    = useState("");
  const [customKcal,    setCustomKcal]    = useState("");
  const [customGrams,   setCustomGrams]   = useState(100);
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs,   setCustomCarbs]   = useState("");
  const [customFat,     setCustomFat]     = useState("");
  const [age,    setAge]    = useState(() => Number(localStorage.getItem("macro_age"))    || 50);
  const [height, setHeight] = useState(() => Number(localStorage.getItem("macro_height")) || 183);
  const [activityName, setActivityName] = useState("");
  const [activityKcal, setActivityKcal] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [importText,   setImportText]   = useState("");
  const [importMsg,    setImportMsg]    = useState("");
  const [tab,        setTab]        = useState("today");
  const [syncing,    setSyncing]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [cutPct, setCutPct] = useState(() => Number(localStorage.getItem("macro_cut_pct")) || 0.7);
  const [editingCut, setEditingCut] = useState(false);
  const cutDeficitRef = useRef(0);
  const mbrRef        = useRef(0);

  const bodyRef      = useRef(null);
  const saveTimer    = useRef(null);
  const initialized  = useRef(false);
  // always-fresh refs so save never uses stale closure values
  const historyRef   = useRef({});
  const bwRef        = useRef(70);

  const [history, setHistory] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    const parsed = s ? JSON.parse(s) : {};
    historyRef.current = parsed;
    return parsed;
  });

  const [bodyWeight, setBodyWeight] = useState(() => {
    const bw = Number(localStorage.getItem(BW_KEY)) || 70;
    bwRef.current = bw;
    return bw;
  });

  const today = todayKey();
  const state = history[today] || { food: [], activity: [] };

  function scheduleSave() {
    if (user.id === "local-dev") return; // localStorage-only in dev preview; effects already persisted it
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSyncing(true);
      await supabase.from("macro_history").upsert({
        id: user.id,
        data: {
          history:    historyRef.current,
          bodyWeight: bwRef.current,
          cutPct:     Number(localStorage.getItem("macro_cut_pct")) || 0.7,
          age:        Number(localStorage.getItem("macro_age"))     || 50,
          height:     Number(localStorage.getItem("macro_height"))  || 183,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      setSyncing(false);
    }, 800);
  }

  // ── Load from Supabase on mount — block render until done ────────────────
  useEffect(() => {
    async function loadFromSupabase() {
      if (user.id === "local-dev") { setLoading(false); initialized.current = true; return; } // dev preview: localStorage only
      try {
        const { data, error } = await supabase
          .from("macro_history")
          .select("data")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data?.data) {
          const blob = data.data;
          // support old format (raw history object) and new format ({ history, bodyWeight, ... })
          const remote = blob.history ?? blob;
          const keys = Object.keys(remote);
          const isHistory = keys.length === 0 || keys[0].match(/^\d{4}-\d{2}-\d{2}$/);

          const remoteHistory   = isHistory ? remote : {};
          const remoteBW        = blob.bodyWeight  ?? null;
          const remoteCut       = blob.cutPct       ?? null;
          const remoteAge       = blob.age        ?? null;
          const remoteHeight    = blob.height     ?? null;

          // remote is always source of truth — local only fills days remote doesn't have
          const merged = { ...historyRef.current, ...remoteHistory };
          historyRef.current = merged;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          setHistory(merged);

          if (remoteBW)     { bwRef.current = remoteBW; localStorage.setItem(BW_KEY, remoteBW); setBodyWeight(remoteBW); }
          if (remoteCut)    { localStorage.setItem("macro_cut_pct", remoteCut); setCutPct(remoteCut); }
          if (remoteAge)    { localStorage.setItem("macro_age", remoteAge); setAge(remoteAge); }
          if (remoteHeight) { localStorage.setItem("macro_height", remoteHeight); setHeight(remoteHeight); }
        }
      } finally {
        setLoading(false);
        initialized.current = true;
      }
    }
    loadFromSupabase();
  }, []);

  // ── Sync effects — update refs then save ─────────────────────────────────
  useEffect(() => {
    historyRef.current = history;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    if (!initialized.current) return;
    scheduleSave();
  }, [history]);

  useEffect(() => {
    bwRef.current = bodyWeight;
    localStorage.setItem(BW_KEY, bodyWeight);
    if (!initialized.current) return;
    scheduleSave();
  }, [bodyWeight]);

  useEffect(() => {
    localStorage.setItem("macro_cut_pct", cutPct);
    if (!initialized.current) return;
    scheduleSave();
  }, [cutPct]);

  useEffect(() => {
    localStorage.setItem("macro_age", age);
    if (!initialized.current) return;
    scheduleSave();
  }, [age]);

  useEffect(() => {
    localStorage.setItem("macro_height", height);
    if (!initialized.current) return;
    scheduleSave();
  }, [height]);

  const updateToday = (newState) => setHistory(h => ({ ...h, [today]: { ...newState, cutPct } }));


  function importData() {
    try {
      // strip wrapping single or double quotes the browser console adds when displaying strings
      const raw = importText.trim().replace(/^['"]|['"]$/g, "");
      const parsed = JSON.parse(raw);
      // accept either raw history object or { history } wrapper
      const data = parsed["2025"] || parsed["2026"] || Object.values(parsed)[0]?.food !== undefined
        ? parsed
        : parsed.history ?? parsed;
      // validate: should be an object of date keys
      const keys = Object.keys(data);
      if (!keys.length || !keys[0].match(/^\d{4}-\d{2}-\d{2}$/))
        throw new Error("Doesn't look like macro_v9 data");
      setHistory(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setImportMsg(`✓ Imported ${keys.length} days of history`);
      setTimeout(() => { setShowImport(false); setImportText(""); setImportMsg(""); }, 2000);
    } catch (e) {
      setImportMsg("✗ Invalid data: " + e.message);
    }
  }


  // ── Food actions ─────────────────────────────────────────────────────────
  function addFood() {
    const item = FOOD_DB[group][food];
    updateToday({ ...state, food: [...state.food, { ...item, grams }] });
  }

  function addCustomFood() {
    const name = customName.trim();
    if (!name || !customKcal || !customGrams) return;
    const item = {
      name,
      kcal:    Number(customKcal),
      protein: Number(customProtein) || 0,
      carbs:   Number(customCarbs)   || 0,
      fat:     Number(customFat)     || 0,
      grams:   Number(customGrams),
    };
    updateToday({ ...state, food: [...state.food, item] });
    setCustomName(""); setCustomKcal(""); setCustomGrams(100);
    setCustomProtein(""); setCustomCarbs(""); setCustomFat("");
  }

  function removeFood(idx) {
    updateToday({ ...state, food: state.food.filter((_, i) => i !== idx) });
  }

  // ── Activity actions ────────────────────────────────────────────────────
  function addActivity() {
    if (!activityName || activityKcal <= 0) return;
    updateToday({ ...state, activity: [...state.activity, { name: activityName, kcal: activityKcal }] });
    setActivityName("");
    setActivityKcal(0);
  }

  function removeActivity(idx) {
    updateToday({ ...state, activity: state.activity.filter((_, i) => i !== idx) });
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  const foodTotals = useMemo(() => (state.food ?? []).reduce(
    (acc, i) => {
      const f = i.grams / 100;
      acc.kcal    += i.kcal    * f;
      acc.protein += i.protein * f;
      acc.carbs   += i.carbs   * f;
      acc.fat     += i.fat     * f;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  ), [state.food]);

  const activityTotal = useMemo(
    () => (state.activity ?? []).reduce((acc, a) => acc + a.kcal, 0),
    [state.activity]
  );

  // ── Dynamic TDEE (Mifflin-St Jeor × 1.2 sedentary) ─────────────────────────
  const mbr = useMemo(() =>
    Math.round((10 * bodyWeight + 6.25 * height - 5 * age + 5) * 1.2),
    [bodyWeight, height, age]
  );

  const proteinTarget = Math.max(160, bodyWeight * 1.8);
  const carbTarget    = bodyWeight * 4;
  const fatTarget     = bodyWeight * 0.8;

  // cutDeficit auto-calculates from protocol % × bodyweight
  const cutDeficit   = useMemo(() => Math.round(bodyWeight * (cutPct / 100) * 7700 / 7), [bodyWeight, cutPct]);
  const cutTarget    = mbr - cutDeficit;
  const baselineDelta = mbr + activityTotal - foodTotals.kcal;
  const cutRemaining  = cutTarget + activityTotal - foodTotals.kcal;

  function changeCutDeficit(delta) {
    // shift by ~10 kcal → back-calculate new %
    const newDeficit = Math.max(0, cutDeficit + delta);
    const newPct = (newDeficit * 7 / (bodyWeight * 7700)) * 100;
    setCutPct(Math.round(newPct * 100) / 100);
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  function computeDayTotals(dayState) {
    let t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    let activity = 0;
    (dayState.food ?? []).forEach(i => {
      const f = i.grams / 100;
      t.kcal += i.kcal * f; t.protein += i.protein * f;
      t.carbs += i.carbs * f; t.fat += i.fat * f;
    });
    (dayState.activity ?? []).forEach(a => (activity += a.kcal));
    return { ...t, activity, delta: mbr + activity - t.kcal, cutRemaining: cutTarget + activity - t.kcal };
  }

  function exportAllCSV(mode = "all") {
    const rows = [["date","kcal","protein","carbs","fat","activityKcal","baselineDelta"]];
    let ri = 2;
    Object.keys(history).sort().forEach(date => {
      if (mode === "ytd"   && !date.startsWith(String(new Date().getFullYear()))) return;
      if (mode === "month" && !date.startsWith(today.slice(0,7))) return;
      if (mode === "week") {
        const diff = (new Date() - new Date(date)) / 86400000;
        if (diff > 7) return;
      }
      const t = computeDayTotals(history[date]);
      rows.push([date, t.kcal.toFixed(1), t.protein.toFixed(1), t.carbs.toFixed(1), t.fat.toFixed(1), t.activity.toFixed(1), t.delta.toFixed(1)]);
      ri++;
    });
    if (ri > 2) rows.push(["","","","","","TOTAL", `=SUM(G2:G${ri-1})`]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download = `macro_${mode}.csv`;
    a.click();
    setShowExport(false);
  }

  async function exportJPEG() {
    setShowExport(false);
    const canvas = await html2canvas(document.body, { backgroundColor:"#080808", scale:2, logging:false });
    canvas.toBlob(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `macro-${today}.jpg`;
      a.click();
    }, "image/jpeg", 0.92);
  }

  // ── Derived preview ───────────────────────────────────────────────────────
  const preview = (() => {
    if (!FOOD_DB[group]?.[food]) return null;
    const item = FOOD_DB[group][food];
    const f = grams / 100;
    return { kcal: item.kcal * f, protein: item.protein * f, carbs: item.carbs * f, fat: item.fat * f };
  })();

  const customPreview = (() => {
    if (!customKcal || !customGrams) return null;
    const f = Number(customGrams) / 100;
    return {
      kcal:    (Number(customKcal)    || 0) * f,
      protein: (Number(customProtein) || 0) * f,
      carbs:   (Number(customCarbs)   || 0) * f,
      fat:     (Number(customFat)     || 0) * f,
    };
  })();

  // ── History entries for log tab ───────────────────────────────────────────
  const [logMode, setLogMode] = useState("rolling"); // "rolling" | "calendar"
  const [logMonth, setLogMonth] = useState(() => today.slice(0, 7));
  const allMonths = useMemo(() =>
    [...new Set(Object.keys(history).map(d => d.slice(0, 7)))].sort().reverse()
  , [history]);
  const historyDays = useMemo(() => {
    if (logMode === "calendar") {
      return Object.keys(history).filter(d => d.startsWith(logMonth)).sort().reverse();
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 29);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return Object.keys(history).filter(d => d >= cutoffStr).sort().reverse();
  }, [history, logMode, logMonth]);

  const cutColor = cutRemaining >= 0 ? "#4ade80" : "#f87171";

  // fat lost (or gained) as % of current bodyweight: deficit kcal → kg fat (÷7700) → % of BW
  const fatPctBW = (deficitKcal) =>
    bodyWeight > 0 ? (deficitKcal / 7700 / bodyWeight) * 100 : 0;

  if (loading) return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080808", color:"#475569", fontFamily:"inherit", fontSize:13 }}>
      syncing…
    </div>
  );

  return (
    <div style={A.root} ref={bodyRef}>

      {/* ── Header ── */}
      <div style={A.header}>
        <div>
          <div style={A.title}>MACRO TRACKER v3</div>
          <div style={A.date}>{new Date().toLocaleDateString("en-IL", { weekday:"long", day:"numeric", month:"long" })}</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {syncing && <span style={{ fontSize:11, color:"#475569" }}>syncing…</span>}
          <button style={A.iconBtn} onClick={() => supabase.auth.signOut()} title="Sign out">⏻</button>
          <button style={A.iconBtn} onClick={() => setShowSettings(p=>!p)}>⚙</button>
          <button style={A.iconBtn} onClick={() => setShowImport(p=>!p)} title="Import data">📥</button>
          <div style={{ position:"relative" }}>
            <button style={A.iconBtn} onClick={() => setShowExport(p=>!p)}>💾</button>
            {showExport && (
              <>
                <div style={A.overlay} onClick={() => setShowExport(false)} />
                <div style={A.menu}>
                  <div style={A.menuSec}>CSV Export</div>
                  {["all","week","month","ytd"].map(m => (
                    <button key={m} style={A.menuItem} onClick={() => exportAllCSV(m)}>{m.toUpperCase()}</button>
                  ))}
                  <div style={{ ...A.menuSec, marginTop:10 }}>Screenshot</div>
                  <button style={A.menuItem} onClick={exportJPEG}>Save JPEG</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Import panel ── */}
      {showImport && (
        <div style={A.settingsPanel}>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:8 }}>
            1. Open your old app in browser<br/>
            2. Press <strong style={{ color:"#f1f5f9" }}>F12</strong> → Console tab<br/>
            3. Run: <code style={{ color:"#4ade80", background:"#111", padding:"2px 6px", borderRadius:4 }}>copy(localStorage.getItem('macro_v9'))</code><br/>
            4. Paste below ↓
          </div>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder='Paste your macro_v9 JSON here...'
            style={{ width:"100%", background:"#111", border:"1px solid #252525", color:"#e2e8f0", borderRadius:8, padding:"10px", fontSize:12, fontFamily:"monospace", minHeight:80, resize:"vertical", boxSizing:"border-box" }}
          />
          {importMsg && (
            <div style={{ fontSize:12, color: importMsg.startsWith("✓") ? "#4ade80" : "#f87171", marginTop:6 }}>{importMsg}</div>
          )}
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button style={A.addBtn} onClick={importData}>Import</button>
            <button style={{ ...A.iconBtn, fontSize:12 }} onClick={() => { setShowImport(false); setImportText(""); setImportMsg(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Settings panel ── */}
      {showSettings && (
        <div style={A.settingsPanel}>
          <div style={A.settingsRow}>
            <label style={A.settingsLabel}>Body Weight (kg)</label>
            <div style={A.settingsInputRow}>
              <button style={A.step} onClick={() => setBodyWeight(v => Math.max(40, v - 0.5))}>−</button>
              <input type="number" value={bodyWeight} onChange={e => setBodyWeight(+e.target.value)} style={A.settingsInput} />
              <button style={A.step} onClick={() => setBodyWeight(v => v + 0.5)}>+</button>
            </div>
          </div>
          <div style={A.settingsRow}>
            <label style={A.settingsLabel}>Height (cm)</label>
            <div style={A.settingsInputRow}>
              <button style={A.step} onClick={() => setHeight(v => v - 1)}>−</button>
              <input type="number" value={height} onChange={e => setHeight(+e.target.value)} style={A.settingsInput} />
              <button style={A.step} onClick={() => setHeight(v => v + 1)}>+</button>
            </div>
          </div>
          <div style={A.settingsRow}>
            <label style={A.settingsLabel}>Age</label>
            <div style={A.settingsInputRow}>
              <button style={A.step} onClick={() => setAge(v => v - 1)}>−</button>
              <input type="number" value={age} onChange={e => setAge(+e.target.value)} style={A.settingsInput} />
              <button style={A.step} onClick={() => setAge(v => v + 1)}>+</button>
            </div>
          </div>
          <div style={{ fontSize:11, color:"#475569", marginTop:8 }}>
            TDEE: <span style={{ color:"#94a3b8" }}>{mbr} kcal</span> (Mifflin × 1.2 sedentary)
          </div>
        </div>
      )}

      {/* ── Calorie summary ── */}
      <div style={A.calCard}>
        <div style={A.calMain}>
          <div style={A.calNum}>{Math.round(foodTotals.kcal)}</div>
          <div style={A.calLabel}>kcal eaten</div>
        </div>
        <div style={A.calDivider} />
        <div style={A.calSide}>
          <div style={A.calRow}>
            <span style={A.calKey}>Baseline delta</span>
            <span style={{ ...A.calVal, color: baselineDelta >= 0 ? "#4ade80" : "#f87171" }}>{baselineDelta.toFixed(0)}</span>
          </div>
          <div style={A.calRow}>
            <span style={A.calKey}>Cut target</span>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <button style={A.cutArrow} onClick={() => changeCutDeficit(10)}>▲</button>
              {editingCut
                ? <input
                    autoFocus
                    type="number"
                    value={cutTarget}
                    onChange={e => {
                      const newTarget = Number(e.target.value);
                      const newDeficit = Math.max(0, mbr - newTarget);
                      const newPct = (newDeficit * 7 / (bodyWeight * 7700)) * 100;
                      setCutPct(Math.round(newPct * 100) / 100);
                    }}
                    onBlur={() => setEditingCut(false)}
                    style={{ ...A.calVal, color:"#60a5fa", background:"transparent", border:"none", borderBottom:"1px solid #60a5fa", width:50, textAlign:"right", outline:"none", fontFamily:"inherit" }}
                  />
                : <span style={A.calVal} onClick={() => setEditingCut(true)}>{cutTarget.toFixed(0)}</span>
              }
              <button style={A.cutArrow} onClick={() => changeCutDeficit(-10)}>▼</button>
              <span style={{ fontSize:10, color:"#475569", marginLeft:2 }}>{cutPct.toFixed(2)}%</span>
            </div>
          </div>
          <div style={A.calRow}>
            <span style={A.calKey}>Cut remaining</span>
            <span style={{ ...A.calVal, fontWeight:700, color:cutColor }}>{cutRemaining.toFixed(0)}</span>
          </div>
          {activityTotal > 0 && (
            <div style={A.calRow}>
              <span style={A.calKey}>Activity</span>
              <span style={{ ...A.calVal, color:"#60a5fa" }}>+{activityTotal}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Macro rings ── */}
      <div style={A.ringsRow}>
        <Ring value={foodTotals.protein} target={proteinTarget} color="#60a5fa" label="Protein" />
        <Ring value={foodTotals.carbs}   target={carbTarget}    color="#fb923c" label="Carbs"   />
        <Ring value={foodTotals.fat}     target={fatTarget}     color="#a855f7" label="Fat"     />
      </div>

      {/* ── Tabs ── */}
      <div style={A.tabs}>
        {["today","log"].map(t => (
          <button key={t} style={{ ...A.tab, ...(tab===t ? A.tabActive : {}) }} onClick={() => setTab(t)}>
            {t === "today" ? "Today" : "Log"}
          </button>
        ))}
      </div>

      {tab === "today" ? (
        <>
          {/* ── Add food ── */}
          <div style={A.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={A.cardTitle}>Add food</div>
              <button
                style={{ ...A.iconBtn, fontSize:11, padding:"5px 10px", color: customMode ? "#4ade80" : "#94a3b8", borderColor: customMode ? "rgba(74,222,128,0.3)" : "#252525" }}
                onClick={() => setCustomMode(m => !m)}
              >
                {customMode ? "← DB" : "+ Custom"}
              </button>
            </div>

            {!customMode ? (
              <>
                <div style={A.addRow}>
                  <select
                    value={group}
                    onChange={e => { setGroup(e.target.value); setFood(Object.keys(FOOD_DB[e.target.value])[0]); }}
                    style={A.select}
                  >
                    {Object.keys(FOOD_DB).map(g => <option key={g}>{g}</option>)}
                  </select>
                  <select value={food} onChange={e => setFood(e.target.value)} style={{ ...A.select, flex:2 }}>
                    {Object.keys(FOOD_DB[group]).map(f => <option key={f} value={f}>{FOOD_DB[group][f].name}</option>)}
                  </select>
                </div>
                <div style={A.addRow}>
                  <div style={A.gramsRow}>
                    <button style={A.step} onClick={() => setGrams(g => Math.max(5, g - 25))}>−</button>
                    <input type="number" value={grams} onChange={e => setGrams(+e.target.value)} style={{ ...A.numInput, flex:1 }} />
                    <span style={{ color:"#64748b", fontSize:13 }}>g</span>
                    <button style={A.step} onClick={() => setGrams(g => g + 25)}>+</button>
                  </div>
                  <button style={A.addBtn} onClick={addFood}>+ Add</button>
                </div>
                {preview && (
                  <div style={A.preview}>
                    <span style={A.previewChip}>{preview.kcal.toFixed(0)} kcal</span>
                    <span style={{ ...A.previewChip, color:"#93c5fd" }}>{preview.protein.toFixed(1)}p</span>
                    <span style={{ ...A.previewChip, color:"#fdba74" }}>{preview.carbs.toFixed(1)}c</span>
                    <span style={{ ...A.previewChip, color:"#c4b5fd" }}>{preview.fat.toFixed(1)}f</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Food name (e.g. Cottage cheese)"
                  style={{ ...A.textInput, width:"100%", boxSizing:"border-box", marginBottom:8 }}
                />
                <div style={A.addRow}>
                  <div style={{ flex:1 }}>
                    <div style={A.customLabel}>kcal / 100g</div>
                    <input type="number" value={customKcal} onChange={e => setCustomKcal(e.target.value)} placeholder="e.g. 98" style={{ ...A.numInput, width:"100%", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={A.customLabel}>Grams eaten</div>
                    <div style={A.gramsRow}>
                      <button style={A.step} onClick={() => setCustomGrams(g => Math.max(5, g - 25))}>−</button>
                      <input type="number" value={customGrams} onChange={e => setCustomGrams(+e.target.value)} style={{ ...A.numInput, flex:1 }} />
                      <button style={A.step} onClick={() => setCustomGrams(g => g + 25)}>+</button>
                    </div>
                  </div>
                </div>
                <div style={{ ...A.addRow, marginTop:4 }}>
                  <div style={{ flex:1 }}>
                    <div style={A.customLabel}>Protein / 100g</div>
                    <input type="number" value={customProtein} onChange={e => setCustomProtein(e.target.value)} placeholder="0" style={{ ...A.numInput, width:"100%", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={A.customLabel}>Carbs / 100g</div>
                    <input type="number" value={customCarbs} onChange={e => setCustomCarbs(e.target.value)} placeholder="0" style={{ ...A.numInput, width:"100%", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={A.customLabel}>Fat / 100g</div>
                    <input type="number" value={customFat} onChange={e => setCustomFat(e.target.value)} placeholder="0" style={{ ...A.numInput, width:"100%", boxSizing:"border-box" }} />
                  </div>
                </div>
                {customPreview && (
                  <div style={A.preview}>
                    <span style={A.previewChip}>{customPreview.kcal.toFixed(0)} kcal</span>
                    <span style={{ ...A.previewChip, color:"#93c5fd" }}>{customPreview.protein.toFixed(1)}p</span>
                    <span style={{ ...A.previewChip, color:"#fdba74" }}>{customPreview.carbs.toFixed(1)}c</span>
                    <span style={{ ...A.previewChip, color:"#c4b5fd" }}>{customPreview.fat.toFixed(1)}f</span>
                  </div>
                )}
                <button
                  style={{ ...A.addBtn, width:"100%", marginTop:8, opacity: customName && customKcal ? 1 : 0.4 }}
                  onClick={addCustomFood}
                >
                  + Add Custom Food
                </button>
              </>
            )}
          </div>

          {/* ── Food log ── */}
          {state.food.length > 0 && (
            <div style={A.card}>
              <div style={A.cardTitle}>Food log</div>
              {state.food.map((item, idx) => {
                const f = item.grams / 100;
                return (
                  <div key={idx} style={A.foodRow}>
                    <div style={A.foodLeft}>
                      <div style={A.foodName}>{item.name}</div>
                      <div style={A.foodMeta}>{item.grams}g · {(item.kcal * f).toFixed(0)} kcal · {(item.protein * f).toFixed(1)}p · {(item.carbs * f).toFixed(1)}c · {(item.fat * f).toFixed(1)}f</div>
                    </div>
                    <button onClick={() => removeFood(idx)} style={A.del}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Activity ── */}
          <div style={A.card}>
            <div style={A.cardTitle}>Activity</div>
            <div style={A.addRow}>
              <input
                type="text"
                value={activityName}
                onChange={e => setActivityName(e.target.value)}
                placeholder="Skate / Run / Lift..."
                style={{ ...A.textInput, flex:2 }}
                onKeyDown={e => e.key === "Enter" && addActivity()}
              />
              <input
                type="number"
                value={activityKcal || ""}
                onChange={e => setActivityKcal(+e.target.value)}
                placeholder="kcal"
                style={{ ...A.numInput, width:80 }}
              />
              <button style={A.addBtn} onClick={addActivity}>+ Add</button>
            </div>
            {state.activity.map((a, idx) => (
              <div key={idx} style={A.foodRow}>
                <div style={A.foodLeft}>
                  <div style={A.foodName}>{a.name}</div>
                  <div style={{ ...A.foodMeta, color:"#60a5fa" }}>+{a.kcal} kcal burned</div>
                </div>
                <button onClick={() => removeActivity(idx)} style={A.del}>✕</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── monthly log ── */
        <div style={A.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={A.cardTitle}>{logMode === "rolling" ? "last 30 days" : logMonth}</div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              {logMode === "calendar" && allMonths.filter(m => m !== logMonth).map(m => (
                <button key={m} onClick={() => setLogMonth(m)}
                  style={{ background:"#1a1a1a", border:"1px solid #252525", color:"#64748b", borderRadius:6, padding:"3px 8px", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>
                  {m}
                </button>
              ))}
              <button onClick={() => setLogMode(m => m === "rolling" ? "calendar" : "rolling")}
                style={{ background:"none", border:"none", color:"#475569", fontSize:11, cursor:"pointer", fontFamily:"inherit", textDecoration:"underline", padding:0 }}>
                {logMode === "rolling" ? "by month" : "rolling"}
              </button>
            </div>
          </div>
          {historyDays.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <div style={{ color:"#475569", fontSize:13, marginBottom:8 }}>No history found.</div>
              <div style={{ color:"#334155", fontSize:12 }}>Tap 📥 above → paste your old data to import.</div>
            </div>
          ) : Array.from({ length: Math.ceil(historyDays.length / 7) }, (_, chunk) => {
            const days = historyDays.slice(chunk * 7, chunk * 7 + 7);
            if (!days.length) return null;
            const chunkPct      = history[days[days.length - 1]]?.cutPct ?? cutPct;
            const chunkDeficit  = Math.round(bodyWeight * (chunkPct / 100) * 7700 / 7);
            const activeDays = days.filter(date => computeDayTotals(history[date]).kcal > 0);
            const weeklyTarget = chunkDeficit * activeDays.length;
            const actualDeficit = activeDays.reduce((acc, date) => {
              const t = computeDayTotals(history[date]);
              return acc + t.delta;
            }, 0);
            const diff      = Math.round(actualDeficit - weeklyTarget);
            const diffColor = diff >= 0 ? "#4ade80" : "#f87171";
            const diffLabel = diff >= 0 ? `+${diff} above protocol` : `${diff} below protocol`;
            return (
              <div key={chunk}>
                {days.map(date => {
                  const t = computeDayTotals(history[date]);
                  const dc = t.delta >= 0 ? "#4ade80" : "#f87171";
                  return (
                    <div key={date} style={A.histRow}>
                      <div style={A.histDate}>{date}</div>
                      <div style={A.histMacros}>
                        <span>{t.kcal.toFixed(0)} kcal</span>
                        <span style={{ color:"#93c5fd" }}>{t.protein.toFixed(0)}p</span>
                        <span style={{ color:"#fdba74" }}>{t.carbs.toFixed(0)}c</span>
                        <span style={{ color:"#c4b5fd" }}>{t.fat.toFixed(0)}f</span>
                        {t.activity > 0 && <span style={{ color:"#60a5fa" }}>🔥{t.activity.toFixed(0)}</span>}
                        {t.kcal > 0 && <span style={{ color:dc, fontWeight:600 }} title="deficit from TDEE · kg fat · % of bodyweight">{t.delta > 0 ? "+" : ""}{t.delta.toFixed(0)} def · {(t.delta / 7700).toFixed(2)}kg · {fatPctBW(t.delta).toFixed(2)}%</span>}
                      </div>
                    </div>
                  );
                })}
                <div style={{ background:"#111", borderRadius:8, padding:"10px 12px", margin:"8px 0 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:11, color:"#475569" }}>
                      Week {chunk + 1} · <span style={{ color:"#64748b" }}>{chunkPct}% · target {weeklyTarget.toFixed(0)}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:diffColor }}>{diffLabel}</div>
                  </div>
                  <div style={{ marginTop:6, fontSize:12, color:"#64748b" }}>
                    Total deficit: <span style={{ color: actualDeficit >= 0 ? "#4ade80" : "#f87171", fontWeight:700 }}>{Math.round(actualDeficit).toLocaleString()} kcal</span>
                    <span style={{ color:"#334155", marginLeft:6 }}>≈ {(actualDeficit / 7700).toFixed(2)} kg fat · {fatPctBW(actualDeficit) >= 0 ? "+" : ""}{fatPctBW(actualDeficit).toFixed(2)}% BW</span>
                  </div>
                </div>
              </div>
            );
          })}
          {historyDays.length > 0 && (() => {
            const activeTotalDays = historyDays.filter(d => computeDayTotals(history[d]).kcal > 0);
            const totalActual = activeTotalDays.reduce((acc, date) => acc + computeDayTotals(history[date]).delta, 0);
            const totalTarget = activeTotalDays.reduce((acc, date) => {
              const pct = history[date]?.cutPct ?? cutPct;
              return acc + Math.round(bodyWeight * (pct / 100) * 7700 / 7);
            }, 0);
            const totalDiff = Math.round(totalActual - totalTarget);
            const tc = totalDiff >= 0 ? "#4ade80" : "#f87171";
            const totalActualRounded = Math.round(totalActual);
            return (
              <div style={{ borderTop:"1px solid #1a1a1a", marginTop:8, paddingTop:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <div style={{ fontSize:11, color:"#475569" }}>
                    {historyDays.length}-day total · target <span style={{ color:"#64748b" }}>{totalTarget.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:tc }}>
                    {totalDiff >= 0 ? "+" : ""}{totalDiff.toLocaleString()} {totalDiff >= 0 ? "above" : "below"} protocol
                  </div>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:11, color:"#475569" }}>total deficit from TDEE</div>
                  <div style={{ fontSize:15, fontWeight:800, color: totalActualRounded >= 0 ? "#4ade80" : "#f87171" }}>
                    {totalActualRounded.toLocaleString()} kcal
                    <span style={{ fontSize:11, fontWeight:400, color:"#475569", marginLeft:8 }}>≈ {(totalActual / 7700).toFixed(2)} kg fat · {fatPctBW(totalActual) >= 0 ? "+" : ""}{fatPctBW(totalActual).toFixed(2)}% BW</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const A = {
  root:     { background:"#080808", minHeight:"100dvh", color:"#e2e8f0", padding:"16px 14px 60px", maxWidth:520, margin:"0 auto", boxSizing:"border-box" },

  header:   { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 },
  title:    { fontSize:20, fontWeight:700, letterSpacing:"0.1em", color:"#fff" },
  date:     { fontSize:12, color:"#94a3b8", marginTop:3 },
  iconBtn:  { background:"#141414", border:"1px solid #252525", color:"#94a3b8", borderRadius:8, padding:"8px 12px", fontSize:14, cursor:"pointer", fontFamily:"inherit" },

  settingsPanel:   { background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:12, padding:"14px 16px", marginBottom:14 },
  settingsRow:     { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  settingsLabel:   { fontSize:12, color:"#94a3b8" },
  settingsInputRow:{ display:"flex", alignItems:"center", gap:6 },
  settingsInput:   { background:"#1a1a1a", border:"1px solid #252525", color:"#f1f5f9", borderRadius:8, padding:"8px 10px", fontSize:15, fontFamily:"inherit", width:90, textAlign:"center" },

  calCard:   { background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:14, padding:"18px 16px", marginBottom:12, display:"flex", gap:16, alignItems:"center" },
  calMain:   { display:"flex", flexDirection:"column", alignItems:"center", minWidth:90 },
  calNum:    { fontSize:42, fontWeight:800, color:"#f1f5f9", lineHeight:1 },
  calLabel:  { fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"0.1em", marginTop:4 },
  calDivider:{ width:1, alignSelf:"stretch", background:"#1a1a1a", flexShrink:0 },
  calSide:   { flex:1, display:"flex", flexDirection:"column", gap:6 },
  calRow:    { display:"flex", justifyContent:"space-between", alignItems:"center" },
  calKey:    { fontSize:11, color:"#64748b" },
  calVal:    { fontSize:13, color:"#cbd5e1", fontFamily:"'DM Mono',monospace" },

  ringsRow:  { display:"flex", justifyContent:"space-around", background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:14, padding:"16px 8px", marginBottom:12 },

  tabs:      { display:"flex", gap:4, marginBottom:12 },
  tab:       { flex:1, background:"#111", border:"1px solid #1a1a1a", color:"#475569", borderRadius:8, padding:"10px", fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  tabActive: { background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.3)", color:"#93c5fd" },

  card:      { background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:14, padding:"14px 16px", marginBottom:12 },
  cardTitle: { fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:12 },

  addRow:    { display:"flex", gap:8, marginBottom:8, alignItems:"center" },
  gramsRow:  { display:"flex", alignItems:"center", gap:6, flex:1 },
  select:    { flex:1, background:"#1a1a1a", border:"1px solid #252525", color:"#e2e8f0", borderRadius:8, padding:"10px 10px", fontSize:13, fontFamily:"inherit" },
  numInput:  { background:"#1a1a1a", border:"1px solid #252525", color:"#f1f5f9", borderRadius:8, padding:"10px 8px", fontSize:15, fontFamily:"inherit", textAlign:"center" },
  textInput: { background:"#1a1a1a", border:"1px solid #252525", color:"#e2e8f0", borderRadius:8, padding:"10px 10px", fontSize:13, fontFamily:"inherit" },
  addBtn:    { background:"#4ade80", border:"none", color:"#000", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
  step:      { background:"#1e1e1e", border:"1px solid #252525", color:"#94a3b8", borderRadius:6, padding:"9px 11px", fontSize:16, cursor:"pointer", lineHeight:1, flexShrink:0 },

  customLabel: { fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 },
  preview:   { display:"flex", gap:6, flexWrap:"wrap", marginTop:4 },
  previewChip:{ fontSize:11, background:"#161616", padding:"3px 8px", borderRadius:99, color:"#94a3b8" },

  foodRow:   { display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid #111" },
  foodLeft:  { flex:1 },
  foodName:  { fontSize:13, color:"#e2e8f0", fontWeight:500 },
  foodMeta:  { fontSize:11, color:"#64748b", marginTop:2 },
  del:       { background:"transparent", border:"none", color:"#475569", cursor:"pointer", fontSize:13, padding:"4px 6px", flexShrink:0 },

  histRow:   { padding:"10px 0", borderBottom:"1px solid #111" },
  histDate:  { fontSize:11, color:"#64748b", marginBottom:4 },
  histMacros:{ display:"flex", gap:12, fontSize:12, color:"#94a3b8", flexWrap:"wrap" },

  cutArrow:  { background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:9, padding:"1px 3px", lineHeight:1 },
  overlay:   { position:"fixed", inset:0, zIndex:99 },
  menu:      { position:"absolute", right:0, top:"110%", background:"#121212", border:"1px solid #252525", borderRadius:10, padding:10, zIndex:100, minWidth:170, boxShadow:"0 16px 48px rgba(0,0,0,0.9)" },
  menuSec:   { fontSize:10, color:"#475569", letterSpacing:"0.12em", marginBottom:6, textTransform:"uppercase" },
  menuItem:  { display:"block", width:"100%", background:"#1a1a1a", border:"1px solid #252525", color:"#cbd5e1", padding:"10px 12px", borderRadius:6, fontSize:13, cursor:"pointer", fontFamily:"inherit", marginBottom:5, textAlign:"left" },
};
