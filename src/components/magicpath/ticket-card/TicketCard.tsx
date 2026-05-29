"use client";

import React, { useState } from "react";
type TicketStatus = "draft" | "in-review" | "consensus" | "building" | "done";
interface TicketCardProps {
  id: string;
  title: string;
  status: TicketStatus;
  priority: number;
  assignee: string;
  tags: string[];
}
const STATUS_CONFIG: Record<TicketStatus, {
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
  "in-review": {
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
const PRIORITY_LABELS = ["Urgent", "High", "Medium", "Low", "Backlog"];
const PRIORITY_CONFIG = [{
  color: "#DC2626",
  bg: "#FEF2F2",
  border: "#FECACA"
}, {
  color: "#EA580C",
  bg: "#FFF7ED",
  border: "#FDBA74"
}, {
  color: "#2563EB",
  bg: "#EFF6FF",
  border: "#93C5FD"
}, {
  color: "#64748B",
  bg: "#F1F5F9",
  border: "#CBD5E1"
}, {
  color: "#94A3B8",
  bg: "#F8FAFC",
  border: "#E2E8F0"
}];
const ASSIGNEE_ACCENT_COLORS = ["#2563EB", "#7C3AED", "#0891B2", "#059669", "#DC2626"];
export function TicketCard({
  id,
  title,
  status,
  priority,
  assignee,
  tags
}: TicketCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const statusCfg = STATUS_CONFIG[status];
  const priorityCfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG[3];
  const avatarColor = ASSIGNEE_ACCENT_COLORS[assignee.charCodeAt(0) % ASSIGNEE_ACCENT_COLORS.length];
  return <div style={{
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "13px 18px",
    borderRadius: 10,
    background: isHovered ? "#FFFFFF" : "#FFFFFF",
    border: isHovered ? "1px solid #CBD5E1" : "1px solid #E8ECF2",
    boxShadow: isHovered ? "0 2px 12px 0 rgba(30,41,59,0.10)" : "0 1px 3px 0 rgba(30,41,59,0.05)",
    cursor: "pointer",
    transition: "all 0.18s ease",
    width: "100%",
    boxSizing: "border-box"
  }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {/* ID + Title */}
      <div style={{
      flex: 1,
      minWidth: 0
    }}>
        <div style={{
        fontSize: 11,
        color: "#94A3B8",
        marginBottom: 2,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase"
      }}>
          {id}
        </div>
        <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: "#0F172A",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        letterSpacing: "-0.01em"
      }}>
          {title}
        </div>
      </div>

      {/* Status badge */}
      <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 9px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
      background: statusCfg.bg,
      color: statusCfg.color,
      border: `1px solid ${statusCfg.border}`,
      letterSpacing: "-0.01em"
    }}>
        <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: statusCfg.color,
        flexShrink: 0
      }} />
        {statusCfg.label}
      </span>

      {/* Priority badge */}
      <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 9px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
      background: priorityCfg.bg,
      color: priorityCfg.color,
      border: `1px solid ${priorityCfg.border}`,
      letterSpacing: "-0.01em"
    }}>
        {PRIORITY_LABELS[priority]}
      </span>

      {/* Tags */}
      {tags.length > 0 && <div style={{
      display: "flex",
      gap: 4
    }}>
          {tags.slice(0, 2).map(tag => <span key={tag} style={{
        padding: "3px 8px",
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: "#F1F5F9",
        color: "#475569",
        border: "1px solid #E2E8F0",
        letterSpacing: "0.02em"
      }}>
              {tag}
            </span>)}
          {tags.length > 2 && <span style={{
        padding: "3px 8px",
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 500,
        color: "#94A3B8",
        background: "#F8FAFC",
        border: "1px solid #E2E8F0"
      }}>
              +{tags.length - 2}
            </span>}
        </div>}

      {/* Assignee avatar */}
      <div style={{
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: `${avatarColor}14`,
      border: `1.5px solid ${avatarColor}30`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
      color: avatarColor,
      flexShrink: 0,
      letterSpacing: "0.02em"
    }}>
        {assignee.charAt(0)}
      </div>

      {/* Open button */}
      <button style={{
      padding: "5px 11px",
      borderRadius: 7,
      background: isHovered ? "#2563EB" : "transparent",
      border: "1px solid " + (isHovered ? "#2563EB" : "#CBD5E1"),
      color: isHovered ? "#FFFFFF" : "#64748B",
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 0.15s",
      flexShrink: 0,
      letterSpacing: "0.01em"
    }}>
        Open →
      </button>
    </div>;
}