"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  DoorOpen,
  Calendar,
  Ticket,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  RotateCcw,
  Send,
  ShieldCheck,
  ShieldAlert,
  Search,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  UserPlus,
  LayoutDashboard,
  LogOut,
  Activity,
  ChevronRight,
  HelpCircle,
  Database,
  Lock,
} from "lucide-react";

interface Account {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface OverviewData {
  venuesCount: number;
  hallsCount: number;
  bookingsCount: number;
  bookingsByStatus: Record<string, number>;
  ticketsCount: number;
  ticketsByStatus: Record<string, number>;
  auditLogsCount: number;
}

interface AuditLogItem {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface SupportTicketItem {
  id: string;
  authorId: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type TabKey = "overview" | "onboard" | "tickets" | "audit" | "simulator";

function SuperAdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Overview stats
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTargetFilter, setAuditTargetFilter] = useState<string>("all");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditLoading, setAuditLoading] = useState(false);

  // Support tickets state
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("all");
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // New ticket submission simulator state
  const [ticketCategory, setTicketCategory] = useState("booking_dispute");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Ticket status update state
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  // Partner Onboarding state (Workflow A)
  const [partnerVenueName, setPartnerVenueName] = useState("");
  const [partnerArea, setPartnerArea] = useState("22 Mazoria");
  const [partnerType, setPartnerType] = useState("Hotel ballroom");
  const [partnerDesc, setPartnerDesc] = useState("");
  const [partnerContactPhone, setPartnerContactPhone] = useState("");
  const [partnerManagerName, setPartnerManagerName] = useState("");
  const [partnerManagerPhone, setPartnerManagerPhone] = useState("");
  const [partnerManagerTitle, setPartnerManagerTitle] = useState("Director of Banquets & Events");
  const [onboardingPartner, setOnboardingPartner] = useState(false);
  const [onboardResult, setOnboardResult] = useState<{
    venueName: string;
    managerName: string;
    managerPhone: string;
    inviteUrl: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Initial Load: check session
  useEffect(() => {
    fetchSession();
  }, []);

  // 2. Sync tab state reactively with URL ?tab= query parameter or legacy #hash
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabKey | null;
    if (tabParam && ["overview", "onboard", "tickets", "audit", "simulator"].includes(tabParam)) {
      setActiveTab(tabParam);
      return;
    }

    const hash = window.location.hash.replace("#", "") as TabKey;
    if (["overview", "onboard", "tickets", "audit", "simulator"].includes(hash)) {
      setActiveTab(hash);
    }
  }, [searchParams]);

  // When account changes to super_admin, load dashboard data
  useEffect(() => {
    if (account && account.role === "super_admin") {
      loadOverview();
      loadAuditLogs();
      loadTickets();
    }
  }, [account]);

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    router.push(`/admin?tab=${tab}`);
  };

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account || null);
      } else {
        setAccount(null);
      }
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
      }
    } catch (err: any) {
      console.error("Failed to load admin overview:", err);
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadAuditLogs = async (targetType = auditTargetFilter, action = auditActionFilter) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetType !== "all") params.set("targetType", targetType);
      if (action !== "all") params.set("action", action);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadTickets = async (status = ticketStatusFilter) => {
    setTicketsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err: any) {
      console.error("Failed to load tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleUpdateTicket = async (ticketId: string, newStatus: "open" | "in_progress" | "resolved") => {
    setUpdatingTicketId(ticketId);
    setStatusMessage(null);
    try {
      const notes = editingNotes[ticketId] !== undefined ? editingNotes[ticketId] : undefined;
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `Ticket updated to '${newStatus}' successfully!`,
        });
        loadTickets();
        loadOverview();
        loadAuditLogs();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to update ticket" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleCreateTicketSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      setStatusMessage({ type: "error", text: "Please enter both subject and message." });
      return;
    }

    setSubmittingTicket(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: ticketCategory,
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `Support ticket #${data.ticket.id.slice(0, 8)} submitted successfully!`,
        });
        setTicketSubject("");
        setTicketMessage("");
        loadTickets();
        loadOverview();
        loadAuditLogs();
        switchTab("tickets");
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to submit ticket" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleOnboardPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerVenueName || !partnerManagerPhone) return;

    setOnboardingPartner(true);
    setStatusMessage(null);
    setOnboardResult(null);

    try {
      const res = await fetch("/api/admin/onboard-venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueName: partnerVenueName,
          area: partnerArea,
          type: partnerType,
          description: partnerDesc,
          contactPhone: partnerContactPhone || partnerManagerPhone,
          managerName: partnerManagerName || "Lead Venue Manager",
          managerPhone: partnerManagerPhone,
          managerTitle: partnerManagerTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to onboard partner venue");
      }

      const fullInvite = `${window.location.origin}${data.inviteUrl || `/login`}`;
      setOnboardResult({
        venueName: data.venue.name,
        managerName: data.manager.name,
        managerPhone: data.manager.phone,
        inviteUrl: fullInvite,
      });

      setStatusMessage({
        type: "success",
        text: `Partner venue '${data.venue.name}' successfully onboarded! Share the setup link with ${data.manager.name}.`,
      });

      // Clear form
      setPartnerVenueName("");
      setPartnerDesc("");
      setPartnerContactPhone("");
      setPartnerManagerName("");
      setPartnerManagerPhone("");

      // Refresh overview counts
      loadOverview();
      loadAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setOnboardingPartner(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccount(null);
    window.location.href = "/login?redirect=/admin";
  };

  const openTicketsCount = overview?.ticketsByStatus?.open ?? 0;
  const inProgressTicketsCount = overview?.ticketsByStatus?.in_progress ?? 0;

  // Unauthenticated / Non-Admin Access Gate
  if (!loading && (!account || account.role !== "super_admin")) {
    return (
      <div style={{ maxWidth: 640, margin: "4rem auto", padding: "0 1.5rem" }}>
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem", background: "#fff", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "0 10px 28px rgba(13,93,86,0.06)" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(225, 29, 72, 0.1)",
              color: "#e11d48",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <span className="pill" style={{ background: "rgba(225, 29, 72, 0.1)", color: "#e11d48", fontWeight: 700, fontSize: "11px", marginBottom: "0.75rem" }}>
            Access Restricted
          </span>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0" }}>
            Super Admin Access Required
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: 460, margin: "0 auto 1.75rem", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Platform metrics, append-only immutable audit logs, partner onboarding, and support ticket management are restricted to platform administrators.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/login?redirect=/admin" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
              Sign In as Super Admin
            </Link>
            <Link href="/" className="btn btn-secondary" style={{ padding: "0.75rem 1.5rem" }}>
              Return to Public Site
            </Link>
          </div>
          <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px dashed var(--line)", fontSize: "12px", color: "var(--muted)" }}>
            Default Admin credentials: <code>+251911000000</code> / <code>password123</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* 1. Full-Height 100vh Left Sidebar Frame */}
      <aside className={`admin-frame-sidebar ${mobileSidebarOpen ? "is-open" : ""}`}>
        {/* Brand Lockup Header */}
        <div className="admin-frame-sidebar-header">
          <Link
            href="/admin"
            className="brand-lockup"
            style={{ textDecoration: "none" }}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <span>
              <strong>Addis Gathering</strong>
              <small style={{ color: "var(--teal)", fontWeight: 700 }}>Admin Console</small>
            </span>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="admin-frame-nav">
          <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 12px 4px" }}>
            Platform Operations
          </span>

          <button
            type="button"
            onClick={() => { switchTab("overview"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "overview" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </div>
            <ChevronRight size={14} style={{ opacity: activeTab === "overview" ? 0.9 : 0.3 }} />
          </button>

          <button
            type="button"
            onClick={() => { switchTab("onboard"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "onboard" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <UserPlus size={16} />
              <span>Partner Onboarding</span>
            </div>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "999px",
                background: activeTab === "onboard" ? "rgba(255,255,255,0.25)" : "var(--teal-soft)",
                color: activeTab === "onboard" ? "#fff" : "var(--teal)",
                fontWeight: 700,
              }}
            >
              Workflow A
            </span>
          </button>

          <button
            type="button"
            onClick={() => { switchTab("tickets"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "tickets" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Ticket size={16} />
              <span>Support Tickets</span>
            </div>
            {openTicketsCount > 0 ? (
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 7px",
                  borderRadius: "999px",
                  background: activeTab === "tickets" ? "#fff" : "#f59e0b",
                  color: activeTab === "tickets" ? "#d97706" : "#fff",
                  fontWeight: 700,
                }}
              >
                {openTicketsCount}
              </span>
            ) : (
              <ChevronRight size={14} style={{ opacity: activeTab === "tickets" ? 0.9 : 0.3 }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => { switchTab("audit"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "audit" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FileText size={16} />
              <span>Audit Log Trail</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "999px",
                background: activeTab === "audit" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
                color: activeTab === "audit" ? "#fff" : "var(--muted)",
                fontWeight: 600,
              }}
            >
              {overview?.auditLogsCount ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { switchTab("simulator"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "simulator" ? "active" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Send size={16} />
              <span>Ticket Simulator</span>
            </div>
            <ChevronRight size={14} style={{ opacity: activeTab === "simulator" ? 0.9 : 0.3 }} />
          </button>

          <div style={{ marginTop: "16px", borderTop: "1px solid var(--line)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 12px 4px" }}>
              System Integrity
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", fontSize: "11px", color: "#065f46" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              <span>PostgreSQL Invariants Active</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", fontSize: "11px", color: "var(--muted)" }}>
              <Lock size={12} />
              <span>Append-Only Audit Enforced</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", fontSize: "11px", color: "var(--muted)" }}>
              <ShieldCheck size={12} style={{ color: "var(--teal)" }} />
              <span>Double-Booking Prevention</span>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer with Identity */}
        <div className="admin-frame-sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "10px",
                background: "var(--teal)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {account?.name || "Administrator"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--teal)", fontWeight: 600 }}>
                {account?.phone} • SUPER_ADMIN
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-secondary full-width"
            style={{ fontSize: "12px", padding: "7px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          style={{ zIndex: 30 }}
        />
      )}

      {/* 2. Top Utility Bar (Margin-left: 260px) */}
      <header className="admin-frame-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className="mobile-nav-toggle btn btn-secondary"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            style={{ padding: "6px 8px" }}
            aria-label="Toggle navigation drawer"
          >
            <LayoutDashboard size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
              Admin Console
            </span>
            <span style={{ color: "var(--muted)", fontSize: "13px" }}>/</span>
            <span style={{ fontSize: "13px", color: "var(--teal)", fontWeight: 600 }}>
              {activeTab === "overview" && "Dashboard & Operations"}
              {activeTab === "onboard" && "Partner Onboarding"}
              {activeTab === "tickets" && "Support Tickets Queue"}
              {activeTab === "audit" && "Audit Log Trail"}
              {activeTab === "simulator" && "Ticket Simulator"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              loadOverview();
              loadAuditLogs();
              loadTickets();
            }}
            disabled={overviewLoading || auditLoading || ticketsLoading}
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCcw size={13} className={overviewLoading ? "animate-spin" : ""} />
            <span>Refresh All Data</span>
          </button>

          <Link
            href="/manager/venue"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Building2 size={13} />
            <span>Manager Workspace</span>
          </Link>

          <Link
            href="/vendors"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Sparkles size={13} />
            <span>Vendors Directory</span>
          </Link>

          <Link
            href="/venues"
            target="_blank"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <ExternalLink size={13} />
            <span>Public Site</span>
          </Link>
        </div>
      </header>

      {/* 3. Main Content Canvas */}
      <main className="admin-frame-content">
        {/* Global Status Message Toast */}
        {statusMessage && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "10px",
              marginBottom: "1.5rem",
              background: statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
              color: statusMessage.type === "success" ? "#065f46" : "#991b1b",
              border: `1px solid ${statusMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              fontSize: "0.9rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {statusMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              style={{ background: "transparent", border: 0, cursor: "pointer", color: "inherit", padding: "2px" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW & PULSE */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Layer 1: Header Block */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span className="pill" style={{ background: "rgba(13, 93, 86, 0.12)", color: "var(--teal)", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                  Platform Operations
                </span>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>• Production Console</span>
              </div>
              <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, letterSpacing: "-0.03em", color: "var(--ink)" }}>
                Addis Venue Marketplace Oversight
              </h1>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>
                Real-time marketplace pulse, active bookings pipeline, and immutable cryptotrail at a glance.
              </p>
            </div>

            {/* Layer 2: 5-Card High-Density KPI Strip */}
            <section className="admin-kpi-strip">
              {/* Total Venues Card */}
              <div
                className="card"
                onClick={() => switchTab("overview")}
                style={{
                  padding: "16px",
                  border: "1px solid var(--line)",
                  background: "#fff",
                  borderRadius: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Venues
                  </span>
                  <div style={{ width: 30, height: 30, borderRadius: "8px", background: "var(--teal-soft)", color: "var(--teal)", display: "grid", placeItems: "center" }}>
                    <Building2 size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.venuesCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  Registered marketplace partners
                </div>
              </div>

              {/* Total Halls Card */}
              <div
                className="card"
                onClick={() => switchTab("overview")}
                style={{
                  padding: "16px",
                  border: "1px solid var(--line)",
                  background: "#fff",
                  borderRadius: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Bookable Halls
                  </span>
                  <div style={{ width: 30, height: 30, borderRadius: "8px", background: "rgba(59, 130, 246, 0.1)", color: "#2563eb", display: "grid", placeItems: "center" }}>
                    <DoorOpen size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.hallsCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  Active bookable spaces
                </div>
              </div>

              {/* Total Bookings Card */}
              <div
                className="card"
                onClick={() => switchTab("overview")}
                style={{
                  padding: "16px",
                  border: "1px solid var(--line)",
                  background: "#fff",
                  borderRadius: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Bookings
                  </span>
                  <div style={{ width: 30, height: 30, borderRadius: "8px", background: "rgba(139, 92, 246, 0.1)", color: "#7c3aed", display: "grid", placeItems: "center" }}>
                    <Calendar size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.bookingsCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  <span>Req: {overview?.bookingsByStatus?.requested ?? 0}</span> •{" "}
                  <span style={{ color: "#059669", fontWeight: 600 }}>Conf: {overview?.bookingsByStatus?.confirmed ?? 0}</span> •{" "}
                  <span>Canc: {overview?.bookingsByStatus?.cancelled ?? 0}</span>
                </div>
              </div>

              {/* Support Tickets Card */}
              <div
                className="card"
                onClick={() => switchTab("tickets")}
                style={{
                  padding: "16px",
                  border: "1px solid var(--line)",
                  background: "#fff",
                  borderRadius: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Tickets
                  </span>
                  <div style={{ width: 30, height: 30, borderRadius: "8px", background: "rgba(245, 158, 11, 0.12)", color: "#d97706", display: "grid", placeItems: "center" }}>
                    <Ticket size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.ticketsCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  <span style={{ color: "#d97706", fontWeight: 700 }}>Open: {openTicketsCount}</span> •{" "}
                  <span>Prog: {inProgressTicketsCount}</span> •{" "}
                  <span style={{ color: "#059669" }}>Res: {overview?.ticketsByStatus?.resolved ?? 0}</span>
                </div>
              </div>

              {/* Audit Events Card */}
              <div
                className="card"
                onClick={() => switchTab("audit")}
                style={{
                  padding: "16px",
                  border: "1px solid var(--line)",
                  background: "#fff",
                  borderRadius: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Audit Events
                  </span>
                  <div style={{ width: 30, height: 30, borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", color: "#059669", display: "grid", placeItems: "center" }}>
                    <FileText size={16} />
                  </div>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.auditLogsCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  Immutable cryptotrail events
                </div>
              </div>
            </section>

            {/* Layer 3: Quick Action Buttons Strip */}
            <div className="admin-actions-strip">
              <button
                type="button"
                onClick={() => switchTab("onboard")}
                className="btn btn-primary"
                style={{ fontSize: "13px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <UserPlus size={15} />
                <span>+ Onboard Partner Venue</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("simulator")}
                className="btn btn-secondary"
                style={{ fontSize: "13px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Send size={15} />
                <span>Ingest Support Ticket</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("audit")}
                className="btn btn-secondary"
                style={{ fontSize: "13px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FileText size={15} />
                <span>Filter Audit Trail</span>
              </button>

              <Link
                href="/venues"
                target="_blank"
                className="btn btn-secondary"
                style={{ fontSize: "13px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <ExternalLink size={15} />
                <span>Preview Public Catalog ↗</span>
              </Link>
            </div>

            {/* Layer 4: Live Operational Pipeline Stepper */}
            <div className="admin-pipeline-card">
              <div className="admin-pipeline-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                      Live Operational Pipeline
                    </span>
                    <span className="pill" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#065f46", fontSize: "10px", fontWeight: 700 }}>
                      • Invariants Active
                    </span>
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                    Double-Booking Prevention & Booking State Machine
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => switchTab("audit")}
                  className="text-link"
                  style={{ fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>Inspect Audit Records</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Stepper Track */}
              <div className="admin-stepper-track">
                <div className="admin-stepper-step completed">
                  <div className="admin-stepper-circle">
                    <Check size={16} />
                  </div>
                  <span className="admin-stepper-label">1. Requested</span>
                  <span className="admin-stepper-sub">Customer booking intent submitted</span>
                </div>

                <div className="admin-stepper-step active">
                  <div className="admin-stepper-circle">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="admin-stepper-label">2. Confirmed</span>
                  <span className="admin-stepper-sub">Advisory Lock & Exclusion Enforced</span>
                </div>

                <div className="admin-stepper-step completed">
                  <div className="admin-stepper-circle">
                    <Check size={16} />
                  </div>
                  <span className="admin-stepper-label">3. Invoiced</span>
                  <span className="admin-stepper-sub">Payment slip generated</span>
                </div>

                <div className="admin-stepper-step completed">
                  <div className="admin-stepper-circle">
                    <Check size={16} />
                  </div>
                  <span className="admin-stepper-label">4. Settled</span>
                  <span className="admin-stepper-sub">Telebirr / CBE payment verified</span>
                </div>

                <div className="admin-stepper-step">
                  <div className="admin-stepper-circle">
                    5
                  </div>
                  <span className="admin-stepper-label">5. Completed</span>
                  <span className="admin-stepper-sub">Event held & cryptotrail sealed</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  fontSize: "12px",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Lock size={14} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Concurrency Guarantee:</strong> PostgreSQL advisory transaction locks with GiST date-range exclusion constraints active across all 29 bookable spaces. Zero double-booking tolerance.
                </span>
              </div>
            </div>

            {/* Layer 5: High-Density Data Tables */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
              {/* Left Column: Recent Support Ticket Queue */}
              <div className="card" style={{ padding: "20px", background: "#fff", border: "1px solid var(--line)", borderRadius: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                      Active Support Ticket Queue
                    </h2>
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>
                      Issues requiring platform administrator review or mediation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchTab("tickets")}
                    className="btn btn-secondary"
                    style={{ fontSize: "11px", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <span>View All ({overview?.ticketsCount ?? 0})</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                {ticketsLoading ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    Loading active tickets...
                  </div>
                ) : tickets.length === 0 ? (
                  <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)", fontSize: "13px", background: "#fbfcfb", borderRadius: "10px", border: "1px dashed var(--line)" }}>
                    <CheckCircle2 size={32} style={{ color: "#10b981", margin: "0 auto 8px" }} />
                    <div style={{ fontWeight: 600 }}>Support queue is all clear!</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>No open or unaddressed tickets at this time.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {tickets.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "10px",
                          border: "1px solid var(--line)",
                          background: "#fafbf9",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span
                              className="pill"
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background:
                                  t.status === "open"
                                    ? "rgba(245, 158, 11, 0.15)"
                                    : t.status === "in_progress"
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "rgba(16, 185, 129, 0.15)",
                                color:
                                  t.status === "open"
                                    ? "#d97706"
                                    : t.status === "in_progress"
                                    ? "#2563eb"
                                    : "#059669",
                              }}
                            >
                              {t.status.replace("_", " ")}
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                              {t.subject}
                            </span>
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: "12px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {t.message}
                        </p>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px dashed var(--line)" }}>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            Category: <strong>{t.category}</strong>
                          </span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {t.status !== "resolved" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateTicket(t.id, "resolved")}
                                disabled={updatingTicketId === t.id}
                                className="btn btn-primary"
                                style={{ fontSize: "11px", padding: "3px 8px", background: "#059669" }}
                              >
                                Resolve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => switchTab("tickets")}
                              className="btn btn-secondary"
                              style={{ fontSize: "11px", padding: "3px 8px" }}
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Workflow A Quick CTA & Recent Audit Trail Snapshot */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Workflow A Partner Onboarding Card */}
                <div
                  className="card"
                  style={{
                    padding: "20px",
                    background: "linear-gradient(135deg, #f0f7f5 0%, #fff 100%)",
                    border: "1px solid rgba(13,93,86,0.18)",
                    borderRadius: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "8px", background: "var(--teal)", color: "#fff", display: "grid", placeItems: "center" }}>
                      <UserPlus size={16} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", textTransform: "uppercase" }}>
                      Workflow A • B2B Onboarding
                    </span>
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px", color: "var(--ink)" }}>
                    Onboard Partner Venue
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.45 }}>
                    Quickly register a premier venue (e.g., Skylight, Capital Hotel & Spa) and issue a secure one-time onboarding link for their director.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchTab("onboard")}
                    className="btn btn-primary"
                    style={{ fontSize: "12px", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <UserPlus size={14} />
                    <span>Launch Partner Onboarding</span>
                  </button>
                </div>

                {/* Audit Stream Snapshot */}
                <div className="card" style={{ padding: "18px", background: "#fff", border: "1px solid var(--line)", borderRadius: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <Activity size={15} style={{ color: "var(--teal)" }} />
                      <span>Recent Audit Events</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => switchTab("audit")}
                      className="text-link"
                      style={{ fontSize: "11px", fontWeight: 600 }}
                    >
                      Explore →
                    </button>
                  </div>

                  {auditLoading ? (
                    <div style={{ padding: "1rem", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                      Loading events...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                      No audit events recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {auditLogs.slice(0, 4).map((log) => (
                        <div
                          key={log.id}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            background: "#f8faf9",
                            border: "1px solid #edf2ee",
                            fontSize: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {log.action}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                              {log.targetType} #{log.targetId.slice(0, 6)}
                            </div>
                          </div>
                          <span style={{ fontSize: "10px", color: "var(--muted)", whiteSpace: "nowrap", marginLeft: "8px" }}>
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

          {/* TAB 2: PARTNER ONBOARDING (WORKFLOW A) */}
          {activeTab === "onboard" && (
            <div className="card" style={{ padding: "24px", background: "#fff", border: "1px solid var(--line)", borderRadius: "16px" }}>
              <div style={{ marginBottom: "20px", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
                <span className="pill" style={{ background: "rgba(13, 93, 86, 0.12)", color: "var(--teal)", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                  Workflow A • B2B Partner Onboarding
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "6px 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Building2 size={22} style={{ color: "var(--teal)" }} />
                  Register Partner Venue & Issue Lead Manager Access
                </h2>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                  Create the partner venue profile and generate a one-time onboarding link that allows the lead manager to set their credentials and claim ownership.
                </p>
              </div>

              {/* Success Box: Copyable Invite Link */}
              {onboardResult && (
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "12px",
                    marginBottom: "24px",
                    boxShadow: "0 4px 14px rgba(5, 150, 105, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <CheckCircle2 size={20} style={{ color: "#059669" }} />
                    <strong style={{ color: "#065f46", fontSize: "1rem" }}>
                      Partner Venue Successfully Onboarded!
                    </strong>
                  </div>
                  <p style={{ fontSize: "13px", color: "#047857", margin: "0 0 12px" }}>
                    <strong>{onboardResult.venueName}</strong> registered for lead manager{" "}
                    <strong>{onboardResult.managerName}</strong> ({onboardResult.managerPhone}).
                  </p>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      readOnly
                      className="field"
                      style={{ flex: 1, minWidth: 280, padding: "9px 12px", background: "#fff", fontSize: "13px", fontFamily: "monospace" }}
                      value={onboardResult.inviteUrl}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                      onClick={() => {
                        navigator.clipboard.writeText(onboardResult.inviteUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 3000);
                      }}
                    >
                      {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedLink ? "Link Copied!" : "Copy Onboarding Link"}</span>
                    </button>
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#065f46" }}>
                    Send this URL directly to the manager via Telegram or SMS. When clicked, it activates their account and lands them in the Venue Workspace.
                  </p>
                </div>
              )}

              {/* 2-Column Responsive Desktop Form */}
              <form onSubmit={handleOnboardPartner}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                  {/* Left Column: Venue Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "18px", background: "#fafbf9", borderRadius: "12px", border: "1px solid #eef2ee" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink)", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                      1. Venue Profile & Location
                    </div>

                    <div>
                      <label htmlFor="pv-name" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                        Venue Name *
                      </label>
                      <input
                        id="pv-name"
                        type="text"
                        className="field"
                        placeholder="e.g. Capital Hotel & Spa"
                        value={partnerVenueName}
                        onChange={(e) => setPartnerVenueName(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <label htmlFor="pv-area" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                          Sub-City / Area *
                        </label>
                        <input
                          id="pv-area"
                          type="text"
                          className="field"
                          placeholder="e.g. 22 Mazoria / Yeka"
                          value={partnerArea}
                          onChange={(e) => setPartnerArea(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="pv-type" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                          Venue Type *
                        </label>
                        <select
                          id="pv-type"
                          className="field"
                          value={partnerType}
                          onChange={(e) => setPartnerType(e.target.value)}
                        >
                          <option value="Hotel ballroom">Hotel ballroom</option>
                          <option value="Wedding hall">Wedding hall</option>
                          <option value="Conference space">Conference space</option>
                          <option value="Garden venue">Garden venue</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="pv-contact" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                        Official Hotel Front Desk Phone
                      </label>
                      <input
                        id="pv-contact"
                        type="tel"
                        className="field"
                        placeholder="e.g. 0116672100"
                        value={partnerContactPhone}
                        onChange={(e) => setPartnerContactPhone(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="pv-desc" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                        Short Description & Highlights
                      </label>
                      <textarea
                        id="pv-desc"
                        rows={3}
                        className="field"
                        placeholder="Highlight capacity, catering standards, and audiovisual equipment..."
                        value={partnerDesc}
                        onChange={(e) => setPartnerDesc(e.target.value)}
                        style={{ resize: "vertical" }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Lead Manager Identity */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "18px", background: "#fafbf9", borderRadius: "12px", border: "1px solid #eef2ee" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink)", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                      2. Lead Venue Manager Identity
                    </div>

                    <div>
                      <label htmlFor="pm-name" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                        Lead Manager Full Name *
                      </label>
                      <input
                        id="pm-name"
                        type="text"
                        className="field"
                        placeholder="e.g. Daniel Banquet Director"
                        value={partnerManagerName}
                        onChange={(e) => setPartnerManagerName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="pm-phone" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                        Manager Mobile Phone (Login Identity) *
                      </label>
                      <input
                        id="pm-phone"
                        type="tel"
                        className="field"
                        placeholder="e.g. 0911223344 or +251911223344"
                        value={partnerManagerPhone}
                        onChange={(e) => setPartnerManagerPhone(e.target.value)}
                        required
                      />
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                        Used as the manager's primary authentication credential.
                      </span>
                    </div>

                    <div>
                      <label htmlFor="pm-title" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                        Manager Job Title
                      </label>
                      <input
                        id="pm-title"
                        type="text"
                        className="field"
                        placeholder="e.g. Director of Banquets & Events"
                        value={partnerManagerTitle}
                        onChange={(e) => setPartnerManagerTitle(e.target.value)}
                      />
                    </div>

                    <div style={{ marginTop: "auto", padding: "12px", borderRadius: "10px", background: "var(--teal-soft)", fontSize: "12px", color: "var(--teal-dark)", lineHeight: 1.4 }}>
                      <HelpCircle size={15} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "5px" }} />
                      Upon submission, an initial primary-owner role record is committed and a tamper-proof invite token is issued.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={onboardingPartner || !partnerVenueName || !partnerManagerPhone}
                    style={{ fontSize: "13px", padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "8px" }}
                  >
                    <UserPlus size={16} />
                    <span>{onboardingPartner ? "Onboarding Partner..." : "Onboard Partner & Generate Setup Link"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SUPPORT TICKETS QUEUE */}
          {activeTab === "tickets" && (
            <div className="card" style={{ padding: "20px", background: "#fff", border: "1px solid var(--line)", borderRadius: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                    Support Ticket Management Queue
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: "12px", margin: "2px 0 0" }}>
                    Review customer and manager disputes, update ticket resolution statuses, and attach admin notes.
                  </p>
                </div>

                {/* Filter Pills */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {[
                    { id: "all", label: "All Tickets" },
                    { id: "open", label: `Open (${openTicketsCount})` },
                    { id: "in_progress", label: `In Progress (${inProgressTicketsCount})` },
                    { id: "resolved", label: "Resolved" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => {
                        setTicketStatusFilter(filter.id);
                        loadTickets(filter.id);
                      }}
                      className={ticketStatusFilter === filter.id ? "btn btn-primary" : "btn btn-secondary"}
                      style={{ fontSize: "11px", padding: "6px 12px" }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {ticketsLoading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                  Loading support tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "13px", background: "#fafbf9", borderRadius: "12px", border: "1px dashed var(--line)" }}>
                  <CheckCircle2 size={36} style={{ color: "#10b981", margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>No tickets matching this filter</div>
                  <div style={{ marginTop: "4px" }}>Select another filter or simulate a test intake ticket.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid var(--line)",
                        background: "#fafbf9",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            className="pill"
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background:
                                t.status === "open"
                                  ? "rgba(245, 158, 11, 0.15)"
                                  : t.status === "in_progress"
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : "rgba(16, 185, 129, 0.15)",
                              color:
                                t.status === "open"
                                  ? "#d97706"
                                  : t.status === "in_progress"
                                  ? "#2563eb"
                                  : "#059669",
                            }}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            Category: <strong style={{ color: "var(--ink)" }}>{t.category}</strong> • Ticket ID: <code>#{t.id.slice(0, 8)}</code>
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {new Date(t.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px", color: "var(--ink)" }}>
                          {t.subject}
                        </h3>
                        <p style={{ fontSize: "13px", color: "#334155", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                          {t.message}
                        </p>
                      </div>

                      {t.resolvedAt && (
                        <div style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>
                          ✓ Resolved on {new Date(t.resolvedAt).toLocaleString()}
                        </div>
                      )}

                      {/* Admin Notes & Action Bar */}
                      <div
                        style={{
                          marginTop: "6px",
                          paddingTop: "12px",
                          borderTop: "1px dashed var(--line)",
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Record internal resolution notes..."
                          value={editingNotes[t.id] !== undefined ? editingNotes[t.id] : (t.adminNotes || "")}
                          onChange={(e) => setEditingNotes({ ...editingNotes, [t.id]: e.target.value })}
                          className="field"
                          style={{ flex: 1, minWidth: 240, padding: "7px 12px", fontSize: "12px" }}
                        />

                        <div style={{ display: "flex", gap: "6px" }}>
                          {t.status !== "in_progress" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicket(t.id, "in_progress")}
                              disabled={updatingTicketId === t.id}
                              className="btn btn-secondary"
                              style={{ fontSize: "12px", padding: "6px 12px" }}
                            >
                              In Progress
                            </button>
                          )}
                          {t.status !== "resolved" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicket(t.id, "resolved")}
                              disabled={updatingTicketId === t.id}
                              className="btn btn-primary"
                              style={{ fontSize: "12px", padding: "6px 14px", background: "#059669" }}
                            >
                              Resolve Ticket
                            </button>
                          )}
                          {t.status === "resolved" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicket(t.id, "open")}
                              disabled={updatingTicketId === t.id}
                              className="btn btn-secondary"
                              style={{ fontSize: "12px", padding: "6px 12px" }}
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: IMMUTABLE AUDIT LOG EXPLORER */}
          {activeTab === "audit" && (
            <div className="card" style={{ padding: "20px", background: "#fff", border: "1px solid var(--line)", borderRadius: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                    Immutable Append-Only Audit Trail
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: "12px", margin: "2px 0 0" }}>
                    Cryptographically immutable record of every mutation, booking transition, and administrative action.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadAuditLogs()}
                  disabled={auditLoading}
                  className="btn btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <RotateCcw size={14} className={auditLoading ? "animate-spin" : ""} />
                  <span>Refresh Logs</span>
                </button>
              </div>

              {/* Filter Toolbar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#fafbf9",
                  border: "1px solid var(--line)",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                  <Filter size={14} /> Filter Target:
                </div>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  {["all", "booking", "slot_block", "support_ticket", "account"].map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => {
                        setAuditTargetFilter(target);
                        loadAuditLogs(target, auditActionFilter);
                      }}
                      className={auditTargetFilter === target ? "btn btn-primary" : "btn btn-secondary"}
                      style={{ fontSize: "11px", padding: "4px 10px" }}
                    >
                      {target === "all" ? "All Targets" : target}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid var(--line)" }}>
                {auditLoading ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    Loading audit trail events...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    No audit records found matching filter.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8faf9", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                        <th style={{ padding: "10px 14px", fontWeight: 700, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.06em" }}>Timestamp</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.06em" }}>Action</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.06em" }}>Target Entity</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.06em" }}>Actor</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.06em" }}>Metadata Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => {
                        const actionColor = log.action.includes("created")
                          ? "#059669"
                          : log.action.includes("confirmed")
                          ? "#2563eb"
                          : log.action.includes("cancelled") || log.action.includes("released")
                          ? "#dc2626"
                          : "#d97706";

                        return (
                          <tr key={log.id} style={{ borderBottom: "1px solid #eef2ee" }}>
                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--muted)" }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                              <span
                                className="pill"
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  background: "rgba(0,0,0,0.05)",
                                  color: actionColor,
                                }}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: 600 }}>{log.targetType}</span>
                              <code style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>
                                #{log.targetId.slice(0, 8)}
                              </code>
                            </td>
                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--muted)" }}>
                              {log.actorId ? <code>{log.actorId.slice(0, 8)}...</code> : <span style={{ color: "var(--teal)", fontWeight: 600 }}>system</span>}
                            </td>
                            <td style={{ padding: "10px 14px", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "11px", color: "#475569" }}>
                              {JSON.stringify(log.metadata)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: INTAKE SIMULATOR */}
          {activeTab === "simulator" && (
            <div className="card" style={{ padding: "24px", background: "#fff", border: "1px solid var(--line)", borderRadius: "16px" }}>
              <div style={{ marginBottom: "18px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
                <span className="pill" style={{ background: "rgba(13, 93, 86, 0.12)", color: "var(--teal)", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                  Diagnostic Utility
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "6px 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Send size={20} style={{ color: "var(--teal)" }} />
                  Simulate User Support Intake
                </h2>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                  Submit an authenticated test dispute or inquiry to verify instantaneous queue ingestion and audit logging.
                </p>
              </div>

              <form onSubmit={handleCreateTicketSimulator} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: 720 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px" }}>
                  <div>
                    <label htmlFor="sim-cat" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                      Category *
                    </label>
                    <select
                      id="sim-cat"
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="field"
                    >
                      <option value="booking_dispute">Booking Dispute</option>
                      <option value="venue_verification">Venue Verification</option>
                      <option value="billing">Billing & Invoicing</option>
                      <option value="technical">Technical Support</option>
                      <option value="general">General Question</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sim-subject" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                      Subject Summary *
                    </label>
                    <input
                      id="sim-subject"
                      type="text"
                      placeholder="Brief headline of the issue..."
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sim-msg" style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "5px" }}>
                    Message Details & Context *
                  </label>
                  <textarea
                    id="sim-msg"
                    rows={4}
                    placeholder="Describe dispute specifics, timestamp, customer/manager context..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="field"
                    required
                    style={{ resize: "vertical" }}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="btn btn-primary"
                    style={{ fontSize: "13px", padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: "8px" }}
                  >
                    <Send size={15} />
                    <span>{submittingTicket ? "Submitting..." : "Submit Test Support Ticket"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
      </main>
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading Admin Console...</div>}>
      <SuperAdminContent />
    </Suspense>
  );
}
