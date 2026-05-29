"use client";

import React, { useState } from "react";
type TicketStatus = "draft" | "in-review" | "consensus" | "building" | "done";
type FilterTab = "all" | TicketStatus;
interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  priority: number;
  assignee: string;
  personaActivity: number;
}
const STATUS_CONFIG: Record<TicketStatus, {
  label: string;
  color: string;
  dot: string;
  bg: string;
}> = {
  draft: {
    label: "Draft",
    color: "#6b7280",
    dot: "#9ca3af",
    bg: "rgba(107,114,128,0.08)"
  },
  "in-review": {
    label: "Review",
    color: "#7c3aed",
    dot: "#7c3aed",
    bg: "rgba(124,58,237,0.08)"
  },
  consensus: {
    label: "Consensus",
    color: "#059669",
    dot: "#059669",
    bg: "rgba(5,150,105,0.08)"
  },
  building: {
    label: "Building",
    color: "#0891b2",
    dot: "#0891b2",
    bg: "rgba(8,145,178,0.08)"
  },
  done: {
    label: "Done",
    color: "#059669",
    dot: "#059669",
    bg: "rgba(5,150,105,0.08)"
  }
};
const PRIORITY_LABELS = ["Urgent", "High", "Medium", "Low", "Backlog"];
const PRIORITY_COLORS = ["#dc2626", "#d97706", "#4f46e5", "#6b7280", "#a8adc4"];
const PRIORITY_BG = ["rgba(220,38,38,0.07)", "rgba(217,119,6,0.07)", "rgba(79,70,229,0.07)", "rgba(107,114,128,0.07)", "rgba(168,173,196,0.07)"];
const SAMPLE_TICKETS: Ticket[] = [{
  id: "CON-001",
  title: "Dark mode persona feedback",
  status: "in-review",
  priority: 1,
  assignee: "Engineer",
  personaActivity: 3
}, {
  id: "CON-002",
  title: "Consensus threshold slider",
  status: "building",
  priority: 2,
  assignee: "Designer",
  personaActivity: 2
}, {
  id: "CON-003",
  title: "Linear webhook integration",
  status: "draft",
  priority: 0,
  assignee: "Backend",
  personaActivity: 0
}, {
  id: "CON-004",
  title: "AI persona prompt editor",
  status: "consensus",
  priority: 1,
  assignee: "Product",
  personaActivity: 4
}, {
  id: "CON-005",
  title: "Session replay viewer",
  status: "in-review",
  priority: 2,
  assignee: "Engineer",
  personaActivity: 1
}, {
  id: "CON-006",
  title: "PDF export for tickets",
  status: "done",
  priority: 3,
  assignee: "QA",
  personaActivity: 0
}, {
  id: "CON-007",
  title: "Multi-team workspace",
  status: "draft",
  priority: 1,
  assignee: "Designer",
  personaActivity: 0
}, {
  id: "CON-008",
  title: "Notification preferences",
  status: "building",
  priority: 2,
  assignee: "Frontend",
  personaActivity: 2
}];
const AVATAR_COLORS = ["#4f46e5", "#7c3aed", "#0891b2"];
const AVATAR_LETTERS = ["E", "D", "P"];
export function ConciliumDashboard() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = SAMPLE_TICKETS.filter(t => {
    if (activeTab !== "all" && t.status !== activeTab) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const counts: Record<string, number> = {
    all: SAMPLE_TICKETS.length
  };
  for (const s of ["draft", "in-review", "consensus", "building", "done"] as TicketStatus[]) {
    counts[s] = SAMPLE_TICKETS.filter(t => t.status === s).length;
  }
  return <div style={{
    width: "100%",
    minHeight: "100vh",
    background: "#ffffff",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#0d0f1a",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  }}>
      {/* Top header */}
      <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      height: 60,
      borderBottom: "1px solid #e8eaf6",
      background: "#ffffff"
    }}>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#4f46e5" />
            <path d="M8 14L12 18L20 10" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: "#0d0f1a"
        }}>
            concilium
          </span>
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
          background: "#f8f9ff",
          border: "1px solid #e8eaf6"
        }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search tickets…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{
            background: "none",
            border: "none",
            outline: "none",
            color: "#0d0f1a",
            fontSize: 13,
            width: 180,
            fontFamily: "inherit",
            letterSpacing: "-0.01em"
          }} />
          </div>
          <button style={{
          padding: "8px 16px",
          borderRadius: 8,
          background: "#4f46e5",
          color: "#ffffff",
          border: "none",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "-0.02em",
          transition: "background 0.15s ease"
        }} onMouseOver={e => e.currentTarget.style.background = "#4338ca"} onMouseOut={e => e.currentTarget.style.background = "#4f46e5"}>
            + New Ticket
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{
      flex: 1,
      padding: "28px 32px",
      overflow: "auto",
      background: "#f8f9ff"
    }}>
        {/* Stats row */}
        <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14,
        marginBottom: 28
      }}>
          {[{
          label: "Total Tickets",
          value: SAMPLE_TICKETS.length,
          change: "+12%",
          up: true
        }, {
          label: "In Review",
          value: counts["in-review"],
          change: "+3",
          up: true
        }, {
          label: "Avg. Cycle Time",
          value: "2.4d",
          change: "-18%",
          up: false
        }].map(stat => <div key={stat.label} style={{
          padding: "20px 24px",
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid #e8eaf6",
          boxShadow: "0 1px 3px rgba(79,70,229,0.04)",
          transition: "box-shadow 0.15s ease, border-color 0.15s ease"
        }} onMouseOver={e => {
          e.currentTarget.style.borderColor = "#d0d4f0";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(79,70,229,0.08)";
        }} onMouseOut={e => {
          e.currentTarget.style.borderColor = "#e8eaf6";
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(79,70,229,0.04)";
        }}>
              <div style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#6b7280",
            marginBottom: 10,
            letterSpacing: "0.02em"
          }}>
                {stat.label}
              </div>
              <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10
          }}>
                <span style={{
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#0d0f1a",
              lineHeight: 1
            }}>
                  {stat.value}
                </span>
                <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: stat.up ? "#059669" : "#dc2626",
              background: stat.up ? "rgba(5,150,105,0.08)" : "rgba(220,38,38,0.08)",
              padding: "2px 7px",
              borderRadius: 5,
              letterSpacing: "0.01em"
            }}>
                  {stat.change}
                </span>
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
          {(["all", "draft", "in-review", "consensus", "building", "done"] as const).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} style={{
          padding: "6px 13px",
          borderRadius: 7,
          fontSize: 13,
          fontWeight: activeTab === tab ? 600 : 500,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "-0.01em",
          background: activeTab === tab ? "#4f46e5" : "transparent",
          color: activeTab === tab ? "#ffffff" : "#6b7280",
          border: activeTab === tab ? "none" : "1px solid transparent",
          transition: "all 0.12s ease"
        }} onMouseOver={e => {
          if (activeTab !== tab) e.currentTarget.style.color = "#0d0f1a";
        }} onMouseOut={e => {
          if (activeTab !== tab) e.currentTarget.style.color = "#6b7280";
        }}>
              {tab === "all" ? "All" : STATUS_CONFIG[tab as TicketStatus].label}
              <span style={{
            marginLeft: 6,
            padding: "0 5px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            background: activeTab === tab ? "rgba(255,255,255,0.18)" : "#ebeeff",
            color: activeTab === tab ? "#ffffff" : "#4f46e5"
          }}>
                {counts[tab] || 0}
              </span>
            </button>)}
        </div>

        {/* Column headers */}
        <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 100px 80px 80px",
        gap: 12,
        padding: "8px 16px",
        marginBottom: 4,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "#9ca3af"
      }}>
          <span>Ticket</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Personas</span>
          <span>Actions</span>
        </div>

        {/* Ticket list */}
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 3
      }}>
          {filtered.map((ticket, idx) => <div key={ticket.id} style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 100px 80px 80px",
          gap: 12,
          alignItems: "center",
          padding: "12px 16px",
          borderRadius: 10,
          background: "#ffffff",
          border: "1px solid #e8eaf6",
          cursor: "pointer",
          transition: "all 0.12s ease",
          boxShadow: "none"
        }} onMouseOver={e => {
          e.currentTarget.style.borderColor = "#d0d4f0";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(79,70,229,0.07)";
        }} onMouseOut={e => {
          e.currentTarget.style.borderColor = "#e8eaf6";
          e.currentTarget.style.boxShadow = "none";
        }}>
              <div>
                <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#a8adc4",
              marginBottom: 2,
              letterSpacing: "0.04em"
            }}>
                  {ticket.id}
                </div>
                <div style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#0d0f1a",
              letterSpacing: "-0.02em"
            }}>
                  {ticket.title}
                </div>
              </div>

              <div>
                <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.01em",
              background: STATUS_CONFIG[ticket.status].bg,
              color: STATUS_CONFIG[ticket.status].color
            }}>
                  <span style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: STATUS_CONFIG[ticket.status].dot,
                flexShrink: 0
              }} />
                  {STATUS_CONFIG[ticket.status].label}
                </span>
              </div>

              <div>
                <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.01em",
              background: PRIORITY_BG[ticket.priority],
              color: PRIORITY_COLORS[ticket.priority]
            }}>
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
              </div>

              <div>
                {ticket.personaActivity > 0 ? <div style={{
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
                  background: AVATAR_COLORS[i],
                  border: "2px solid #f8f9ff",
                  marginLeft: i > 0 ? -7 : 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "0"
                }}>
                          {AVATAR_LETTERS[i]}
                        </div>)}
                    </div>
                    <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#6b7280"
              }}>
                      +{ticket.personaActivity}
                    </span>
                  </div> : <span style={{
              fontSize: 13,
              color: "#d1d5db"
            }}>—</span>}
              </div>

              <div style={{
            display: "flex",
            gap: 4
          }}>
                <button style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: "transparent",
              border: "1px solid #e8eaf6",
              color: "#6b7280",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
              transition: "all 0.12s"
            }} onMouseOver={e => {
              e.currentTarget.style.borderColor = "#4f46e5";
              e.currentTarget.style.color = "#4f46e5";
              e.currentTarget.style.background = "rgba(79,70,229,0.05)";
            }} onMouseOut={e => {
              e.currentTarget.style.borderColor = "#e8eaf6";
              e.currentTarget.style.color = "#6b7280";
              e.currentTarget.style.background = "transparent";
            }}>
                  Open
                </button>
              </div>
            </div>)}
        </div>

        {/* Empty state */}
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
        }}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#0d0f1a",
          marginBottom: 4,
          letterSpacing: "-0.03em"
        }}>
              No tickets found
            </div>
            <div style={{
          fontSize: 13,
          color: "#9ca3af"
        }}>
              Try adjusting your search or filter to find what you're looking for.
            </div>
          </div>}
      </div>

      {/* Bottom status bar */}
      <footer style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 32px",
      borderTop: "1px solid #e8eaf6",
      background: "#ffffff",
      fontSize: 12,
      fontWeight: 500,
      color: "#9ca3af",
      letterSpacing: "-0.01em"
    }}>
        <span>{filtered.length} of {SAMPLE_TICKETS.length} tickets</span>
        <span>Connected · <span style={{
          color: "#059669"
        }}>4 personas active</span></span>
      </footer>
    </div>;
}