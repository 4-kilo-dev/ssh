"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  UserCheck,
  Search,
  ArrowRight,
  ExternalLink,
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

export default function SuperAdminPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // 1. Initial Load: check session
  useEffect(() => {
    fetchSession();
  }, []);

  // When account changes to super_admin, load dashboard data
  useEffect(() => {
    if (account && account.role === "super_admin") {
      loadOverview();
      loadAuditLogs();
      loadTickets();
    }
  }, [account]);

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session");
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

  const handleDemoAdminLogin = async () => {
    setStatusMessage(null);
    try {
      const res = await fetch("/api/auth/demo-admin", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAccount(data.admin);
        setStatusMessage({
          type: "success",
          text: `Logged in as Super Admin: ${data.admin.name} (${data.admin.phone})`,
        });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to log in as Super Admin" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
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
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to submit ticket" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <div className="page-stack" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Top Banner / Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <span className="pill" style={{ background: "rgba(13, 148, 136, 0.12)", color: "var(--teal)", fontWeight: 600 }}>
            Super Admin Control Center
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>
            Addis Venue Marketplace Oversight
          </h1>
          <p style={{ color: "var(--muted, #64748b)", margin: 0, fontSize: "0.925rem" }}>
            Platform metrics, append-only immutable audit trail, and support ticket management.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/manager/venue" className="btn btn-outline" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Building2 size={15} /> Manager Workspace
          </Link>
          <Link href="/" className="btn btn-outline" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ExternalLink size={15} /> Public Site
          </Link>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            background: statusMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: statusMessage.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${statusMessage.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.925rem",
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Account / Auth Status Bar */}
      <div className="card" style={{ marginBottom: "1.5rem", background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: account?.role === "super_admin" ? "var(--teal)" : "#94a3b8",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {account ? account.name : "Unauthenticated"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
                {account ? `${account.phone} • Role: ${account.role}` : "Please sign in as Super Admin"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={handleDemoAdminLogin}
              className="btn btn-primary"
              style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <UserCheck size={16} /> 1-Click Sign in as Super Admin (+251911000000)
            </button>
          </div>
        </div>
      </div>

      {/* Non-Admin Gate */}
      {(!account || account.role !== "super_admin") && !loading && (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", background: "#f8fafc", border: "1px dashed var(--line)" }}>
          <ShieldAlert size={44} style={{ color: "#e11d48", margin: "0 auto 1rem auto" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Super Admin Access Required
          </h2>
          <p style={{ color: "var(--muted, #64748b)", maxWidth: 500, margin: "0 auto 1.5rem auto", fontSize: "0.9rem" }}>
            System-wide audit logs, support ticket resolution, and platform KPI analytics are restricted strictly to authorized administrators.
          </p>
          <button onClick={handleDemoAdminLogin} className="btn btn-primary">
            Authenticate as Super Admin
          </button>
        </div>
      )}

      {/* Super Admin Dashboard Content */}
      {account && account.role === "super_admin" && (
        <>
          {/* Section 1: Overview KPIs */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600, margin: 0 }}>
                Platform KPI Overview
              </h2>
              <button
                onClick={loadOverview}
                disabled={overviewLoading}
                className="btn btn-outline"
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
              >
                <RotateCcw size={14} /> Refresh KPIs
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
              {/* Total Venues */}
              <div className="card" style={{ padding: "1.25rem", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--teal)" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Venues</span>
                  <Building2 size={18} />
                </div>
                <div style={{ fontSize: "1.85rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>
                  {overview?.venuesCount ?? 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
                  Registered marketplace venues
                </div>
              </div>

              {/* Total Halls */}
              <div className="card" style={{ padding: "1.25rem", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#3b82f6" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Bookable Halls</span>
                  <DoorOpen size={18} />
                </div>
                <div style={{ fontSize: "1.85rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>
                  {overview?.hallsCount ?? 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
                  Active bookable spaces
                </div>
              </div>

              {/* Total Bookings */}
              <div className="card" style={{ padding: "1.25rem", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#8b5cf6" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Bookings</span>
                  <Calendar size={18} />
                </div>
                <div style={{ fontSize: "1.85rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>
                  {overview?.bookingsCount ?? 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", display: "flex", gap: "0.4rem" }}>
                  <span>Req: {overview?.bookingsByStatus?.requested ?? 0}</span> •
                  <span>Conf: {overview?.bookingsByStatus?.confirmed ?? 0}</span> •
                  <span>Canc: {overview?.bookingsByStatus?.cancelled ?? 0}</span>
                </div>
              </div>

              {/* Support Tickets */}
              <div className="card" style={{ padding: "1.25rem", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#f59e0b" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Support Tickets</span>
                  <Ticket size={18} />
                </div>
                <div style={{ fontSize: "1.85rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>
                  {overview?.ticketsCount ?? 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", display: "flex", gap: "0.4rem" }}>
                  <span style={{ color: "#d97706", fontWeight: 600 }}>Open: {overview?.ticketsByStatus?.open ?? 0}</span> •
                  <span>Prog: {overview?.ticketsByStatus?.in_progress ?? 0}</span> •
                  <span>Res: {overview?.ticketsByStatus?.resolved ?? 0}</span>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="card" style={{ padding: "1.25rem", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Audit Events</span>
                  <FileText size={18} />
                </div>
                <div style={{ fontSize: "1.85rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>
                  {overview?.auditLogsCount ?? 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
                  Immutable log entries
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Support Ticket Management & Simulator */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, margin: 0 }}>
                  Support Ticket Management Queue
                </h2>
                <p style={{ color: "var(--muted, #64748b)", margin: "0.2rem 0 0 0", fontSize: "0.85rem" }}>
                  Review issues submitted by customers and managers, record notes, and transition statuses.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {["all", "open", "in_progress", "resolved"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setTicketStatusFilter(st);
                      loadTickets(st);
                    }}
                    className={`btn ${ticketStatusFilter === st ? "btn-primary" : "btn-outline"}`}
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", textTransform: "capitalize" }}
                  >
                    {st === "all" ? "All Tickets" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets List */}
            <div className="card" style={{ padding: "1.25rem", border: "1px solid var(--line)", marginBottom: "1.5rem" }}>
              {ticketsLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
                  Loading support tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
                  No support tickets found matching current filter.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: "1rem",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div>
                          <span
                            className="pill"
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 600,
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
                              marginRight: "0.5rem",
                            }}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                          <span style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
                            Category: <strong>{t.category}</strong> • ID: {t.id.slice(0, 8)} • Submitter: {t.authorId.slice(0, 8)}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
                          {new Date(t.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.35rem" }}>
                        {t.subject}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#334155", marginBottom: "0.75rem", whiteSpace: "pre-wrap" }}>
                        {t.message}
                      </div>

                      {t.resolvedAt && (
                        <div style={{ fontSize: "0.75rem", color: "#059669", marginBottom: "0.5rem" }}>
                          ✓ Resolved on {new Date(t.resolvedAt).toLocaleString()}
                        </div>
                      )}

                      {/* Admin Notes & Actions */}
                      <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--line)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="Add or edit admin internal notes..."
                            value={editingNotes[t.id] !== undefined ? editingNotes[t.id] : (t.adminNotes || "")}
                            onChange={(e) => setEditingNotes({ ...editingNotes, [t.id]: e.target.value })}
                            className="field"
                            style={{ flex: 1, padding: "0.35rem 0.65rem", fontSize: "0.825rem" }}
                          />

                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            {t.status !== "in_progress" && (
                              <button
                                onClick={() => handleUpdateTicket(t.id, "in_progress")}
                                disabled={updatingTicketId === t.id}
                                className="btn btn-outline"
                                style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}
                              >
                                Mark In Progress
                              </button>
                            )}
                            {t.status !== "resolved" && (
                              <button
                                onClick={() => handleUpdateTicket(t.id, "resolved")}
                                disabled={updatingTicketId === t.id}
                                className="btn btn-primary"
                                style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem", background: "#059669" }}
                              >
                                Resolve Ticket
                              </button>
                            )}
                            {t.status === "resolved" && (
                              <button
                                onClick={() => handleUpdateTicket(t.id, "open")}
                                disabled={updatingTicketId === t.id}
                                className="btn btn-outline"
                                style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Support Ticket Intake Simulator */}
            <div className="card" style={{ padding: "1.25rem", border: "1px solid var(--line)", background: "#f8fafc" }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                Simulate User Support Intake (Test Form)
              </div>
              <p style={{ fontSize: "0.825rem", color: "var(--muted, #64748b)", margin: "0 0 1rem 0" }}>
                Submit a test ticket as the logged in account to verify instant queue ingestion and audit logging.
              </p>

              <form onSubmit={handleCreateTicketSimulator} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>
                      Category
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="field"
                      style={{ width: "100%", padding: "0.45rem", fontSize: "0.85rem" }}
                    >
                      <option value="booking_dispute">Booking Dispute</option>
                      <option value="venue_verification">Venue Verification</option>
                      <option value="billing">Billing & Invoicing</option>
                      <option value="technical">Technical Support</option>
                      <option value="general">General Question</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      placeholder="Summary of issue..."
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="field"
                      style={{ width: "100%", padding: "0.45rem", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.2rem" }}>
                    Message Details
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe the issue, context, or request..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="field"
                    style={{ width: "100%", padding: "0.45rem", fontSize: "0.85rem", resize: "vertical" }}
                  />
                </div>

                <div style={{ alignSelf: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="btn btn-primary"
                    style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <Send size={15} /> Submit Support Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Section 3: Append-Only Immutable Audit Log Explorer */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, margin: 0 }}>
                  Immutable Audit Log Trail
                </h2>
                <p style={{ color: "var(--muted, #64748b)", margin: "0.2rem 0 0 0", fontSize: "0.85rem" }}>
                  Cryptographically immutable, append-only record of every mutating event across the marketplace.
                </p>
              </div>

              <button
                onClick={() => loadAuditLogs()}
                disabled={auditLoading}
                className="btn btn-outline"
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
              >
                <RotateCcw size={14} /> Refresh Logs
              </button>
            </div>

            {/* Filter Bar */}
            <div
              className="card"
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid var(--line)",
                marginBottom: "1rem",
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                flexWrap: "wrap",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.825rem", fontWeight: 600 }}>
                <Filter size={15} /> Filter by Target:
              </div>

              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {["all", "booking", "slot_block", "support_ticket", "account"].map((target) => (
                  <button
                    key={target}
                    onClick={() => {
                      setAuditTargetFilter(target);
                      loadAuditLogs(target, auditActionFilter);
                    }}
                    className={`btn ${auditTargetFilter === target ? "btn-primary" : "btn-outline"}`}
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                  >
                    {target === "all" ? "All Targets" : target}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Log Table / Stream */}
            <div className="card" style={{ padding: "0", border: "1px solid var(--line)", overflow: "hidden" }}>
              {auditLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
                  Loading audit log events...
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
                  No audit log events found for current filter.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", borderBottom: "1px solid var(--line)", color: "#475569" }}>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Timestamp</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Action</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Target Entity</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Actor ID</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Details / Metadata</th>
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
                          <tr key={log.id} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "var(--muted, #64748b)", fontSize: "0.8rem" }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                              <span
                                className="pill"
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  background: "rgba(0,0,0,0.05)",
                                  color: actionColor,
                                }}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: 500 }}>{log.targetType}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginLeft: "0.35rem" }}>
                                #{log.targetId.slice(0, 8)}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "var(--muted, #64748b)", fontSize: "0.8rem" }}>
                              {log.actorId ? `${log.actorId.slice(0, 8)}...` : "system"}
                            </td>
                            <td style={{ padding: "0.75rem 1rem", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                              <code>{JSON.stringify(log.metadata)}</code>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
