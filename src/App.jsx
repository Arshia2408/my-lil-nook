import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, X, Download, BookOpen, Crown, Star, Copy, Check, Image as ImageIcon,
  ChevronLeft, ChevronRight, Trash2, Pencil, Sparkles, Quote, Leaf, RefreshCw,
} from "lucide-react";

/* ================================================================== *
 *  MY LIL NOOK — a cosy reading journal
 *  Vibe: warm, earthy, autumnal, a little academia, a lot of fun
 * ================================================================== */

const THEMES = {
  autumn: {
    label: "Autumn",
    bg: "#F2E5CE", panel: "#FBF3E1", ink: "#3B2A1E", line: "#E4D2AF",
    hero: "#B23A48",
    accents: ["#B23A48", "#C96A2B", "#DDA92E", "#40694A", "#7A4A6B", "#A45A34"],
    coverText: "#FBF3E1", dark: false,
  },
  botanical: {
    label: "Botanical",
    bg: "#E7E7D3", panel: "#F4F4E4", ink: "#2C3325", line: "#CFD3B4",
    hero: "#3F6B4A",
    accents: ["#3F6B4A", "#6E8B3D", "#B0873B", "#9C3F52", "#4A7C6F", "#7A5A8C"],
    coverText: "#F4F4E4", dark: false,
  },
  academia: {
    label: "Dark academia",
    bg: "#241F22", panel: "#302A2C", ink: "#EFE3CE", line: "#4B4139",
    hero: "#D98A4E",
    accents: ["#B23A48", "#DDA92E", "#3E7C74", "#8A5A8C", "#C96A2B", "#5C7A4A"],
    coverText: "#F6ECD8", dark: true,
  },
};

const FORMATS = ["Novel", "Manga", "Manhwa", "Webtoon", "Light Novel",
  "Graphic Novel", "Audiobook", "Novella", "Other"];
const STATUSES = ["Reading", "Finished", "Re-read", "Did not finish", "Want to read"];
const GENRES = ["Fantasy", "Romance", "Romantasy", "Sci-Fi", "Thriller", "Mystery",
  "Horror", "Contemporary", "Historical", "Literary", "Slice of Life", "Action",
  "Adventure", "Comedy", "Drama", "Isekai", "Supernatural", "Poetry", "Nonfiction", "YA"];
const TROPES = ["Enemies to lovers", "Found family", "Slow burn", "Morally grey",
  "Second chance", "Fake dating", "Chosen one", "Grumpy × sunshine", "Love triangle",
  "Redemption arc", "Forbidden love", "Reverse harem", "Villain origin", "Time loop"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

const STORE_KEY = "marginalia-data"; // kept stable so earlier test entries survive
const uid = () => Math.random().toString(36).slice(2, 10);
const nowYear = new Date().getFullYear();
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ---------- persistence (Claude window.storage w/ graceful fallback) ---------- */
async function loadData() {
  try {
    const saved = window.localStorage.getItem(STORE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}
async function saveData(data) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {}
}

/* ---------- cover fetching (Google Books; degrades to generated cover) ---------- */
async function fetchCover(title, author) {
  try {
    const q = encodeURIComponent(`${title} ${author || ""}`.trim());
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&country=US`);
    const j = await r.json();
    const il = j.items && j.items[0] && j.items[0].volumeInfo && j.items[0].volumeInfo.imageLinks;
    let url = il && (il.thumbnail || il.smallThumbnail);
    if (url) return url.replace("http://", "https://").replace("&edge=curl", "");
  } catch (e) {}
  return null;
}

/* ---------- helpers ---------- */
function readDate(b) {
  const d = b.finishDate || b.startDate || b.added;
  const parsed = d ? new Date(d) : null;
  return parsed && !isNaN(parsed) ? parsed : null;
}
function readYear(b) { const d = readDate(b); return d ? d.getFullYear() : nowYear; }
function isRead(b) { return b.status === "Finished" || b.status === "Re-read"; }
function mode(arr) {
  const m = {}; let best = null, bestN = 0;
  arr.forEach(v => { if (!v) return; m[v] = (m[v] || 0) + 1; if (m[v] > bestN) { bestN = m[v]; best = v; } });
  return best ? { value: best, count: bestN } : null;
}
function accentFor(str, theme) {
  const s = String(str || "x"); let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % theme.accents.length;
  return theme.accents[h];
}
function useCountUp(target, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(target); return; }
    let raf, start;
    const step = (t) => { if (!start) start = t; const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

/* ---------- atoms ---------- */
function Stars({ value = 0, onChange, size = 16 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div style={{ display: "flex", gap: 2 }} aria-label={`rating ${value} of 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={!onChange}
          onMouseEnter={() => onChange && setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange && onChange(n === value ? 0 : n)}
          style={{ background: "none", border: "none", padding: 0, cursor: onChange ? "pointer" : "default", lineHeight: 0 }}>
          <Star size={size} strokeWidth={1.6}
            style={{ color: "var(--gold)", fill: n <= shown ? "var(--gold)" : "transparent" }} />
        </button>
      ))}
    </div>
  );
}
function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className="chip"
      style={{ background: active ? "var(--ink)" : "transparent", color: active ? "var(--panel)" : "var(--ink)",
        borderColor: active ? "var(--ink)" : "var(--line)" }}>{label}</button>
  );
}

/* ---------- book cover (image or generated) ---------- */
function Cover({ b, theme, small }) {
  const col = b.color || accentFor(b.genres && b.genres[0] || b.title, theme);
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [b.coverUrl]); // retry when the link changes
  if (b.coverUrl && !err) {
    return <img key={b.coverUrl} src={b.coverUrl} alt={b.title} referrerPolicy="no-referrer" onError={() => setErr(true)}
      style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 4, display: "block",
        boxShadow: "0 4px 10px rgba(0,0,0,.22)" }} />;
  }
  return (
    <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 4, background: col, color: theme.coverText,
      boxShadow: "0 4px 10px rgba(0,0,0,.22)", display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: small ? "8px 8px" : "12px 11px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 3, background: "rgba(255,255,255,.25)" }} />
      <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: small ? 13 : 15.5,
        lineHeight: 1.12, display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {b.title}</div>
      {b.author && <div style={{ fontFamily: "'Fraunces',serif", fontStyle: "italic", fontSize: small ? 10 : 11.5, opacity: .85 }}>{b.author}</div>}
    </div>
  );
}

