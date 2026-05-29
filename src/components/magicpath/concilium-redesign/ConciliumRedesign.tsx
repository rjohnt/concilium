"use client";

import React, { useState } from "react";

// ── Palette ──────────────────────────────────────────────────────
const C = {
  bg: "#ffffff",
  surface: "#f8f9ff",
  accent: "#4f46e5",
  accentHover: "#4338ca",
  text: "#0d0f1a",
  textSec: "#374151",
  textMuted: "#6b7280",
  textGhost: "#9ca3af",
  border: "#e8eaf6",
  borderHover: "#d0d4f0",
  shadow: "0 1px 3px rgba(79,70,229,0.04)",
  shadowHover: "0 4px 12px rgba(79,70,229,0.08)"
};
type Status = "draft" | "review" | "consensus" | "building" | "done";
const STATUS: Record<Status, {
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  draft: {
    label: "Draft",
    color: "#64748B",
    bg: "#F1F5F9",
    border: "#CBD5E1"
  },
  review: {
    label: "Review",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FCD34D"
  },
  consensus: {
    label: "Consensus",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#6EE7B7"
  },
  building: {
    label: "Building",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#93C5FD"
  },
  done: {
    label: "Done",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#6EE7B7"
  }
};
const PRIORITY = [{
  label: "Urgent",
  color: "#DC2626",
  bg: "#FEF2F2",
  border: "#FECACA"
}, {
  label: "High",
  color: "#EA580C",
  bg: "#FFF7ED",
  border: "#FDBA74"
}, {
  label: "Medium",
  color: "#2563EB",
  bg: "#EFF6FF",
  border: "#93C5FD"
}, {
  label: "Low",
  color: "#64748B",
  bg: "#F1F5F9",
  border: "#CBD5E1"
}, {
  label: "Backlog",
  color: "#94A3B8",
  bg: "#F8FAFC",
  border: "#E2E8F0"
}];
const AVATARS = [{
  l: "E",
  c: "#2563EB"
}, {
  l: "D",
  c: "#7C3AED"
}, {
  l: "P",
  c: "#0891B2"
}, {
  l: "Q",
  c: "#059669"
}];
interface Row {
  id: string;
  title: string;
  status: Status;
  priority: number;
  activity: number;
  assignee: string;
}
const ROWS: Row[] = [{
  id: "CON-001",
  title: "Dark mode persona feedback",
  status: "review",
  priority: 1,
  activity: 3,
  assignee: "Engineer"
}, {
  id: "CON-002",
  title: "Consensus threshold slider",
  status: "building",
  priority: 2,
  activity: 2,
  assignee: "Designer"
}, {
  id: "CON-003",
  title: "Linear webhook integration",
  status: "draft",
  priority: 0,
  activity: 0,
  assignee: "Backend"
}, {
  id: "CON-004",
  title: "AI persona prompt editor",
  status: "consensus",
  priority: 1,
  activity: 4,
  assignee: "Product"
}, {
  id: "CON-005",
  title: "Session replay viewer",
  status: "review",
  priority: 2,
  activity: 1,
  assignee: "Engineer"
}, {
  id: "CON-006",
  title: "PDF export for tickets",
  status: "done",
  priority: 3,
  activity: 0,
  assignee: "QA"
}, {
  id: "CON-007",
  title: "Multi-team workspace",
  status: "draft",
  priority: 1,
  activity: 0,
  assignee: "Designer"
}, {
  id: "CON-008",
  title: "Notification preferences",
  status: "building",
  priority: 2,
  activity: 2,
  assignee: "Frontend"
}];
function s(h: string) {
  return {
    background: h,
    border: "none",
    cursor: "pointer",
    fontFamily: "'Inter', system-ui, sans-serif" as const
  };
}
export function ConciliumRedesign() {
  const [tab, setTab] = useState<"all" | Status>("all");
  const [q, setQ] = useState("");
  const [hRow, setHRow] = useState<string | null>(null);
  const [hStat, setHStat] = useState<number | null>(null);
  const filtered = ROWS.filter(r => (tab === "all" || r.status === tab) && (!q || r.title.toLowerCase().includes(q.toLowerCase())));
  const counts: Record<string, number> = {
    all: ROWS.length
  };
  for (const s of ["draft", "review", "consensus", "building", "done"] as Status[]) counts[s] = ROWS.filter(r => r.status === s).length;
  return <div style={{
    width: "100%",
    minHeight: "100vh",
    background: C.surface,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: C.text,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  }}>
      {/* ── Header ───────────────────────────────────────── */}
      <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      height: 60,
      background: C.bg,
      borderBottom: `1px solid ${C.border}`
    }}>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="7" fill={C.accent} /><path d="M8 14L12 18L20 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: C.text
        }}>concilium</span>
        </div>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
          <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderRadius: 8,
          background: C.surface,
          border: `1px solid ${C.border}`
        }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textGhost} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input type="text" placeholder="Search tickets…" value={q} onChange={e => setQ(e.target.value)} style={{
            background: "none",
            border: "none",
            outline: "none",
            color: C.text,
            fontSize: 13,
            width: 180,
            fontFamily: "inherit",
            letterSpacing: "-0.01em"
          }} />
          </div>
          <button style={{
          padding: "8px 16px",
          borderRadius: 8,
          ...s(C.accent),
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          transition: "background 0.15s"
        }} onMouseOver={e => e.currentTarget.style.background = C.accentHover} onMouseOut={e => e.currentTarget.style.background = C.accent}>
            + New Ticket</button>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────── */}
      <div style={{
      flex: 1,
      padding: "28px 32px",
      overflow: "auto"
    }}>
        {/* Stats */}
        <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14,
        marginBottom: 28
      }}>
          {[{
          label: "Total Tickets",
          value: ROWS.length,
          change: "+12%",
          up: true
        }, {
          label: "In Review",
          value: counts.review,
          change: "+3",
          up: true
        }, {
          label: "Avg. Cycle Time",
          value: "2.4d",
          change: "-18%",
          up: false
        }].map((s, i) => <div key={s.label} style={{
          padding: "20px 24px",
          borderRadius: 12,
          background: C.bg,
          border: `1px solid ${hStat === i ? C.borderHover : C.border}`,
          boxShadow: hStat === i ? C.shadowHover : C.shadow,
          transition: "all 0.15s",
          cursor: "default"
        }} onMouseOver={() => setHStat(i)} onMouseOut={() => setHStat(null)}>
            
              <div style={{
            fontSize: 12,
            fontWeight: 500,
            color: C.textMuted,
            marginBottom: 10,
            letterSpacing: "0.02em"
          }}>{s.label}</div>
              <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10
          }}>
                <span style={{
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: C.text,
              lineHeight: 1
            }}>{s.value}</span>
                <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: s.up ? "#059669" : "#dc2626",
              background: s.up ? "rgba(5,150,105,0.08)" : "rgba(220,38,38,0.08)",
              padding: "2px 7px",
              borderRadius: 5
            }}>{s.change}</span>
              </div>
            </div>)}
        </div>

        {/* Filter tabs */}
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        marginBottom: 20
      }}>
          {(["all", "draft", "review", "consensus", "building", "done"] as const).map(t => <button key={t} onClick={() => setTab(t)} style={{
          padding: "6px 13px",
          borderRadius: 7,
          fontSize: 13,
          fontWeight: tab === t ? 600 : 500,
          ...s(tab === t ? C.accent : "transparent"),
          color: tab === t ? "#fff" : C.textMuted,
          border: tab === t ? "none" : "1px solid transparent",
          transition: "all 0.12s"
        }} onMouseOver={e => {
          if (tab !== t) e.currentTarget.style.color = C.text;
        }} onMouseOut={e => {
          if (tab !== t) e.currentTarget.style.color = C.textMuted;
        }}>
            
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
              <span style={{
            marginLeft: 6,
            padding: "0 5px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            background: tab === t ? "rgba(255,255,255,0.18)" : "#ebeeff",
            color: tab === t ? "#fff" : C.accent
          }}>{counts[t] || 0}</span>
            </button>)}
        </div>

        {/* Column headers */}
        <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 110px 100px 90px 70px",
        gap: 12,
        padding: "8px 16px",
        marginBottom: 4,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: C.textGhost
      }}>
          <span>Ticket</span><span>Status</span><span>Priority</span><span>Activity</span><span />
        </div>

        {/* Rows */}
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 3
      }}>
          {filtered.map((r, i) => {
          const sc = STATUS[r.status];
          const pc = PRIORITY[r.priority];
          const hovered = hRow === r.id;
          return <div key={r.id} style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 100px 90px 70px",
            gap: 12,
            alignItems: "center",
            padding: "12px 16px",
            borderRadius: 10,
            background: C.bg,
            border: `1px solid ${hovered ? C.borderHover : C.border}`,
            cursor: "pointer",
            transition: "all 0.12s",
            boxShadow: hovered ? "0 2px 8px rgba(79,70,229,0.07)" : "none"
          }} onMouseOver={() => setHRow(r.id)} onMouseOut={() => setHRow(null)}>
                
                <div>
                  <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#a8adc4",
                marginBottom: 2,
                letterSpacing: "0.04em"
              }}>{r.id}</div>
                  <div style={{
                fontSize: 14,
                fontWeight: 500,
                color: C.text,
                letterSpacing: "-0.02em"
              }}>{r.title}</div>
                </div>
                <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.01em",
              background: sc.bg,
              color: sc.color,
              border: `1px solid ${sc.border}`
            }}>
                  <span style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: sc.color,
                flexShrink: 0
              }} />
                  {sc.label}
                </span>
                <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 9px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.01em",
              background: pc.bg,
              color: pc.color,
              border: `1px solid ${pc.border}`
            }}>
                  {pc.label}
                </span>
                <div>
                  {r.activity > 0 ? <div style={{
                display: "flex",
                alignItems: "center",
                gap: 5
              }}>
                      <div style={{
                  display: "flex"
                }}>
                        {[0, 1, 2].map(i => <div key={i} style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: AVATARS[i].c,
                    border: `2px solid ${C.surface}`,
                    marginLeft: i > 0 ? -7 : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 800,
                    color: "#fff"
                  }}>
                            {AVATARS[i].l}
                          </div>)}
                      </div>
                      <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: C.textMuted
                }}>+{r.activity}</span>
                    </div> : <span style={{
                fontSize: 13,
                color: "#d1d5db"
              }}>—</span>}
                </div>
                <button style={{
              padding: "4px 10px",
              borderRadius: 6,
              ...s(hovered ? "rgba(79,70,229,0.05)" : "transparent"),
              border: `1px solid ${hovered ? C.accent : C.border}`,
              color: hovered ? C.accent : C.textMuted,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              transition: "all 0.12s"
            }} onMouseOver={e => {
              e.currentTarget.style.borderColor = C.accent;
              e.currentTarget.style.color = C.accent;
              e.currentTarget.style.background = "rgba(79,70,229,0.05)";
            }} onMouseOut={e => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.textMuted;
              e.currentTarget.style.background = "transparent";
            }}>
                  Open</button>
              </div>;
        })}
        </div>

        {/* Empty */}
        {filtered.length === 0 && <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center"
      }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{
          marginBottom: 14
        }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: C.text,
          marginBottom: 4,
          letterSpacing: "-0.03em"
        }}>No tickets found</div>
            <div style={{
          fontSize: 13,
          color: C.textGhost
        }}>Try adjusting your search or filter.</div>
          </div>}
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 32px",
      borderTop: `1px solid ${C.border}`,
      background: C.bg,
      fontSize: 12,
      fontWeight: 500,
      color: C.textGhost,
      letterSpacing: "-0.01em"
    }}>
        <span>{filtered.length} of {ROWS.length} tickets</span>
        <span>Connected · <span style={{
          color: "#059669"
        }}>4 personas active</span></span>
      </footer>
    </div>;
}