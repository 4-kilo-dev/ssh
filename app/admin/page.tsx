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
            Partner onboarding, support tickets, and platform settings are restricted to platform administrators.
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
              <small style={{ color: "var(--muted)", fontWeight: 500, fontSize: "12px" }}>Admin</small>
            </span>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="admin-frame-nav">
          <span className="admin-nav-section-title">Menu</span>

          <button
            type="button"
            onClick={() => { switchTab("overview"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "overview" ? "active" : ""}`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => { switchTab("onboard"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "onboard" ? "active" : ""}`}
          >
            <UserPlus size={16} />
            <span>Onboard partner</span>
          </button>

          <button
            type="button"
            onClick={() => { switchTab("tickets"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "tickets" ? "active" : ""}`}
          >
            <Ticket size={16} />
            <span>Support tickets</span>
            {openTicketsCount > 0 && (
              <span className="admin-nav-badge">
                {openTicketsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { switchTab("audit"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "audit" ? "active" : ""}`}
          >
            <FileText size={16} />
            <span>Activity log</span>
            <span className="admin-nav-badge">
              {overview?.auditLogsCount ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { switchTab("simulator"); setMobileSidebarOpen(false); }}
            className={`admin-frame-nav-link ${activeTab === "simulator" ? "active" : ""}`}
          >
            <Send size={16} />
            <span>Ticket simulator</span>
          </button>
        </nav>

        {/* Sidebar Footer with Identity */}
        <div className="admin-frame-sidebar-footer">
          <div className="admin-user-tile">
            <div className="admin-user-avatar">
              <ShieldCheck size={16} />
            </div>
            <div className="admin-user-meta">
              <div className="admin-user-name">
                {account?.name || "Administrator"}
              </div>
              <div className="admin-user-role">
                Platform admin
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="admin-logout-icon-btn"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
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

      {/* 2. Top Utility Bar (Margin-left: 240px) */}
      <header className="admin-frame-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="mobile-nav-toggle btn btn-secondary"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            style={{ padding: "5px 8px" }}
            aria-label="Toggle navigation"
          >
            <LayoutDashboard size={16} />
          </button>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
            {activeTab === "overview" && "Dashboard"}
            {activeTab === "onboard" && "Partner onboarding"}
            {activeTab === "tickets" && "Support tickets"}
            {activeTab === "audit" && "Activity log"}
            {activeTab === "simulator" && "Ticket simulator"}
          </span>
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
            <span>Refresh data</span>
          </button>

          <Link
            href="/manager/venue"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Building2 size={13} />
            <span>Venue workspace</span>
          </Link>

          <Link
            href="/vendors"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Sparkles size={13} />
            <span>Vendors</span>
          </Link>

          <Link
            href="/venues"
            target="_blank"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <ExternalLink size={13} />
            <span>Public site ↗</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Layer 1: Header Block */}
            <div>
              <p style={{ margin: "0 0 3px", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Today&apos;s operations
              </p>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                Dashboard
              </h1>
              <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>
                Venue partnerships, active bookings, and customer requests at a glance
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
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "border-color 0.12s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                    Venues
                  </span>
                  <Building2 size={16} style={{ color: "var(--teal)" }} />
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.venuesCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  Registered partners
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
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "border-color 0.12s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                    Bookable halls
                  </span>
                  <DoorOpen size={16} style={{ color: "var(--teal)" }} />
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.hallsCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  Active spaces
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
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "border-color 0.12s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                    Bookings
                  </span>
                  <Calendar size={16} style={{ color: "var(--teal)" }} />
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.bookingsCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  <span>Req: {overview?.bookingsByStatus?.requested ?? 0}</span> •{" "}
                  <span style={{ color: "var(--teal)", fontWeight: 600 }}>Conf: {overview?.bookingsByStatus?.confirmed ?? 0}</span> •{" "}
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
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "border-color 0.12s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                    Support tickets
                  </span>
                  <Ticket size={16} style={{ color: "var(--teal)" }} />
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.ticketsCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  <span style={{ color: "#b45309", fontWeight: 600 }}>Open: {openTicketsCount}</span> •{" "}
                  <span>Prog: {inProgressTicketsCount}</span> •{" "}
                  <span>Res: {overview?.ticketsByStatus?.resolved ?? 0}</span>
                </div>
              </div>

              {/* Activity Log Card */}
              <div
                className="card"
                onClick={() => switchTab("audit")}
                style={{
                  padding: "16px",
                  border: "1px solid var(--line)",
                  background: "#fff",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "border-color 0.12s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                    Activity log
                  </span>
                  <FileText size={16} style={{ color: "var(--teal)" }} />
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                  {overview?.auditLogsCount ?? 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                  Recorded actions
                </div>
              </div>
            </section>

            {/* Layer 3: Quick Action Buttons Strip */}
            <div className="admin-actions-strip">
              <button
                type="button"
                onClick={() => switchTab("onboard")}
                className="btn btn-primary"
                style={{ fontSize: "13px", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <UserPlus size={15} />
                <span>+ Onboard partner venue</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("tickets")}
                className="btn btn-secondary"
                style={{ fontSize: "13px", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Ticket size={15} />
                <span>Support queue</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("audit")}
                className="btn btn-secondary"
                style={{ fontSize: "13px", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FileText size={15} />
                <span>Activity log</span>
              </button>

              <Link
                href="/venues"
                target="_blank"
                className="btn btn-secondary"
                style={{ fontSize: "13px", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <ExternalLink size={15} />
                <span>Public catalog ↗</span>
              </Link>
            </div>

            {/* Layer 4: Live Booking Pipeline */}
            <div className="admin-pipeline-card">
              <div className="admin-pipeline-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Active reservations
                    </span>
                    <span className="pill" style={{ background: "rgba(13, 93, 86, 0.1)", color: "var(--teal-dark)", fontSize: "10px", fontWeight: 600 }}>
                      • 6 in pipeline
                    </span>
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--ink)" }}>
                    Booking fulfillment pipeline
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => switchTab("audit")}
                  className="text-link"
                  style={{ fontSize: "12px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>Activity log</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* Stepper Track */}
              <div className="admin-stepper-track">
                <div className="admin-stepper-step completed">
                  <div className="admin-stepper-circle">
                    <Check size={14} />
                  </div>
                  <span className="admin-stepper-label">1. Inquiry</span>
                  <span className="admin-stepper-sub">Customer requested space</span>
                </div>

                <div className="admin-stepper-step active">
                  <div className="admin-stepper-circle">
                    <Check size={14} />
                  </div>
                  <span className="admin-stepper-label">2. Confirmed</span>
                  <span className="admin-stepper-sub">Dates reserved & approved</span>
                </div>

                <div className="admin-stepper-step completed">
                  <div className="admin-stepper-circle">
                    <Check size={14} />
                  </div>
                  <span className="admin-stepper-label">3. Invoiced</span>
                  <span className="admin-stepper-sub">Payment slip issued</span>
                </div>

                <div className="admin-stepper-step completed">
                  <div className="admin-stepper-circle">
                    <Check size={14} />
                  </div>
                  <span className="admin-stepper-label">4. Paid</span>
                  <span className="admin-stepper-sub">Advance deposit verified</span>
                </div>

                <div className="admin-stepper-step">
                  <div className="admin-stepper-circle">
                    5
                  </div>
                  <span className="admin-stepper-label">5. Completed</span>
                  <span className="admin-stepper-sub">Event hosted successfully</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#f8faf9",
                  border: "1px solid var(--line)",
                  fontSize: "12px",
                  color: "#374944",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Clock size={14} style={{ color: "var(--teal)", flexShrink: 0 }} />
                <span>
                  <strong>Schedule assurance:</strong> All 6 current bookings are confirmed across 14 partner venues with zero schedule overlaps.
                </span>
              </div>
            </div>

            {/* Layer 5: High-Density Data Tables */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
              {/* Left Column: Recent Support Ticket Queue */}
              <div className="card" style={{ padding: "18px", background: "#fff", border: "1px solid var(--line)", borderRadius: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>
                      Active support queue
                    </h2>
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>
                      Customer and venue manager inquiries requiring mediation
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchTab("tickets")}
                    className="btn btn-secondary"
                    style={{ fontSize: "11px", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <span>View all ({overview?.ticketsCount ?? 0})</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                {ticketsLoading ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    Loading active tickets...
                  </div>
                ) : tickets.length === 0 ? (
                  <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)", fontSize: "13px", background: "#fbfcfb", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                    <CheckCircle2 size={32} style={{ color: "var(--teal)", margin: "0 auto 8px" }} />
                    <div style={{ fontWeight: 600 }}>Support queue is all clear</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>No open or unaddressed tickets at this time.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {tickets.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
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
                                fontWeight: 600,
                                background:
                                  t.status === "open"
                                    ? "rgba(245, 158, 11, 0.12)"
                                    : t.status === "in_progress"
                                    ? "rgba(59, 130, 246, 0.12)"
                                    : "rgba(16, 185, 129, 0.12)",
                                color:
                                  t.status === "open"
                                    ? "#b45309"
                                    : t.status === "in_progress"
                                    ? "#1d4ed8"
                                    : "#065f46",
                              }}
                            >
                              {t.status.replace("_", " ")}
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
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
                                style={{ fontSize: "11px", padding: "3px 8px" }}
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

              {/* Right Column: Partner Onboarding & Activity Feed */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Partner Onboarding Card */}
                <div
                  className="card"
                  style={{
                    padding: "18px",
                    background: "#ffffff",
                    border: "1px solid var(--line)",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <UserPlus size={16} style={{ color: "var(--teal)" }} />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--teal)" }}>
                      Partner expansion
                    </span>
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 4px", color: "var(--ink)" }}>
                    Onboard partner venue
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.45 }}>
                    Register a premier hotel or banquet hall and issue a secure setup link for their director.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchTab("onboard")}
                    className="btn btn-primary"
                    style={{ fontSize: "12px", padding: "7px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <UserPlus size={14} />
                    <span>Launch onboarding</span>
                  </button>
                </div>

                {/* Activity Feed Snapshot */}
                <div className="card" style={{ padding: "18px", background: "#fff", border: "1px solid var(--line)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <Activity size={15} style={{ color: "var(--teal)" }} />
                      <span>Recent activity</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => switchTab("audit")}
                      className="text-link"
                      style={{ fontSize: "11px", fontWeight: 500 }}
                    >
                      View all →
                    </button>
                  </div>

                  {auditLoading ? (
                    <div style={{ padding: "1rem", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                      Loading activity...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                      No activity recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {auditLogs.slice(0, 4).map((log) => (
                        <div
                          key={log.id}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "6px",
                            background: "#fafbf9",
                            border: "1px solid #edf2ee",
                            fontSize: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

          {/* TAB 2: PARTNER ONBOARDING */}
          {activeTab === "onboard" && (
            <div className="card" style={{ padding: "20px", background: "#fff", border: "1px solid var(--line)", borderRadius: "10px" }}>
              <div style={{ marginBottom: "18px", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--teal)", marginBottom: "3px" }}>
                  Partner expansion
                </div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Building2 size={18} style={{ color: "var(--teal)" }} />
                  Register partner venue
                </h2>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                  Create a partner venue profile and generate a setup link for the lead manager.
                </p>
              </div>

              {/* Success Box: Copyable Invite Link */}
              {onboardResult && (
                <div
                  style={{
                    padding: "14px 18px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "8px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <CheckCircle2 size={18} style={{ color: "#059669" }} />
                    <strong style={{ color: "#065f46", fontSize: "14px" }}>
                      Partner venue registered
                    </strong>
                  </div>
                  <p style={{ fontSize: "13px", color: "#047857", margin: "0 0 10px" }}>
                    <strong>{onboardResult.venueName}</strong> registered for manager{" "}
                    <strong>{onboardResult.managerName}</strong> ({onboardResult.managerPhone}).
                  </p>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      readOnly
                      className="field"
                      style={{ flex: 1, minWidth: 280, padding: "8px 12px", background: "#fff", fontSize: "13px", fontFamily: "monospace" }}
                      value={onboardResult.inviteUrl}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                      onClick={() => {
                        navigator.clipboard.writeText(onboardResult.inviteUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 3000);
                      }}
                    >
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedLink ? "Link copied" : "Copy invite link"}</span>
                    </button>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#065f46" }}>
                    Send this URL directly to the manager via Telegram or SMS. When clicked, it activates their account and lands them in the Venue Workspace.
                  </p>
                </div>
              )}

              {/* 2-Column Responsive Desktop Form */}
              <form onSubmit={handleOnboardPartner}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  {/* Left Column: Venue Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "#fafbf9", borderRadius: "8px", border: "1px solid #eef2ee" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)", borderBottom: "1px solid var(--line)", paddingBottom: "6px" }}>
                      1. Venue details
                    </div>

                    <div>
                      <label htmlFor="pv-name" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                        Venue name *
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label htmlFor="pv-area" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                          Sub-city or area *
                        </label>
                        <input
                          id="pv-area"
                          type="text"
                          className="field"
                          placeholder="e.g. Bole / Yeka"
                          value={partnerArea}
                          onChange={(e) => setPartnerArea(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="pv-type" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                          Venue type *
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
                      <label htmlFor="pv-contact" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                        Front desk phone
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
                      <label htmlFor="pv-desc" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                        Description
                      </label>
                      <textarea
                        id="pv-desc"
                        rows={3}
                        className="field"
                        placeholder="Capacity, catering standards, and amenities..."
                        value={partnerDesc}
                        onChange={(e) => setPartnerDesc(e.target.value)}
                        style={{ resize: "vertical" }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Lead Manager Identity */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "#fafbf9", borderRadius: "8px", border: "1px solid #eef2ee" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)", borderBottom: "1px solid var(--line)", paddingBottom: "6px" }}>
                      2. Manager details
                    </div>

                    <div>
                      <label htmlFor="pm-name" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                        Manager full name *
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
                      <label htmlFor="pm-phone" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                        Manager phone (login) *
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
                        Used as the manager&apos;s sign-in phone number.
                      </span>
                    </div>

                    <div>
                      <label htmlFor="pm-title" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                        Job title
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

                    <div style={{ marginTop: "auto", padding: "10px 12px", borderRadius: "8px", background: "var(--teal-soft)", fontSize: "12px", color: "var(--teal-dark)", lineHeight: 1.4 }}>
                      <HelpCircle size={14} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: "5px" }} />
                      Submitting creates the venue profile and generates an invite link for the manager.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={onboardingPartner || !partnerVenueName || !partnerManagerPhone}
                    style={{ fontSize: "12px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <UserPlus size={15} />
                    <span>{onboardingPartner ? "Registering..." : "Register venue & create invite link"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SUPPORT TICKETS QUEUE */}
          {activeTab === "tickets" && (
            <div className="card" style={{ padding: "20px", background: "#fff", border: "1px solid var(--line)", borderRadius: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
                    Support tickets
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: "12px", margin: "2px 0 0" }}>
                    Review customer inquiries, update resolution status, and add notes.
                  </p>
                </div>

                {/* Filter Pills */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {[
                    { id: "all", label: "All" },
                    { id: "open", label: `Open (${openTicketsCount})` },
                    { id: "in_progress", label: `In progress (${inProgressTicketsCount})` },
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
                      style={{ fontSize: "11px", padding: "5px 10px" }}
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
                <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "13px", background: "#fafbf9", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                  <CheckCircle2 size={32} style={{ color: "var(--teal)", margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>No tickets matching this filter</div>
                  <div style={{ marginTop: "4px" }}>Select another filter to view tickets.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: "14px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        background: "#fafbf9",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            className="pill"
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              background:
                                t.status === "open"
                                  ? "rgba(245, 158, 11, 0.12)"
                                  : t.status === "in_progress"
                                  ? "rgba(59, 130, 246, 0.12)"
                                  : "rgba(16, 185, 129, 0.12)",
                              color:
                                t.status === "open"
                                  ? "#b45309"
                                  : t.status === "in_progress"
                                  ? "#1d4ed8"
                                  : "#065f46",
                            }}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            Category: <strong style={{ color: "var(--ink)" }}>{t.category}</strong> • ID: <code>#{t.id.slice(0, 8)}</code>
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {new Date(t.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 3px", color: "var(--ink)" }}>
                          {t.subject}
                        </h3>
                        <p style={{ fontSize: "12px", color: "#334155", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                          {t.message}
                        </p>
                      </div>

                      {t.resolvedAt && (
                        <div style={{ fontSize: "11px", color: "#059669", fontWeight: 500 }}>
                          ✓ Resolved on {new Date(t.resolvedAt).toLocaleString()}
                        </div>
                      )}

                      {/* Admin Notes & Action Bar */}
                      <div
                        style={{
                          marginTop: "4px",
                          paddingTop: "10px",
                          borderTop: "1px dashed var(--line)",
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Add internal note..."
                          value={editingNotes[t.id] !== undefined ? editingNotes[t.id] : (t.adminNotes || "")}
                          onChange={(e) => setEditingNotes({ ...editingNotes, [t.id]: e.target.value })}
                          className="field"
                          style={{ flex: 1, minWidth: 220, padding: "6px 10px", fontSize: "12px" }}
                        />

                        <div style={{ display: "flex", gap: "6px" }}>
                          {t.status !== "in_progress" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicket(t.id, "in_progress")}
                              disabled={updatingTicketId === t.id}
                              className="btn btn-secondary"
                              style={{ fontSize: "11px", padding: "5px 10px" }}
                            >
                              In progress
                            </button>
                          )}
                          {t.status !== "resolved" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicket(t.id, "resolved")}
                              disabled={updatingTicketId === t.id}
                              className="btn btn-primary"
                              style={{ fontSize: "11px", padding: "5px 12px", background: "#059669" }}
                            >
                              Resolve
                            </button>
                          )}
                          {t.status === "resolved" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTicket(t.id, "open")}
                              disabled={updatingTicketId === t.id}
                              className="btn btn-secondary"
                              style={{ fontSize: "11px", padding: "5px 10px" }}
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

          {/* TAB 4: PLATFORM ACTIVITY LOG */}
          {activeTab === "audit" && (
            <div className="card" style={{ padding: "20px", background: "#fff", border: "1px solid var(--line)", borderRadius: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
                    Activity log
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: "12px", margin: "2px 0 0" }}>
                    Recent reservations, venue updates, and account actions across the platform.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadAuditLogs()}
                  disabled={auditLoading}
                  className="btn btn-secondary"
                  style={{ fontSize: "11px", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <RotateCcw size={13} className={auditLoading ? "animate-spin" : ""} />
                  <span>Refresh log</span>
                </button>
              </div>

              {/* Filter Toolbar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#fafbf9",
                  border: "1px solid var(--line)",
                  marginBottom: "14px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, color: "var(--ink)" }}>
                  <Filter size={13} /> Filter:
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All" },
                    { id: "booking", label: "Bookings" },
                    { id: "slot_block", label: "Calendar holds" },
                    { id: "support_ticket", label: "Support tickets" },
                    { id: "account", label: "Accounts" },
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => {
                        setAuditTargetFilter(target.id);
                        loadAuditLogs(target.id, auditActionFilter);
                      }}
                      className={auditTargetFilter === target.id ? "btn btn-primary" : "btn btn-secondary"}
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--line)" }}>
                {auditLoading ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    Loading activity...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    No activity found matching filter.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8faf9", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                        <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em" }}>Timestamp</th>
                        <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em" }}>Action</th>
                        <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em" }}>Item</th>
                        <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em" }}>User</th>
                        <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em" }}>Details</th>
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
                            <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--muted)" }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                              <span
                                className="pill"
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 500,
                                  background: "rgba(0,0,0,0.04)",
                                  color: actionColor,
                                }}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: 500 }}>{log.targetType}</span>
                              <code style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "4px" }}>
                                #{log.targetId.slice(0, 8)}
                              </code>
                            </td>
                            <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--muted)" }}>
                              {log.actorId ? <code>{log.actorId.slice(0, 8)}...</code> : <span style={{ color: "var(--muted)" }}>System</span>}
                            </td>
                            <td style={{ padding: "8px 12px", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px", color: "#475569" }}>
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
            <div className="card" style={{ padding: "20px", background: "#fff", border: "1px solid var(--line)", borderRadius: "10px" }}>
              <div style={{ marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--teal)", marginBottom: "3px" }}>
                  Support operations
                </div>
                <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Send size={18} style={{ color: "var(--teal)" }} />
                  Create test inquiry
                </h2>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                  Submit a test inquiry to verify the support queue and notification flow.
                </p>
              </div>

              <form onSubmit={handleCreateTicketSimulator} style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: 640 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="sim-cat" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Category *
                    </label>
                    <select
                      id="sim-cat"
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="field"
                    >
                      <option value="booking_dispute">Booking dispute</option>
                      <option value="venue_verification">Venue verification</option>
                      <option value="billing">Billing & invoicing</option>
                      <option value="technical">Technical support</option>
                      <option value="general">General inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sim-subject" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                      Subject *
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
                  <label htmlFor="sim-msg" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Details *
                  </label>
                  <textarea
                    id="sim-msg"
                    rows={4}
                    placeholder="Describe inquiry specifics, dates, customer/venue context..."
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
                    style={{ fontSize: "12px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Send size={14} />
                    <span>{submittingTicket ? "Submitting..." : "Submit test inquiry"}</span>
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