function BookCard({ b, theme, onClick }) {
  return (
    <button className="bookcard" onClick={onClick}>
      <div style={{ position: "relative" }}>
        <Cover b={b} theme={theme} small />
        {b.status === "Reading" && <span className="ribbon">reading</span>}
      </div>
      <div style={{ marginTop: 6, textAlign: "left", width: "100%" }}>
        <div className="bc-title">{b.title}</div>
        {b.rating > 0 && <div style={{ marginTop: 2 }}><Stars value={b.rating} size={12} /></div>}
      </div>
    </button>
  );
}

/* ---------- data viz ---------- */
function Donut({ data, size = 150 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = size / 2, r = R - 18, cx = R, cy = R; let a = -Math.PI / 2;
  const arcs = data.map(d => {
    const frac = d.value / total, a2 = a + frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = frac > 0.5 ? 1 : 0; a = a2;
    return { d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: d.color };
  });
  return (
    <svg width={size} height={size}>
      {arcs.map((arc, i) => <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={24} />)}
      <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: "'Fraunces',serif", fontSize: 30, fill: "var(--ink)" }}>{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 10, fill: "var(--ink)", opacity: .6 }}>books</text>
    </svg>
  );
}
function StackedBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}>
        {parts.map(p => <div key={p.label} title={`${p.label}: ${p.value}`}
          style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
        {parts.map(p => <span key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />{p.label} <b style={{ fontWeight: 600 }}>{p.value}</b></span>)}
      </div>
    </div>
  );
}
function MonthBars({ counts, accents, highlight }) {
  const max = Math.max(1, ...counts);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 130 }}>
      {counts.map((n, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <div style={{ fontSize: 11, opacity: n ? .85 : .3 }}>{n || ""}</div>
          <div style={{ width: "100%", height: `${(n / max) * 92}px`, minHeight: n ? 5 : 3,
            background: n ? accents[i % accents.length] : "var(--line)", borderRadius: "4px 4px 0 0",
            outline: i === highlight ? "2px solid var(--ink)" : "none", outlineOffset: 1 }} />
          <div style={{ fontSize: 9.5, opacity: .55 }}>{MONTHS[i]}</div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== *
 *  FORM
 * ================================================================== */
function BookForm({ initial, theme, onSave, onClose }) {
  const [b, setB] = useState(() => initial || {
    id: uid(), title: "", author: "", format: "Novel", status: "Reading",
    genres: [], tropes: [], rating: 0, pageCount: "", chapterCount: "",
    startDate: "", finishDate: "", favoriteLine: "", note: "", color: "", coverUrl: "",
    added: new Date().toISOString(),
  });
  const [more, setMore] = useState(!!initial);
  const [finding, setFinding] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setB(p => ({ ...p, [k]: v }));
  const toggle = (k, v) => setB(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

  const find = async () => {
    if (!b.title.trim()) return;
    setFinding(true);
    const url = await fetchCover(b.title, b.author);
    setFinding(false);
    if (url) set("coverUrl", url);
    else alert("Couldn't reach the cover service from here — try uploading an image instead, or the generated cover will be used.");
  };

  // upload from device → downscaled data URL (works even when remote images are blocked)
  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 300, scale = Math.min(1, maxW / img.width);
        const cw = Math.round(img.width * scale), ch = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
        try { set("coverUrl", canvas.toDataURL("image/jpeg", 0.82)); }
        catch (e) { set("coverUrl", reader.result); }
      };
      img.onerror = () => set("coverUrl", reader.result);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!b.title.trim()) return;
    let fin = b.finishDate;
    if ((b.status === "Finished" || b.status === "Re-read") && !fin) fin = todayStr();
    onSave({ ...b, title: b.title.trim(), author: b.author.trim(), finishDate: fin,
      pageCount: b.pageCount ? Number(b.pageCount) : null,
      chapterCount: b.chapterCount ? Number(b.chapterCount) : null });
  };

  const finished = b.status === "Finished" || b.status === "Re-read";

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="sheet" onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
          <h2 className="serif" style={{ fontSize: 25, margin: 0 }}>{initial ? "Edit book" : "Add a book"}</h2>
          <button className="icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <label className="lbl">Title</label>
        <input className="inp" value={b.title} autoFocus placeholder="What are you reading?"
          onChange={e => set("title", e.target.value)} />

        <div className="row2">
          <div><label className="lbl">Author</label>
            <input className="inp" value={b.author} placeholder="Optional" onChange={e => set("author", e.target.value)} /></div>
          <div><label className="lbl">Format</label>
            <select className="inp" value={b.format} onChange={e => set("format", e.target.value)}>
              {FORMATS.map(f => <option key={f}>{f}</option>)}</select></div>
        </div>

        <label className="lbl">Status</label>
        <div className="wrap">{STATUSES.map(s => <Chip key={s} label={s} active={b.status === s} onClick={() => set("status", s)} />)}</div>

        <label className="lbl">Your rating</label>
        <Stars value={b.rating} onChange={v => set("rating", v)} size={22} />

        <label className="lbl">Genre <span className="hint">— tap any that fit</span></label>
        <div className="wrap">{GENRES.map(g => <Chip key={g} label={g} active={b.genres.includes(g)} onClick={() => toggle("genres", g)} />)}</div>

        {finished && (
          <div style={{ marginTop: 14 }}>
            <label className="lbl">Date finished <span className="hint">— defaults to today if left blank</span></label>
            <input className="inp" type="date" value={b.finishDate} onChange={e => set("finishDate", e.target.value)} />
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <label className="lbl">Cover</label>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 70, flexShrink: 0 }}><Cover b={b} theme={theme} small /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn-ghost" onClick={find} disabled={finding}>
                  {finding ? <RefreshCw size={14} className="spin" /> : <ImageIcon size={14} />} {finding ? "Searching…" : "Find online"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => fileRef.current && fileRef.current.click()}>
                  <ImageIcon size={14} /> Upload image
                </button>
                {b.coverUrl && <button type="button" className="btn-ghost" onClick={() => set("coverUrl", "")}>
                  <X size={14} /> Clear
                </button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => onFile(e.target.files && e.target.files[0])} />
              <input className="inp" style={{ marginTop: 8 }} value={(b.coverUrl || "").startsWith("data:") ? "" : (b.coverUrl || "")}
                placeholder="…or paste a direct image link (.jpg / .png)"
                onChange={e => set("coverUrl", e.target.value)} />
              <div className="hint" style={{ marginTop: 6, lineHeight: 1.4 }}>
                Uploading works everywhere. Pasted links and auto-covers may not show in this in-chat preview (the sandbox blocks outside images) but will once the app is hosted.
              </div>
            </div>
          </div>
        </div>

        <button className="more" onClick={() => setMore(m => !m)}>
          {more ? "− fewer details" : "+ more details (tropes, pages, a line you loved)"}</button>

        {more && (
          <div>
            <label className="lbl">Tropes <span className="hint">— the good stuff</span></label>
            <div className="wrap">{TROPES.map(t => <Chip key={t} label={t} active={b.tropes.includes(t)} onClick={() => toggle("tropes", t)} />)}</div>
            <div className="row2">
              <div><label className="lbl">Pages</label>
                <input className="inp" type="number" min="0" value={b.pageCount} placeholder="e.g. 384" onChange={e => set("pageCount", e.target.value)} /></div>
              <div><label className="lbl">Chapters <span className="hint">(manga/manhwa)</span></label>
                <input className="inp" type="number" min="0" value={b.chapterCount} placeholder="e.g. 120" onChange={e => set("chapterCount", e.target.value)} /></div>
            </div>
            <label className="lbl">Date started</label>
            <input className="inp" type="date" value={b.startDate} onChange={e => set("startDate", e.target.value)} />
            <label className="lbl">A line you loved</label>
            <input className="inp" value={b.favoriteLine} placeholder="A sentence worth keeping…" onChange={e => set("favoriteLine", e.target.value)} />
            <label className="lbl">Your notes</label>
            <textarea className="inp" rows={3} value={b.note} placeholder="Anything you want to remember." onChange={e => set("note", e.target.value)} />
            <label className="lbl">Cover colour <span className="hint">(for the generated cover)</span></label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => set("color", "")} title="Automatic"
                style={{ width: 26, height: 26, borderRadius: "50%", border: b.color ? "1px solid var(--line)" : "2px solid var(--ink)",
                  background: `conic-gradient(${theme.accents.join(",")})`, cursor: "pointer" }} />
              {theme.accents.map(col => <button key={col} type="button" onClick={() => set("color", col)}
                style={{ width: 26, height: 26, borderRadius: "50%", background: col, cursor: "pointer",
                  border: b.color === col ? "2px solid var(--ink)" : "1px solid var(--line)" }} />)}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn-primary" onClick={submit}>{initial ? "Save changes" : "Add to nook"}</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  DETAIL
 * ================================================================== */
function BookDetail({ b, theme, crowned, onEdit, onDelete, onCrown, onClose }) {
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="sheet" onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 18 }}>
          <div style={{ width: 96, flexShrink: 0 }}><Cover b={b} theme={theme} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <h2 className="serif" style={{ fontSize: 24, margin: "0 8px 2px 0", lineHeight: 1.12 }}>{b.title}</h2>
              <button className="icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </div>
            {b.author && <div className="serif" style={{ fontStyle: "italic", opacity: .75, marginBottom: 8 }}>{b.author}</div>}
            <div style={{ fontSize: 13, opacity: .7 }}>{b.format} · {b.status}</div>
            {b.rating > 0 && <div style={{ marginTop: 8 }}><Stars value={b.rating} size={18} /></div>}
          </div>
        </div>

        {b.genres && b.genres.length > 0 && <div className="wrap" style={{ marginTop: 16 }}>
          {b.genres.map(g => <span key={g} className="tag" style={{ background: accentFor(g, theme) + "26" }}>{g}</span>)}</div>}
        {b.tropes && b.tropes.length > 0 && <div className="wrap" style={{ marginTop: 8 }}>
          {b.tropes.map(t => <span key={t} className="tag" style={{ border: "1px solid var(--line)" }}>{t}</span>)}</div>}

        {(b.pageCount || b.chapterCount || b.finishDate) && (
          <div style={{ display: "flex", gap: 20, marginTop: 16, fontSize: 13, opacity: .8, flexWrap: "wrap" }}>
            {b.pageCount ? <span>{b.pageCount} pages</span> : null}
            {b.chapterCount ? <span>{b.chapterCount} chapters</span> : null}
            {b.finishDate ? <span>finished {new Date(b.finishDate).toLocaleDateString()}</span> : null}
          </div>
        )}
        {b.favoriteLine && <blockquote className="serif" style={{ fontStyle: "italic", fontSize: 18,
          borderLeft: "3px solid var(--gold)", paddingLeft: 14, margin: "18px 0 0", lineHeight: 1.5 }}>“{b.favoriteLine}”</blockquote>}
        {b.note && <p style={{ marginTop: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{b.note}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          <button className="btn-ghost" onClick={onEdit}><Pencil size={15} /> Edit</button>
          <button className="btn-ghost" onClick={onCrown} style={{ color: crowned ? "var(--gold)" : "var(--ink)" }}>
            <Crown size={15} /> {crowned ? "Book of the year" : "Crown this"}</button>
          <button className="btn-ghost" onClick={onDelete} style={{ marginLeft: "auto", color: "var(--hero)" }}>
            <Trash2 size={15} /> Remove</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  SHELF
 * ================================================================== */
function Shelf({ books, theme, year, onOpen, onAdd, onFindCovers, findingCovers }) {
  const [fFormat, setFFormat] = useState("All");
  const reading = books.filter(b => b.status === "Reading");
  const inYear = books.filter(b => readYear(b) === year);
  const filtered = fFormat === "All" ? inYear : inYear.filter(b => b.format === fFormat);
  const byMonth = {};
  filtered.forEach(b => { const d = readDate(b); const m = d ? d.getMonth() : 0; (byMonth[m] = byMonth[m] || []).push(b); });
  const monthKeys = Object.keys(byMonth).map(Number).sort((a, b) => b - a);
  const formatsPresent = ["All", ...FORMATS.filter(f => inYear.some(b => b.format === f))];
  const missingCovers = books.filter(b => !b.coverUrl).length;

  return (
    <div>
      {reading.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 className="serif sec-h">Reading now</h3>
          <div className="grid">{reading.map(b => <BookCard key={b.id} b={b} theme={theme} onClick={() => onOpen(b)} />)}</div>
        </section>
      )}

      {inYear.length === 0 ? (
        <div className="empty">
          <BookOpen size={40} strokeWidth={1.3} style={{ opacity: .5 }} />
          <p className="serif" style={{ fontSize: 20, margin: "14px 0 4px" }}>Nothing on the shelf for {year} yet.</p>
          <p style={{ opacity: .65, margin: "0 0 18px" }}>Add the first book and watch the year fill in.</p>
          <button className="btn-primary" onClick={onAdd}><Plus size={16} /> Add a book</button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {formatsPresent.length > 2
              ? <div className="wrap">{formatsPresent.map(f => <Chip key={f} label={f} active={fFormat === f} onClick={() => setFFormat(f)} />)}</div>
              : <span />}
            {missingCovers > 0 && <button className="btn-ghost" onClick={onFindCovers} disabled={findingCovers}>
              {findingCovers ? <RefreshCw size={14} className="spin" /> : <ImageIcon size={14} />} Find missing covers</button>}
          </div>
          {monthKeys.map(m => (
            <section key={m} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h3 className="serif sec-h" style={{ margin: 0 }}>{MONTHS_LONG[m]}</h3>
                <span style={{ opacity: .5, fontSize: 13 }}>{byMonth[m].length}</span>
              </div>
              <div className="grid" style={{ marginTop: 10 }}>
                {byMonth[m].map(b => <BookCard key={b.id} b={b} theme={theme} onClick={() => onOpen(b)} />)}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

/* ================================================================== *
 *  WRAPPED — the year in books
 * ================================================================== */
function WrappedCard({ bg, text, children, wide }) {
  return <section className="wcard" style={{ background: bg, color: text, gridColumn: wide ? "1 / -1" : "auto" }}>{children}</section>;
}

function Wrapped({ books, theme, year, years, setYear, crownedId, reader }) {
  const read = books.filter(b => isRead(b) && readYear(b) === year);
  const heroN = useCountUp(read.length);
  const yi = years.indexOf(year);
  const A = theme.accents;

  const stats = useMemo(() => {
    const pages = read.reduce((s, b) => s + (b.pageCount || 0), 0);
    const chapters = read.reduce((s, b) => s + (b.chapterCount || 0), 0);
    const genreList = read.flatMap(b => b.genres || []);
    const genreCounts = {}; genreList.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1);
    const donut = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([g, v]) => ({ label: g, value: v, color: accentFor(g, theme) }));
    const fmtCounts = {}; read.forEach(b => fmtCounts[b.format] = (fmtCounts[b.format] || 0) + 1);
    const formats = Object.entries(fmtCounts).sort((a, b) => b[1] - a[1])
      .map(([f, v], i) => ({ label: f, value: v, color: A[i % A.length] }));
    const monthCounts = MONTHS.map((_, i) => read.filter(b => { const d = readDate(b); return d && d.getMonth() === i; }).length);
    const monthPages = MONTHS.map((_, i) => read.filter(b => { const d = readDate(b); return d && d.getMonth() === i; }).reduce((s, b) => s + (b.pageCount || 0), 0));
    const bestMonth = monthCounts.indexOf(Math.max(...monthCounts));
    const rated = read.filter(b => b.rating);
    const avg = rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : null;
    const boty = read.find(b => b.id === crownedId) || [...rated].sort((a, b) => b.rating - a.rating)[0];
    return {
      pages, chapters, donut, formats, monthCounts, monthPages, bestMonth,
      topGenre: mode(genreList), topAuthor: mode(read.map(b => b.author).filter(Boolean)),
      topTrope: mode(read.flatMap(b => b.tropes || [])),
      longest: read.filter(b => b.pageCount).sort((a, b) => b.pageCount - a.pageCount)[0],
      avg, boty, lines: read.filter(b => b.favoriteLine), maxMonth: Math.max(...monthCounts),
    };
  }, [read, crownedId, theme]);

  return (
    <div>
      <div className="year-nav">
        <button className="icon" disabled={yi <= 0} onClick={() => setYear(years[yi - 1])} aria-label="Previous year"><ChevronLeft /></button>
        <div style={{ textAlign: "center" }}>
          <div className="hint">the year in books</div>
          <div className="serif" style={{ fontSize: 34, lineHeight: 1 }}>{year}</div>
        </div>
        <button className="icon" disabled={yi >= years.length - 1} onClick={() => setYear(years[yi + 1])} aria-label="Next year"><ChevronRight /></button>
      </div>

      {read.length === 0 ? (
        <p className="serif" style={{ textAlign: "center", opacity: .6, marginTop: 40, fontStyle: "italic" }}>
          Nothing finished in {year} yet — the pages are waiting.</p>
      ) : (
        <div className="wgrid">
          <WrappedCard wide bg={theme.hero} text="#FBF3E1">
            <div style={{ fontSize: 13, opacity: .85, letterSpacing: .5 }}>{reader ? `${reader}, this year you read` : "This year you read"}</div>
            <div className="serif wbig">{heroN}</div>
            <div className="serif" style={{ fontSize: 22, fontStyle: "italic" }}>{read.length === 1 ? "book" : "books"}</div>
          </WrappedCard>

          <WrappedCard bg={A[1]} text="#FBF3E1">
            <div className="serif wnum">{stats.pages.toLocaleString()}</div>
            <div className="wlabel">pages turned</div>
            {stats.chapters > 0 && <div style={{ marginTop: 10, opacity: .9 }}>+ {stats.chapters.toLocaleString()} chapters</div>}
          </WrappedCard>

          {stats.avg && (
            <WrappedCard bg={A[2]} text={theme.dark ? "#241F22" : "#3B2A1E"}>
              <div className="serif wnum">{stats.avg}<span style={{ fontSize: 24 }}>★</span></div>
              <div className="wlabel">average rating</div>
            </WrappedCard>
          )}

          <WrappedCard wide bg="var(--panel)" text="var(--ink)">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <h3 className="serif sec-h" style={{ margin: 0 }}>Month by month</h3>
              {stats.maxMonth > 0 && <span style={{ fontSize: 13, opacity: .75 }}>
                busiest: <b>{MONTHS_LONG[stats.bestMonth]}</b> ({stats.maxMonth} {stats.maxMonth === 1 ? "book" : "books"})</span>}
            </div>
            <div style={{ marginTop: 14 }}><MonthBars counts={stats.monthCounts} accents={A} highlight={stats.bestMonth} /></div>
          </WrappedCard>

          {stats.donut.length > 0 && (
            <WrappedCard bg="var(--panel)" text="var(--ink)">
              <h3 className="serif sec-h">What you reached for</h3>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <Donut data={stats.donut} />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {stats.donut.map(d => <span key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />{d.label}
                    <span style={{ opacity: .5 }}>· {d.value}</span></span>)}
                </div>
              </div>
            </WrappedCard>
          )}

          {stats.formats.length > 0 && (
            <WrappedCard bg="var(--panel)" text="var(--ink)">
              <h3 className="serif sec-h">How you read it</h3>
              <StackedBar parts={stats.formats} />
            </WrappedCard>
          )}

          {stats.topGenre && <WrappedCard bg={A[3]} text="#FBF3E1">
            <div className="wlabel" style={{ opacity: .85 }}>your genre</div>
            <div className="serif" style={{ fontSize: 30, lineHeight: 1.05, marginTop: 6 }}>{stats.topGenre.value}</div>
            <div style={{ marginTop: 6, opacity: .9 }}>{stats.topGenre.count} books · your comfort zone</div>
          </WrappedCard>}

          {stats.topAuthor && <WrappedCard bg={A[4]} text="#FBF3E1">
            <div className="wlabel" style={{ opacity: .85 }}>most-read author</div>
            <div className="serif" style={{ fontSize: 26, lineHeight: 1.05, marginTop: 6 }}>{stats.topAuthor.value}</div>
            <div style={{ marginTop: 6, opacity: .9 }}>{stats.topAuthor.count} books together</div>
          </WrappedCard>}

          {stats.topTrope && <WrappedCard bg={A[5 % A.length]} text="#FBF3E1">
            <div className="wlabel" style={{ opacity: .85 }}>trope of the year</div>
            <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 6 }}>{stats.topTrope.value}</div>
            <div style={{ marginTop: 6, opacity: .9 }}>{stats.topTrope.count} times — no notes</div>
          </WrappedCard>}

          {stats.longest && <WrappedCard bg="var(--panel)" text="var(--ink)">
            <div className="hint">longest read</div>
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.15, marginTop: 4 }}>{stats.longest.title}</div>
            <div style={{ marginTop: 4, opacity: .7, fontSize: 13 }}>{stats.longest.pageCount} pages</div>
          </WrappedCard>}

          {stats.boty && (
            <WrappedCard wide bg={theme.dark ? "#1C1815" : "#3B2A1E"} text="#FBF3E1">
              <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 84, flexShrink: 0 }}><Cover b={stats.boty} theme={theme} /></div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gold)" }}>
                    <Crown size={20} /><span className="wlabel" style={{ opacity: 1 }}>book of the year</span></div>
                  <div className="serif" style={{ fontSize: 28, lineHeight: 1.08, marginTop: 6 }}>{stats.boty.title}</div>
                  {stats.boty.author && <div className="serif" style={{ fontStyle: "italic", opacity: .8 }}>{stats.boty.author}</div>}
                  {stats.boty.favoriteLine && <div className="serif" style={{ fontStyle: "italic", opacity: .85, marginTop: 8, maxWidth: 460 }}>“{stats.boty.favoriteLine}”</div>}
                </div>
              </div>
            </WrappedCard>
          )}

          {stats.lines.length > 0 && (
            <WrappedCard wide bg="var(--panel)" text="var(--ink)">
              <h3 className="serif sec-h"><Quote size={16} style={{ verticalAlign: -2 }} /> Lines worth keeping</h3>
              <div className="lines">{stats.lines.map(b => (
                <blockquote key={b.id} className="serif pull">“{b.favoriteLine}”
                  <cite>— {b.title}</cite></blockquote>))}</div>
            </WrappedCard>
          )}

          <WrappedCard wide bg={theme.hero} text="#FBF3E1">
            <div style={{ textAlign: "center", padding: "6px 0" }}>
              <Sparkles size={22} style={{ opacity: .9 }} />
              <div className="serif" style={{ fontSize: 22, marginTop: 8, fontStyle: "italic" }}>
                {read.length} {read.length === 1 ? "story" : "stories"} closer to whoever you're becoming.</div>
              <div style={{ opacity: .85, marginTop: 6, fontSize: 13 }}>see you in the next chapter · {year}</div>
            </div>
          </WrappedCard>
        </div>
      )}
    </div>
  );
}

/* ================================================================== *
 *  EXPORT MODAL
 * ================================================================== */
function ExportModal({ books, reader, crownedId, onClear, onClose }) {
  const [tab, setTab] = useState("csv");
  const [copied, setCopied] = useState(false);
  const csv = useMemo(() => {
    const cols = ["title", "author", "format", "status", "genres", "tropes", "rating", "pageCount", "chapterCount", "startDate", "finishDate", "favoriteLine", "note"];
    const esc = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    return [cols.join(",")].concat(books.map(b => cols.map(c => esc(Array.isArray(b[c]) ? b[c].join("; ") : b[c])).join(","))).join("\n");
  }, [books]);
  const json = useMemo(() => JSON.stringify({ books, reader, crownedId }, null, 2), [books, reader, crownedId]);
  const text = tab === "csv" ? csv : json;

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.getElementById("exp-ta"); ta.select(); try { document.execCommand("copy"); } catch (e2) {}
    }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const download = () => {
    try {
      const blob = new Blob([text], { type: tab === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `my-lil-nook.${tab}`; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { alert("Download is blocked in this preview — use Copy instead, or open the hosted site."); }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="sheet" onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 className="serif" style={{ fontSize: 24, margin: 0 }}>Export your nook</h2>
          <button className="icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <p style={{ opacity: .7, fontSize: 13.5, margin: "8px 0 14px" }}>
          Copy this and paste it anywhere — into an email to yourself, a spreadsheet, or a note. Download works too on the hosted site.</p>
        <div className="wrap" style={{ marginBottom: 10 }}>
          <Chip label="Spreadsheet (CSV)" active={tab === "csv"} onClick={() => setTab("csv")} />
          <Chip label="Backup (JSON)" active={tab === "json"} onClick={() => setTab("json")} />
        </div>
        <textarea id="exp-ta" className="inp" readOnly value={text} rows={9} style={{ fontFamily: "ui-monospace,monospace", fontSize: 12 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn-primary" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied!" : "Copy"}</button>
          <button className="btn-ghost" onClick={download}><Download size={15} /> Download</button>
        </div>
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 18, paddingTop: 14 }}>
          <button className="btn-ghost" onClick={onClear} style={{ color: "var(--hero)", borderColor: "var(--hero)" }}>
            <Trash2 size={15} /> Clear all data
          </button>
          <span className="hint" style={{ marginLeft: 10 }}>wipes every book — start fresh</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  ROOT
 * ================================================================== */
export default function App() {
  const [books, setBooks] = useState([]);
  const [reader, setReader] = useState("");
  const [crownedId, setCrownedId] = useState(null);
  const [themeKey, setThemeKey] = useState("autumn");
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("shelf");
  const [year, setYear] = useState(nowYear);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [findingCovers, setFindingCovers] = useState(false);
  const pickedYear = useRef(false);
  const theme = THEMES[themeKey];

  useEffect(() => { (async () => {
    const d = await loadData();
    if (d) { setBooks(d.books || []); setReader(d.reader || ""); setCrownedId(d.crownedId || null); if (d.theme && THEMES[d.theme]) setThemeKey(d.theme); }
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (loaded) saveData({ books, reader, crownedId, theme: themeKey }); }, [books, reader, crownedId, themeKey, loaded]);

  const years = useMemo(() => {
    const s = new Set(books.map(readYear)); s.add(nowYear);
    return [...s].sort((a, b) => a - b);
  }, [books]);

  // default the Year view to the most recent year that actually has finished books
  useEffect(() => {
    if (pickedYear.current) return;
    const ys = books.filter(isRead).map(readYear);
    if (ys.length) setYear(Math.max(...ys));
  }, [books]);
  const chooseYear = (y) => { pickedYear.current = true; setYear(y); };

  const upsert = (b) => {
    setBooks(prev => prev.some(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [b, ...prev]);
    setEditing(null); setDetail(null);
    if (!b.coverUrl && b.title) fetchCover(b.title, b.author).then(url => {
      if (url) setBooks(prev => prev.map(x => x.id === b.id ? { ...x, coverUrl: url } : x));
    });
  };
  const remove = (id) => { setBooks(prev => prev.filter(b => b.id !== id)); setDetail(null); };

  const clearAll = async () => {
    if (!window.confirm("Clear everything — every book, rating and note? This can't be undone.")) return;
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) {}
    pickedYear.current = false;
    setBooks([]); setReader(""); setCrownedId(null); setYear(nowYear); setShowExport(false);
  };

  const findMissingCovers = async () => {
    setFindingCovers(true);
    const missing = books.filter(b => !b.coverUrl);
    for (const b of missing) {
      const url = await fetchCover(b.title, b.author);
      if (url) setBooks(prev => prev.map(x => x.id === b.id ? { ...x, coverUrl: url } : x));
      await new Promise(r => setTimeout(r, 260));
    }
    setFindingCovers(false);
  };

  const rootStyle = {
    "--bg": theme.bg, "--panel": theme.panel, "--ink": theme.ink, "--line": theme.line,
    "--hero": theme.hero, "--gold": theme.accents[2],
  };

  return (
    <div className="root" style={rootStyle} data-dark={theme.dark ? "1" : "0"}>
      <Styles />
      <div className="grain" aria-hidden="true" />

      <header className="mast">
        <div className="mast-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge"><Leaf size={18} /></span>
            <div>
              <div className="serif" style={{ fontSize: 26, lineHeight: 1 }}>my lil nook</div>
              <input className="reader-name" value={reader} placeholder="whose nook is this?" onChange={e => setReader(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="themes">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} title={t.label} onClick={() => setThemeKey(k)}
                  className={"swatch" + (k === themeKey ? " on" : "")}
                  style={{ background: `linear-gradient(135deg, ${t.accents[0]}, ${t.accents[2]}, ${t.accents[3]})` }} />
              ))}
            </div>
            <button className="btn-ghost" onClick={() => setShowExport(true)}><Download size={15} /> Export</button>
          </div>
        </div>
        <nav className="tabs">
          <button className={view === "shelf" ? "tab on" : "tab"} onClick={() => setView("shelf")}>The shelf</button>
          <button className={view === "year" ? "tab on" : "tab"} onClick={() => setView("year")}>The year in books</button>
        </nav>
      </header>

      <main className="page">
        {view === "shelf"
          ? <Shelf books={books} theme={theme} year={year} onOpen={setDetail} onAdd={() => setEditing({})}
              onFindCovers={findMissingCovers} findingCovers={findingCovers} />
          : <Wrapped books={books} theme={theme} year={year} years={years} setYear={chooseYear} crownedId={crownedId} reader={reader} />}

        {loaded && books.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, opacity: .6 }}>
            Want to see it full? <button className="link" onClick={() => setBooks(SAMPLES())}>Load a few sample books</button> (removable any time).</p>
        )}
      </main>

      <button className="fab" onClick={() => setEditing({})} aria-label="Add a book"><Plus size={26} /></button>

      {editing && <BookForm initial={editing.id ? editing : null} theme={theme} onSave={upsert} onClose={() => setEditing(null)} />}
      {detail && <BookDetail b={detail} theme={theme} crowned={detail.id === crownedId}
        onEdit={() => { setEditing(detail); setDetail(null); }} onDelete={() => remove(detail.id)}
        onCrown={() => setCrownedId(id => id === detail.id ? null : detail.id)} onClose={() => setDetail(null)} />}
      {showExport && <ExportModal books={books} reader={reader} crownedId={crownedId} onClear={clearAll} onClose={() => setShowExport(false)} />}
    </div>
  );
}

function SAMPLES() {
  const y = nowYear;
  const mk = (o) => ({ id: uid(), genres: [], tropes: [], rating: 0, coverUrl: "", added: new Date().toISOString(), ...o });
  return [
    mk({ title: "A Study in Drowning", author: "Ava Reid", format: "Novel", status: "Finished", genres: ["Fantasy", "Romance"], tropes: ["Slow burn", "Enemies to lovers"], rating: 5, pageCount: 384, finishDate: `${y}-02-14`, favoriteLine: "The sea does not forgive, but it remembers." }),
    mk({ title: "Solo Leveling", author: "Chugong", format: "Manhwa", status: "Re-read", genres: ["Action", "Fantasy"], tropes: ["Chosen one"], rating: 4, chapterCount: 179, finishDate: `${y}-02-28` }),
    mk({ title: "Chainsaw Man", author: "Tatsuki Fujimoto", format: "Manga", status: "Finished", genres: ["Action", "Horror", "Supernatural"], tropes: ["Morally grey"], rating: 5, chapterCount: 97, finishDate: `${y}-03-20`, favoriteLine: "Dreams cost more than we think." }),
    mk({ title: "The Fragrant Flower Blooms with Dignity", author: "Saka Mikami", format: "Manga", status: "Finished", genres: ["Romance", "Slice of Life"], tropes: ["Grumpy × sunshine", "Slow burn"], rating: 4, chapterCount: 60, finishDate: `${y}-03-30` }),
    mk({ title: "A Court of Mist and Fury", author: "Sarah J. Maas", format: "Novel", status: "Finished", genres: ["Romantasy", "Fantasy"], tropes: ["Enemies to lovers", "Found family", "Slow burn"], rating: 5, pageCount: 640, finishDate: `${y}-05-06`, favoriteLine: "To the stars who listen — and the dreams that are answered." }),
    mk({ title: "Piranesi", author: "Susanna Clarke", format: "Novel", status: "Finished", genres: ["Literary", "Fantasy"], rating: 5, pageCount: 272, finishDate: `${y}-05-22`, favoriteLine: "The Beauty of the House is immeasurable; its Kindness infinite." }),
    mk({ title: "Omniscient Reader's Viewpoint", author: "singNsong", format: "Manhwa", status: "Finished", genres: ["Fantasy", "Action"], tropes: ["Found family"], rating: 5, chapterCount: 140, finishDate: `${y}-06-11` }),
    mk({ title: "Yellowface", author: "R.F. Kuang", format: "Novel", status: "Finished", genres: ["Contemporary", "Thriller"], rating: 4, pageCount: 336, finishDate: `${y}-06-30` }),
    mk({ title: "Jujutsu Kaisen", author: "Gege Akutami", format: "Manga", status: "Reading", genres: ["Action", "Supernatural"], chapterCount: 245, startDate: `${y}-07-02` }),
    mk({ title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid", format: "Novel", status: "Want to read", genres: ["Historical", "Contemporary"] }),
  ];
}

/* ================================================================== *
 *  STYLES
 * ================================================================== */
function Styles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Figtree:wght@400;500;600;700&display=swap');

.root{ min-height:100vh; background:var(--bg); color:var(--ink);
  font-family:'Figtree',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif; font-size:15px;
  position:relative; overflow-x:hidden; transition:background .3s, color .3s; }
.root *{ box-sizing:border-box; }
.serif{ font-family:'Fraunces',Georgia,'Times New Roman',serif; }
.grain{ position:fixed; inset:0; pointer-events:none; z-index:1; opacity:.4;
  mix-blend-mode:${"soft-light"};
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E"); }

.mast{ position:relative; z-index:2; background:var(--panel); border-bottom:1px solid var(--line); }
.mast-inner{ display:flex; justify-content:space-between; align-items:center; gap:12px;
  max-width:940px; margin:0 auto; padding:14px 20px 8px; flex-wrap:wrap; }
.badge{ width:36px; height:36px; border-radius:11px; background:var(--hero); color:#FBF3E1;
  display:flex; align-items:center; justify-content:center; }
.reader-name{ background:none; border:none; font:inherit; font-size:12.5px; color:var(--ink);
  opacity:.6; padding:0; outline:none; width:180px; }
.reader-name::placeholder{ font-style:italic; }
.themes{ display:flex; gap:6px; }
.swatch{ width:24px; height:24px; border-radius:50%; border:2px solid transparent; cursor:pointer; padding:0; }
.swatch.on{ border-color:var(--ink); }
.tabs{ display:flex; gap:24px; max-width:940px; margin:0 auto; padding:4px 20px 0; }
.tab{ font:inherit; font-size:14px; background:none; border:none; padding:10px 0; color:var(--ink);
  opacity:.5; cursor:pointer; border-bottom:2px solid transparent; }
.tab.on{ opacity:1; border-bottom-color:var(--hero); font-family:'Fraunces',serif; font-weight:600; }

.page{ position:relative; z-index:2; max-width:940px; margin:0 auto; padding:26px 20px 120px; }
.sec-h{ font-size:19px; margin:0 0 10px; font-weight:600; }
.hint{ font-size:11px; opacity:.55; }

.grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); gap:16px 14px; }
.bookcard{ background:none; border:none; padding:0; cursor:pointer; display:flex; flex-direction:column;
  align-items:stretch; transition:transform .15s; }
.bookcard:hover{ transform:translateY(-4px); }
.bc-title{ font-family:'Fraunces',serif; font-size:13px; line-height:1.2; font-weight:500;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.ribbon{ position:absolute; top:8px; left:-4px; background:var(--hero); color:#FBF3E1; font-size:10px;
  padding:3px 8px 3px 10px; border-radius:0 3px 3px 0; box-shadow:0 2px 5px rgba(0,0,0,.25); }
.empty{ text-align:center; padding:50px 20px; border:1px dashed var(--line); border-radius:12px; }

/* wrapped */
.year-nav{ display:flex; justify-content:center; align-items:center; gap:18px; margin-bottom:16px; }
.wgrid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.wcard{ border-radius:16px; padding:22px; overflow:hidden; }
.wbig{ font-size:104px; line-height:.86; font-weight:600; }
.wnum{ font-size:52px; line-height:1; font-weight:600; }
.wlabel{ font-size:13px; opacity:.9; margin-top:4px; }
.lines{ column-count:2; column-gap:26px; }
.pull{ break-inside:avoid; margin:0 0 16px; font-style:italic; font-size:16px; line-height:1.45;
  padding-left:12px; border-left:2px solid var(--gold); }
.pull cite{ display:block; font-style:normal; font-size:12px; opacity:.6; margin-top:4px; }

/* atoms */
.wrap{ display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
.chip{ font:inherit; font-size:13px; padding:5px 11px; border-radius:999px; border:1px solid var(--line);
  cursor:pointer; transition:background .15s,color .15s; }
.tag{ font-size:12px; padding:4px 10px; border-radius:999px; }

.btn-primary{ font:inherit; font-size:14px; font-weight:600; display:inline-flex; align-items:center; gap:7px;
  background:var(--hero); color:#FBF3E1; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; }
.btn-primary:hover{ filter:brightness(1.07); }
.btn-ghost{ font:inherit; font-size:14px; display:inline-flex; align-items:center; gap:7px; background:none;
  color:var(--ink); border:1px solid var(--line); padding:9px 14px; border-radius:8px; cursor:pointer; }
.btn-ghost:hover{ background:var(--bg); }
.btn-ghost:disabled{ opacity:.5; cursor:default; }
.icon{ background:none; border:none; color:var(--ink); cursor:pointer; padding:5px; opacity:.7; border-radius:8px; }
.icon:hover{ opacity:1; background:var(--bg); }
.icon:disabled{ opacity:.2; cursor:default; }
.link{ background:none; border:none; color:var(--hero); cursor:pointer; font:inherit; text-decoration:underline; padding:0; }
.more{ background:none; border:none; color:var(--hero); font:inherit; font-size:13.5px; cursor:pointer; padding:14px 0 4px; }

.fab{ position:fixed; right:22px; bottom:24px; z-index:5; width:58px; height:58px; border-radius:50%;
  background:var(--hero); color:#FBF3E1; border:none; cursor:pointer; display:flex; align-items:center;
  justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,.3); }
.fab:hover{ filter:brightness(1.08); }

.overlay{ position:fixed; inset:0; z-index:40; background:rgba(20,15,12,.55); display:flex;
  align-items:flex-start; justify-content:center; padding:26px 14px; overflow-y:auto; }
.sheet{ background:var(--bg); border-radius:14px; max-width:560px; width:100%; padding:24px;
  box-shadow:0 24px 70px rgba(0,0,0,.4); border:1px solid var(--line); }
.lbl{ display:block; font-size:12.5px; opacity:.7; margin:14px 0 5px; }
.inp{ width:100%; font:inherit; font-size:14.5px; color:var(--ink); background:var(--panel);
  border:1px solid var(--line); border-radius:8px; padding:9px 11px; outline:none; }
.inp:focus{ border-color:var(--hero); box-shadow:0 0 0 3px color-mix(in srgb, var(--hero) 25%, transparent); }
textarea.inp{ resize:vertical; }
.row2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
*:focus-visible{ outline:2px solid var(--hero); outline-offset:2px; }
.spin{ animation:sp 1s linear infinite; } @keyframes sp{ to{ transform:rotate(360deg); } }

@media (max-width:640px){
  .wgrid{ grid-template-columns:1fr; } .wbig{ font-size:80px; } .lines{ column-count:1; }
  .grid{ grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); }
  .reader-name{ width:140px; }
}
@media (prefers-reduced-motion:reduce){ .bookcard,.fab{ transition:none; } }
`}</style>
  );
}
