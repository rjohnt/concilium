"use client";

import React, { useState } from "react";
import { Hexagon } from "lucide-react";
interface NavItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}
interface TeamItem {
  label: string;
  color: string;
}
const NAV_ITEMS: NavItem[] = [{
  id: "dashboard",
  label: "Dashboard",
  icon: "grid"
}, {
  id: "tickets",
  label: "Tickets",
  icon: "list",
  count: 12
}, {
  id: "personas",
  label: "Personas",
  icon: "users"
}, {
  id: "consensus",
  label: "Consensus",
  icon: "check-circle"
}, {
  id: "builds",
  label: "Builds",
  icon: "activity",
  count: 3
}, {
  id: "settings",
  label: "Settings",
  icon: "settings"
}];
const TEAM_ITEMS: TeamItem[] = [{
  label: "Engineering",
  color: "#3B5BDB"
}, {
  label: "Design",
  color: "#7C3AED"
}, {
  label: "Product",
  color: "#0EA5E9"
}];
function Icon({
  name,
  size = 18
}: {
  name: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    "check-circle": "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    settings: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || paths.grid} />
    </svg>;
}
export function Sidebar() {
  const [activeItem, setActiveItem] = useState("tickets");
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return <div style={{
      width: 60,
      minHeight: "100vh",
      background: "#ffffff",
      borderRight: "1px solid #E4E7EE",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "16px 0",
      gap: 4,
      fontFamily: "'Inter', system-ui, sans-serif",
      boxSizing: "border-box"
    }}>
        {/* Logo */}
        <div style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "#3B5BDB",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "-0.5px",
        marginBottom: 16,
        cursor: "pointer"
      }}>
          C
        </div>
        {NAV_ITEMS.slice(0, -1).map(item => <button key={item.id} onClick={() => setActiveItem(item.id)} style={{
        width: 40,
        height: 40,
        borderRadius: 9,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: activeItem === item.id ? "#EEF2FF" : "transparent",
        color: activeItem === item.id ? "#3B5BDB" : "#9CA3AF",
        border: activeItem === item.id ? "1px solid #C7D2FE" : "1px solid transparent",
        transition: "all 0.12s",
        fontFamily: "inherit"
      }} onMouseOver={e => {
        if (activeItem !== item.id) {
          e.currentTarget.style.background = "#F1F3F9";
          e.currentTarget.style.color = "#374151";
        }
      }} onMouseOut={e => {
        if (activeItem !== item.id) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#9CA3AF";
        }
      }}>
            <Icon name={item.icon} size={16} />
          </button>)}
        <div style={{
        flex: 1
      }} />
        <button onClick={() => setCollapsed(false)} style={{
        width: 40,
        height: 40,
        borderRadius: 9,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: "#9CA3AF",
        border: "none",
        fontFamily: "inherit",
        transition: "color 0.12s"
      }} onMouseOver={e => e.currentTarget.style.color = "#374151"} onMouseOut={e => e.currentTarget.style.color = "#9CA3AF"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>;
  }
  return <aside style={{
    width: 256,
    minHeight: "100vh",
    background: "#ffffff",
    borderRight: "1px solid #E4E7EE",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#374151",
    boxSizing: "border-box"
  }}>
      {/* Header */}
      <div style={{
      padding: "20px 20px 16px",
      borderBottom: "1px solid #E4E7EE",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
          <div style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "2px 0"
        }}>
            <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "#3B5BDB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
              <Hexagon size={15} color="#ffffff" strokeWidth={2.5} fill="rgba(255,255,255,0.15)" />
            </div>
            <span style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#3B5BDB",
            letterSpacing: "-0.6px",
            lineHeight: 1
          }}>concilium</span>
          </div>
          <div>
            <div style={{
            fontSize: 11,
            color: "#9CA3AF",
            marginTop: 1,
            letterSpacing: "0.02em"
          }}>
              firebird
            </div>
          </div>
        </div>
        <button onClick={() => setCollapsed(true)} style={{
        background: "none",
        border: "none",
        color: "#9CA3AF",
        cursor: "pointer",
        padding: 4,
        borderRadius: 6,
        fontFamily: "inherit",
        transition: "color 0.12s",
        display: "flex",
        alignItems: "center"
      }} onMouseOver={e => e.currentTarget.style.color = "#374151"} onMouseOut={e => e.currentTarget.style.color = "#9CA3AF"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div style={{
      padding: "12px 16px"
    }}>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 8,
        background: "#F7F8FA",
        border: "1px solid #E4E7EE"
      }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input type="text" placeholder="Search..." style={{
          background: "none",
          border: "none",
          outline: "none",
          color: "#0D1117",
          fontSize: 12,
          fontWeight: 400,
          width: "100%",
          fontFamily: "inherit",
          letterSpacing: "0.01em"
        }} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{
      flex: 1,
      padding: "4px 8px"
    }}>
        <div style={{
        padding: "8px 12px 6px",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#9CA3AF"
      }}>
          Navigation
        </div>
        {NAV_ITEMS.map(item => <button key={item.id} onClick={() => setActiveItem(item.id)} style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 12px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: activeItem === item.id ? 600 : 500,
        letterSpacing: "-0.1px",
        fontFamily: "inherit",
        background: activeItem === item.id ? "#EEF2FF" : "transparent",
        color: activeItem === item.id ? "#3B5BDB" : "#374151",
        border: activeItem === item.id ? "1px solid #C7D2FE" : "1px solid transparent",
        transition: "all 0.12s"
      }} onMouseOver={e => {
        if (activeItem !== item.id) {
          e.currentTarget.style.background = "#F1F3F9";
          e.currentTarget.style.color = "#0D1117";
        }
      }} onMouseOut={e => {
        if (activeItem !== item.id) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#374151";
        }
      }}>
            <Icon name={item.icon} size={16} />
            <span style={{
          flex: 1,
          textAlign: "left"
        }}>{item.label}</span>
            {item.count !== undefined && <span style={{
          padding: "1px 7px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          background: activeItem === item.id ? "#C7D2FE" : "#F1F3F9",
          color: activeItem === item.id ? "#3B5BDB" : "#6B7280",
          letterSpacing: "0.01em"
        }}>
                {item.count}
              </span>}
          </button>)}
      </nav>

      {/* Teams */}
      <div style={{
      padding: "4px 8px",
      borderTop: "1px solid #E4E7EE"
    }}>
        <div style={{
        padding: "8px 12px 6px",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#9CA3AF"
      }}>
          Teams
        </div>
        {TEAM_ITEMS.map(team => <div key={team.label} style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.1px",
        color: "#374151",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.12s"
      }} onMouseOver={e => {
        e.currentTarget.style.background = "#F1F3F9";
      }} onMouseOut={e => {
        e.currentTarget.style.background = "transparent";
      }}>
            <div style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: team.color,
          flexShrink: 0
        }} />
            <span>{team.label}</span>
          </div>)}
      </div>

      {/* User footer */}
      <div style={{
      padding: "12px 16px",
      borderTop: "1px solid #E4E7EE",
      display: "flex",
      alignItems: "center",
      gap: 10
    }}>
        <div style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#EEF2FF",
        border: "1.5px solid #C7D2FE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        color: "#3B5BDB",
        letterSpacing: "0.02em",
        flexShrink: 0
      }}>
          RT
        </div>
        <div style={{
        flex: 1
      }}>
          <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#0D1117",
          letterSpacing: "-0.2px"
        }}>
            Ryan
          </div>
          <div style={{
          fontSize: 11,
          color: "#9CA3AF",
          letterSpacing: "0.01em"
        }}>
            Free plan
          </div>
        </div>
      </div>
    </aside>;
}