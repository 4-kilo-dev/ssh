"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  DoorOpen,
  Plus,
  Trash2,
  Check,
  ShieldAlert,
  ArrowRight,
  Users,
  Layers,
  Sparkles,
  Lock,
  UserCheck,
  Calendar,
  Clock,
  Unlock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Account {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface Venue {
  id: string;
  managerId: string;
  name: string;
  area: string;
  type: string;
  description?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  policies?: string | null;
  amenities?: string[] | null;
}

interface Hall {
  id: string;
  venueId: string;
  name: string;
  capacity: number;
  setting: string;
  notes?: string | null;
}

interface BookingItem {
  id: string;
  venueId: string;
  customerId: string;
  status: "requested" | "confirmed" | "cancelled";
  startTime: string;
  endTime: string;
  guestCount: number;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  halls: { id: string; hallId: string; slotClaimId: string }[];
}

export default function ManagerVenuePage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New venue form state
  const [venueName, setVenueName] = useState("");
  const [venueArea, setVenueArea] = useState("Bole");
  const [venueType, setVenueType] = useState("Hotel ballroom");
  const [venueDesc, setVenueDesc] = useState("");
  const [venueCreating, setVenueCreating] = useState(false);

  // New hall form state
  const [hallName, setHallName] = useState("");
  const [hallCapacity, setHallCapacity] = useState("200");
  const [hallSetting, setHallSetting] = useState("indoor");
  const [hallNotes, setHallNotes] = useState("");
  const [hallCreating, setHallCreating] = useState(false);

  // Schedule & manual block state (Phase 4)
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [scheduleDate, setScheduleDate] = useState(todayStr);
  const [timelineSlots, setTimelineSlots] = useState<{
    hour: number;
    timeLabel: string;
    status: "free" | "held";
    reason?: string | null;
  }[]>([]);
  const [activeBlocks, setActiveBlocks] = useState<{
    id: string;
    startTime: string;
    endTime: string;
    reason: string | null;
  }[]>([]);
  const [blockStartHour, setBlockStartHour] = useState("14:00");
  const [blockEndHour, setBlockEndHour] = useState("18:00");
  const [blockReason, setBlockReason] = useState("Off-platform wedding reception");
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  // Bookings & Lifecycle state (Phase 5)
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [testBookingDate, setTestBookingDate] = useState(todayStr);
  const [testBookingStart, setTestBookingStart] = useState("10:00");
  const [testBookingEnd, setTestBookingEnd] = useState("14:00");
  const [testSelectedHalls, setTestSelectedHalls] = useState<string[]>([]);
  const [testGuestCount, setTestGuestCount] = useState("250");
  const [testNotes, setTestNotes] = useState("Corporate annual conference");
  const [testCustomerPreset, setTestCustomerPreset] = useState<"A" | "B">("A");
  const [testSubmitting, setTestSubmitting] = useState(false);

  const loadHallSchedule = async (hallId: string, date: string) => {
    if (!venue) return;
    try {
      const [availRes, blocksRes] = await Promise.all([
        fetch(`/api/venues/${venue.id}/halls/${hallId}/availability?date=${date}`),
        fetch(`/api/venues/${venue.id}/halls/${hallId}/blocks`),
      ]);
      if (availRes.ok) {
        const data = await availRes.json();
        setTimelineSlots(data.timeline?.slots || []);
      }
      if (blocksRes.ok) {
        const data = await blocksRes.json();
        setActiveBlocks(data.blocks || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedHall && venue) {
      loadHallSchedule(selectedHall.id, scheduleDate);
    }
  }, [selectedHall, scheduleDate]);

  // Load account and venue on mount
  const refreshData = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setAccount(null);
        setVenue(null);
        setHalls([]);
        setLoading(false);
        return;
      }

      const meData = await meRes.json();
      setAccount(meData.account);

      if (meData.account?.role === "venue_manager") {
        // Find existing venue for this manager
        const listRes = await fetch("/api/venues");
        if (listRes.ok) {
          const { venues } = await listRes.json();
          const myVenue = venues.find((v: Venue) => v.managerId === meData.account.id);
          if (myVenue) {
            setVenue(myVenue);
            // Fetch halls for this venue
            const hallsRes = await fetch(`/api/venues/${myVenue.id}/halls`);
            if (hallsRes.ok) {
              const hallsData = await hallsRes.json();
              setHalls(hallsData.halls || []);
              if (hallsData.halls?.length > 0 && testSelectedHalls.length === 0) {
                setTestSelectedHalls([hallsData.halls[0].id]);
              }
            }

            // Fetch bookings for this venue
            const bookingsRes = await fetch("/api/bookings");
            if (bookingsRes.ok) {
              const bookingsData = await bookingsRes.json();
              setBookings(Array.isArray(bookingsData) ? bookingsData : []);
            }
          } else {
            setVenue(null);
            setHalls([]);
            setBookings([]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const switchDemoManager = async (preset: "A" | "B" | "C" | "D") => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/auth/demo-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId: preset }),
      });
      if (res.ok) {
        await refreshData();
        const names: Record<string, string> = {
          A: "Manager Abebe (Skylight)",
          B: "Manager Kebede (Bellevue)",
          C: "Manager Tigist (Golf Club)",
          D: "Manager Dawit (Harmony)",
        };
        setStatusMessage({
          type: "success",
          text: `Switched session to ${names[preset] || preset}`,
        });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to switch manager session" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setVenueCreating(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: venueName,
          area: venueArea,
          type: venueType,
          description: venueDesc,
          amenities: ["Parking", "Wi-Fi", "Stage"],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create venue");
      }

      setVenue(data.venue);
      setStatusMessage({ type: "success", text: `Venue '${data.venue.name}' created successfully!` });
      await refreshData();
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Error creating venue" });
    } finally {
      setVenueCreating(false);
    }
  };

  const handleCreateHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;
    setHallCreating(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/venues/${venue.id}/halls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hallName,
          capacity: Number(hallCapacity),
          setting: hallSetting,
          notes: hallNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create hall");
      }

      setHallName("");
      setHallCapacity("200");
      setHallNotes("");
      setStatusMessage({ type: "success", text: `Hall '${data.hall.name}' added to ${venue.name}!` });
      await refreshData();
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Error creating hall" });
    } finally {
      setHallCreating(false);
    }
  };

  const handleDeleteHall = async (hallId: string, name: string) => {
    if (!venue) return;
    if (!confirm(`Are you sure you want to delete hall '${name}'?`)) return;

    setStatusMessage(null);
    try {
      const res = await fetch(`/api/venues/${venue.id}/halls/${hallId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete hall");
      }

      setStatusMessage({ type: "success", text: `Hall '${name}' deleted successfully.` });
      await refreshData();
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Error deleting hall" });
    }
  };

  const handleDeleteVenue = async () => {
    if (!venue) return;
    if (!confirm(`Are you sure you want to delete venue '${venue.name}'? All its halls will be deleted!`)) return;

    setStatusMessage(null);
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete venue");
      }

      setVenue(null);
      setHalls([]);
      setStatusMessage({ type: "success", text: "Venue and all its halls were deleted." });
      await refreshData();
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Error deleting venue" });
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue || !selectedHall) return;
    setBlockSubmitting(true);
    setStatusMessage(null);
    try {
      const startIso = new Date(`${scheduleDate}T${blockStartHour}:00+03:00`).toISOString();
      const endIso = new Date(`${scheduleDate}T${blockEndHour}:00+03:00`).toISOString();

      const res = await fetch(`/api/venues/${venue.id}/halls/${selectedHall.id}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startIso,
          endTime: endIso,
          reason: blockReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to block slot");
      }

      setStatusMessage({
        type: "success",
        text: `Slot blocked: ${blockStartHour} - ${blockEndHour} on ${scheduleDate} (${blockReason})`,
      });
      await loadHallSchedule(selectedHall.id, scheduleDate);
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Error creating block" });
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleReleaseBlock = async (blockId: string) => {
    if (!venue || !selectedHall) return;
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/venues/${venue.id}/halls/${selectedHall.id}/blocks/${blockId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to release block");
      }
      setStatusMessage({ type: "success", text: "Slot block released successfully. Time slot is now free." });
      await loadHallSchedule(selectedHall.id, scheduleDate);
    } catch (err) {
      setStatusMessage({ type: "error", text: err instanceof Error ? err.message : "Error releasing block" });
    }
  };

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm booking");
      }
      setStatusMessage({
        type: "success",
        text: `Booking ${bookingId.slice(0, 8)} confirmed! Manager re-verification complete.`,
      });
      await loadBookings();
      if (selectedHall) await loadHallSchedule(selectedHall.id, scheduleDate);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Confirmation failed" });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt("Enter cancellation reason (optional):") ?? undefined;
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }
      setStatusMessage({
        type: "success",
        text: `Booking ${bookingId.slice(0, 8)} cancelled. All slot claims released immediately.`,
      });
      await loadBookings();
      if (selectedHall) await loadHallSchedule(selectedHall.id, scheduleDate);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Cancellation failed" });
    }
  };

  const handleCreateCustomerBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue || testSelectedHalls.length === 0) {
      setStatusMessage({ type: "error", text: "Please select at least one hall to book." });
      return;
    }

    setTestSubmitting(true);
    setStatusMessage(null);

    try {
      // 1. Temporarily switch session to the demo customer
      const custAuthRes = await fetch("/api/auth/demo-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPreset: testCustomerPreset }),
      });
      if (!custAuthRes.ok) throw new Error("Could not log in as test customer");

      // 2. Submit booking as customer
      const startIso = new Date(`${testBookingDate}T${testBookingStart}:00+03:00`).toISOString();
      const endIso = new Date(`${testBookingDate}T${testBookingEnd}:00+03:00`).toISOString();

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: venue.id,
          hallIds: testSelectedHalls,
          startTime: startIso,
          endTime: endIso,
          guestCount: Number(testGuestCount) || 0,
          notes: testNotes,
        }),
      });

      const data = await bookingRes.json();
      if (!bookingRes.ok) {
        throw new Error(data.error || "Booking request rejected");
      }

      setStatusMessage({
        type: "success",
        text: `Booking requested by Customer ${testCustomerPreset === "A" ? "Dawit" : "Sara"} for ${testSelectedHalls.length} hall(s) (${testBookingStart} - ${testBookingEnd})! Initial status: 'Requested'.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to create booking",
      });
    } finally {
      // 3. Switch back to manager session so manager workspace can review
      await fetch("/api/auth/demo-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId: "A" }),
      });
      await refreshData();
      await loadBookings();
      if (selectedHall) await loadHallSchedule(selectedHall.id, scheduleDate);
      setTestSubmitting(false);
    }
  };

  return (
    <div className="page-stack" style={{ maxWidth: "880px", margin: "0 auto" }}>
      <header className="page-heading">
        <p className="eyebrow">
          <Building2 size={14} aria-hidden="true" />
          <span>Manager Workspace • Phase 3 & 4</span>
        </p>
        <h1>Venue & Hall Management</h1>
        <p>Manage your venue profile, define bookable halls, and verify the double-booking exclusion constraint.</p>
      </header>

      {/* Quick Session Switcher Strip */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "14px 18px",
          background: "var(--paper)",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <UserCheck size={18} style={{ color: "var(--teal)" }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700 }}>
              {account ? `Current: ${account.name} (${account.role})` : "Not Logged In"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              {account ? `Phone: ${account.phone}` : "Log in as a venue manager to test ownership boundaries"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => switchDemoManager("A")}
            disabled={loading}
            style={{ fontSize: "11px", padding: "5px 10px" }}
          >
            Skylight (Abebe)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => switchDemoManager("B")}
            disabled={loading}
            style={{ fontSize: "11px", padding: "5px 10px" }}
          >
            Bellevue (Kebede)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => switchDemoManager("C")}
            disabled={loading}
            style={{ fontSize: "11px", padding: "5px 10px" }}
          >
            Golf Club (Tigist)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => switchDemoManager("D")}
            disabled={loading}
            style={{ fontSize: "11px", padding: "5px 10px" }}
          >
            Harmony (Dawit)
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={statusMessage.type === "success" ? "demo-notice" : "conflict-alert"}
          style={
            statusMessage.type === "success"
              ? {
                  borderColor: "var(--teal)",
                  borderLeftColor: "var(--teal)",
                  background: "var(--teal-soft)",
                  color: "var(--teal-dark)",
                }
              : {}
          }
        >
          {statusMessage.type === "success" ? (
            <Check size={18} aria-hidden="true" style={{ marginTop: "2px", flexShrink: 0 }} />
          ) : (
            <ShieldAlert size={18} aria-hidden="true" style={{ marginTop: "2px", flexShrink: 0 }} />
          )}
          <div>
            <strong>{statusMessage.type === "success" ? "Operation Succeeded" : "Notice"}</strong>
            <p style={{ margin: "2px 0 0" }}>{statusMessage.text}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!account || account.role !== "venue_manager" ? (
        <div className="card form-card" style={{ textAlign: "center", padding: "32px" }}>
          <Lock size={32} style={{ margin: "0 auto 12px", color: "var(--muted)" }} />
          <h2 style={{ fontSize: "18px", margin: "0 0 8px" }}>Venue Manager Authentication Required</h2>
          <p style={{ color: "var(--muted)", maxWidth: "440px", margin: "0 auto 20px", fontSize: "14px" }}>
            To manage venues and halls, sign in with a <strong>venue_manager</strong> account, or use the quick switcher
            above to instantiate a verified test manager.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <button type="button" onClick={() => switchDemoManager("A")} className="btn btn-primary">
              Sign In as Demo Manager A
            </button>
            <Link href="/login" className="btn btn-secondary">
              Go to Standard Login
            </Link>
          </div>
        </div>
      ) : !venue ? (
        /* Create Venue Form */
        <form className="card form-card" onSubmit={handleCreateVenue}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <Building2 size={20} style={{ color: "var(--teal)" }} />
            <div>
              <h2 style={{ margin: 0, fontSize: "18px" }}>Register Your Venue</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                Each manager owns one venue. Define your venue profile to begin adding bookable halls.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <label className="label" htmlFor="venue-name">
              Venue Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="venue-name"
              className="field"
              required
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. Imperial Palace Addis"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
            <div>
              <label className="label" htmlFor="venue-area">
                Area / Subcity <span aria-hidden="true">*</span>
              </label>
              <select
                id="venue-area"
                className="field"
                value={venueArea}
                onChange={(e) => setVenueArea(e.target.value)}
              >
                <option value="Bole">Bole</option>
                <option value="Kazanchis">Kazanchis</option>
                <option value="Old Airport">Old Airport</option>
                <option value="CMC">CMC</option>
                <option value="Sar Bet">Sar Bet</option>
                <option value="Piassa">Piassa</option>
                <option value="Mexico">Mexico</option>
                <option value="Yeka">Yeka</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="venue-type">
                Venue Type <span aria-hidden="true">*</span>
              </label>
              <select
                id="venue-type"
                className="field"
                value={venueType}
                onChange={(e) => setVenueType(e.target.value)}
              >
                <option value="Hotel ballroom">Hotel ballroom</option>
                <option value="Wedding hall">Wedding hall</option>
                <option value="Garden venue">Garden venue</option>
                <option value="Conference space">Conference space</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <label className="label" htmlFor="venue-desc">
              Description
            </label>
            <textarea
              id="venue-desc"
              className="field"
              rows={3}
              value={venueDesc}
              onChange={(e) => setVenueDesc(e.target.value)}
              placeholder="Tell guests about your venue location, atmosphere, and amenities..."
            />
          </div>

          <div className="form-actions" style={{ marginTop: "24px" }}>
            <button type="submit" className="btn btn-primary" disabled={venueCreating || !venueName}>
              {venueCreating ? "Creating Venue..." : "Create Venue Profile"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
      ) : (
        /* Venue Active Overview & Hall Management */
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Venue Card */}
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      background: "var(--teal-soft)",
                      color: "var(--teal)",
                    }}
                  >
                    {venue.type}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>• {venue.area}</span>
                </div>
                <h2 style={{ margin: "4px 0", fontSize: "22px" }}>{venue.name}</h2>
                <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "14px" }}>
                  {venue.description || "No description provided."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDeleteVenue}
                className="btn btn-secondary"
                style={{ color: "#a32a2a", borderColor: "#f0c2c2", fontSize: "13px" }}
              >
                <Trash2 size={14} aria-hidden="true" />
                Delete Venue
              </button>
            </div>

            {/* Ownership Proof Pill */}
            <div
              style={{
                marginTop: "18px",
                padding: "10px 14px",
                background: "var(--paper)",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                fontSize: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>Ownership Boundary Anchor:</strong> Venue ID:{" "}
                <span style={{ fontFamily: "monospace" }}>{venue.id.slice(0, 8)}...</span> | Owning Manager:{" "}
                <span style={{ fontFamily: "monospace" }}>{venue.managerId.slice(0, 8)}...</span>
              </div>
              <span style={{ color: "var(--teal)", fontWeight: 700 }}>✓ Verified Owner</span>
            </div>
          </div>

          {/* Bookable Halls Section */}
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <DoorOpen size={20} style={{ color: "var(--teal)" }} />
                  Bookable Halls ({halls.length})
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                  The hall is the core bookable unit. Each hall can be independently scheduled.
                </p>
              </div>
            </div>

            {/* Hall List */}
            {halls.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                  background: "var(--paper)",
                  borderRadius: "10px",
                  border: "1px dashed var(--line)",
                  marginBottom: "24px",
                }}
              >
                <DoorOpen size={28} style={{ color: "var(--muted)", margin: "0 auto 8px" }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No halls added yet</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                  Add your first hall below to make this venue discoverable and bookable.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
                {halls.map((hall) => (
                  <div
                    key={hall.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 18px",
                      background: "var(--paper)",
                      borderRadius: "10px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <strong style={{ fontSize: "15px" }}>{hall.name}</strong>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "#e8f0ec",
                            color: "var(--teal)",
                            textTransform: "capitalize",
                          }}
                        >
                          {hall.setting}
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                        Capacity: <strong>{hall.capacity} guests</strong>
                        {hall.notes && <span> • {hall.notes}</span>}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedHall(selectedHall?.id === hall.id ? null : hall)}
                        className={`btn ${selectedHall?.id === hall.id ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        <Calendar size={13} aria-hidden="true" />
                        {selectedHall?.id === hall.id ? "Close Schedule" : "Schedule & Blocks"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHall(hall.id, hall.name)}
                        className="btn btn-secondary"
                        style={{ color: "#a32a2a", borderColor: "#f0c2c2", padding: "6px 10px", fontSize: "12px" }}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Schedule & Slot Blocks Section (Phase 4) */}
            {selectedHall && (
              <div
                style={{
                  padding: "20px",
                  background: "var(--paper)",
                  borderRadius: "10px",
                  border: "2px solid var(--teal)",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Clock size={18} style={{ color: "var(--teal)" }} />
                      Schedule & Blocks for {selectedHall.name}
                    </h4>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                      Phase 4 derived availability and Postgres exclusion constraint verification.
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label htmlFor="sched-date" style={{ fontSize: "12px", fontWeight: 600 }}>Date:</label>
                    <input
                      id="sched-date"
                      type="date"
                      className="field"
                      style={{ padding: "4px 8px", fontSize: "13px" }}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Hourly Timeline */}
                <div style={{ marginBottom: "18px" }}>
                  <label className="label" style={{ marginBottom: "8px" }}>Hourly Derived Availability</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
                    {timelineSlots.map((slot) => (
                      <div
                        key={slot.hour}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid",
                          borderColor: slot.status === "held" ? "#f0c2c2" : "#cce3d8",
                          background: slot.status === "held" ? "#fff5f5" : "#f0f8f4",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "var(--ink)" }}>{slot.timeLabel}</div>
                        <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: slot.status === "held" ? "#c53030" : "var(--teal)",
                            }}
                          />
                          <span style={{ fontWeight: 600, color: slot.status === "held" ? "#c53030" : "var(--teal)" }}>
                            {slot.status === "held" ? "HELD" : "FREE"}
                          </span>
                        </div>
                        {slot.reason && (
                          <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {slot.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active SlotBlocks list with release button */}
                {activeBlocks.length > 0 && (
                  <div style={{ marginBottom: "18px" }}>
                    <label className="label" style={{ marginBottom: "6px" }}>Active Blocks on this Hall</label>
                    <div style={{ display: "grid", gap: "8px" }}>
                      {activeBlocks.map((b) => (
                        <div
                          key={b.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            background: "var(--surface)",
                            borderRadius: "6px",
                            border: "1px solid var(--line)",
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <strong>{new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                            <span style={{ color: "var(--muted)", marginLeft: "8px" }}>{b.reason}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReleaseBlock(b.id)}
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                          >
                            <Unlock size={12} aria-hidden="true" /> Release Slot
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Place Manual Block Form */}
                <form onSubmit={handleCreateBlock} style={{ background: "var(--surface)", padding: "14px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                  <h5 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700 }}>
                    Lock Slot / Place Off-Platform Block (Tests Double-Booking Invariant)
                  </h5>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: "10px", alignItems: "flex-end" }}>
                    <div>
                      <label className="label" htmlFor="block-start" style={{ fontSize: "11px" }}>Start Hour</label>
                      <select id="block-start" className="field" value={blockStartHour} onChange={(e) => setBlockStartHour(e.target.value)}>
                        {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => {
                          const val = `${String(h).padStart(2, "0")}:00`;
                          return <option key={val} value={val}>{val}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="block-end" style={{ fontSize: "11px" }}>End Hour</label>
                      <select id="block-end" className="field" value={blockEndHour} onChange={(e) => setBlockEndHour(e.target.value)}>
                        {Array.from({ length: 14 }, (_, i) => i + 9).map((h) => {
                          const val = `${String(h).padStart(2, "0")}:00`;
                          return <option key={val} value={val}>{val}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="block-reason" style={{ fontSize: "11px" }}>Reason</label>
                      <input
                        id="block-reason"
                        className="field"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="e.g. Phone booking, private event"
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={blockSubmitting} style={{ padding: "8px 14px", fontSize: "12px" }}>
                      {blockSubmitting ? "Locking..." : "Lock Slot"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Add Hall Inline Form */}
            <form
              onSubmit={handleCreateHall}
              style={{
                padding: "20px",
                background: "var(--paper)",
                borderRadius: "10px",
                border: "1px solid var(--line)",
              }}
            >
              <h4 style={{ margin: "0 0 14px", fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Plus size={16} style={{ color: "var(--teal)" }} />
                Add a New Hall
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="label" htmlFor="hall-name">
                    Hall Name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="hall-name"
                    className="field"
                    required
                    value={hallName}
                    onChange={(e) => setHallName(e.target.value)}
                    placeholder="e.g. Grand Ballroom"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="hall-capacity">
                    Capacity <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="hall-capacity"
                    className="field"
                    type="number"
                    min={1}
                    required
                    value={hallCapacity}
                    onChange={(e) => setHallCapacity(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="hall-setting">
                    Setting <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="hall-setting"
                    className="field"
                    value={hallSetting}
                    onChange={(e) => setHallSetting(e.target.value)}
                  >
                    <option value="indoor">Indoor</option>
                    <option value="covered-outdoor">Covered outdoor</option>
                    <option value="uncovered-outdoor">Uncovered outdoor</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="label" htmlFor="hall-notes">
                  Optional Hall Notes
                </label>
                <input
                  id="hall-notes"
                  className="field"
                  value={hallNotes}
                  onChange={(e) => setHallNotes(e.target.value)}
                  placeholder="e.g. Includes projector, separate VIP entrance"
                />
              </div>

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={hallCreating || !hallName || Number(hallCapacity) <= 0}
                >
                  <Plus size={15} aria-hidden="true" />
                  {hallCreating ? "Adding Hall..." : "Add Hall"}
                </button>
              </div>
            </form>
          </div>

          {/* Phase 5: Booking Lifecycle & Re-verification Card */}
          <div className="card" style={{ padding: "24px", marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CalendarCheck size={20} style={{ color: "var(--teal)" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px" }}>Booking Requests & Lifecycle (Phase 5)</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                    Re-verify availability and transition customer booking requests between Requested, Confirmed, and Cancelled.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadBookings}
                className="btn btn-secondary"
                disabled={bookingsLoading}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                {bookingsLoading ? "Refreshing..." : "Refresh Bookings"}
              </button>
            </div>

            {bookings.length === 0 ? (
              <div
                style={{
                  padding: "30px",
                  textAlign: "center",
                  background: "var(--paper)",
                  borderRadius: "8px",
                  border: "1px dashed var(--line)",
                  color: "var(--muted)",
                  fontSize: "13px",
                }}
              >
                <CalendarCheck size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No booking requests yet for this venue.</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                  Use the customer booking simulator below to submit a multi-hall reservation request.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {bookings.map((b) => {
                  const bHalls = b.halls.map((bh) => {
                    const found = halls.find((h) => h.id === bh.hallId);
                    return found ? found.name : bh.hallId.slice(0, 8);
                  });

                  const isRequested = b.status === "requested";
                  const isConfirmed = b.status === "confirmed";
                  const isCancelled = b.status === "cancelled";

                  return (
                    <div
                      key={b.id}
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        background: "var(--paper)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>
                            Booking #{b.id.slice(0, 8)}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            • {new Date(b.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          {isRequested && (
                            <span
                              className="pill"
                              style={{
                                background: "var(--warning-bg)",
                                color: "var(--warning)",
                                border: "1px solid var(--warning)",
                                fontWeight: 700,
                                fontSize: "11px",
                              }}
                            >
                              Requested (Awaiting Re-verification)
                            </span>
                          )}
                          {isConfirmed && (
                            <span
                              className="pill"
                              style={{
                                background: "var(--success-bg)",
                                color: "var(--success)",
                                border: "1px solid var(--success)",
                                fontWeight: 700,
                                fontSize: "11px",
                              }}
                            >
                              Confirmed / Filled
                            </span>
                          )}
                          {isCancelled && (
                            <span
                              className="pill"
                              style={{
                                background: "var(--surface)",
                                color: "var(--muted)",
                                border: "1px solid var(--line)",
                                fontSize: "11px",
                              }}
                            >
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "13px" }}>
                        <div>
                          <span style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>Date & Time</span>
                          <strong>
                            {new Date(b.startTime).toLocaleDateString()} •{" "}
                            {new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                            {new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </strong>
                        </div>

                        <div>
                          <span style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>Halls Booked</span>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
                            {bHalls.map((hName, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: "var(--teal-soft)",
                                  color: "var(--teal-dark)",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                {hName}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>Guest Count & Notes</span>
                          <span>{b.guestCount > 0 ? `${b.guestCount} guests` : "Not specified"}</span>
                          {b.notes && <span style={{ color: "var(--muted)", marginLeft: "6px" }}>({b.notes})</span>}
                        </div>
                      </div>

                      {isCancelled && b.cancellationReason && (
                        <div style={{ fontSize: "12px", color: "var(--danger)", background: "var(--danger-bg)", padding: "6px 10px", borderRadius: "4px" }}>
                          Cancellation Reason: {b.cancellationReason}
                        </div>
                      )}

                      {/* Manager Action Buttons */}
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                        {isRequested && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleConfirmBooking(b.id)}
                              className="btn btn-primary"
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              <CheckCircle2 size={13} aria-hidden="true" />
                              Re-verify & Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelBooking(b.id)}
                              className="btn btn-outline"
                              style={{ padding: "6px 12px", fontSize: "12px", color: "var(--danger)" }}
                            >
                              <XCircle size={13} aria-hidden="true" />
                              Decline Request
                            </button>
                          </>
                        )}

                        {isConfirmed && (
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            className="btn btn-outline"
                            style={{ padding: "6px 12px", fontSize: "12px", color: "var(--danger)" }}
                          >
                            <XCircle size={13} aria-hidden="true" />
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phase 5: Customer Booking Request Simulator Card */}
          <div className="card" style={{ padding: "24px", marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Users size={20} style={{ color: "var(--teal)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: "17px" }}>Customer Booking Request Simulator (Phase 5)</h3>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                  Submit a multi-hall booking request as a customer to test atomic reservation and double-booking collision defense.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleCreateCustomerBooking}
              style={{
                background: "var(--paper)",
                padding: "20px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label className="label" htmlFor="cust-preset">
                    Acting Customer
                  </label>
                  <select
                    id="cust-preset"
                    className="field"
                    value={testCustomerPreset}
                    onChange={(e) => setTestCustomerPreset(e.target.value as "A" | "B")}
                  >
                    <option value="A">Customer Dawit (+251915112233)</option>
                    <option value="B">Customer Sara (+251915999902)</option>
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="cust-date">
                    Date
                  </label>
                  <input
                    id="cust-date"
                    className="field"
                    type="date"
                    value={testBookingDate}
                    onChange={(e) => setTestBookingDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="cust-start">
                    Start Time
                  </label>
                  <select
                    id="cust-start"
                    className="field"
                    value={testBookingStart}
                    onChange={(e) => setTestBookingStart(e.target.value)}
                  >
                    {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => {
                      const val = `${String(h).padStart(2, "0")}:00`;
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="cust-end">
                    End Time
                  </label>
                  <select
                    id="cust-end"
                    className="field"
                    value={testBookingEnd}
                    onChange={(e) => setTestBookingEnd(e.target.value)}
                  >
                    {Array.from({ length: 14 }, (_, i) => i + 9).map((h) => {
                      const val = `${String(h).padStart(2, "0")}:00`;
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* Multi-Hall Checkboxes */}
              <div style={{ marginTop: "14px" }}>
                <label className="label" style={{ marginBottom: "6px" }}>
                  Select Halls to Book Atomically ({testSelectedHalls.length} selected)
                </label>
                {halls.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                    No halls defined yet. Please add at least one hall above first.
                  </p>
                ) : (
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {halls.map((h) => {
                      const isChecked = testSelectedHalls.includes(h.id);
                      return (
                        <label
                          key={h.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            background: isChecked ? "var(--teal-soft)" : "var(--surface)",
                            border: `1px solid ${isChecked ? "var(--teal)" : "var(--line)"}`,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: isChecked ? 600 : 400,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTestSelectedHalls([...testSelectedHalls, h.id]);
                              } else {
                                setTestSelectedHalls(testSelectedHalls.filter((id) => id !== h.id));
                              }
                            }}
                          />
                          <span>{h.name}</span>
                          <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                            ({h.capacity} cap, {h.setting})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", marginTop: "14px" }}>
                <div>
                  <label className="label" htmlFor="cust-guests">
                    Guest Count
                  </label>
                  <input
                    id="cust-guests"
                    className="field"
                    type="number"
                    min={1}
                    value={testGuestCount}
                    onChange={(e) => setTestGuestCount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="cust-notes">
                    Customer Notes
                  </label>
                  <input
                    id="cust-notes"
                    className="field"
                    value={testNotes}
                    onChange={(e) => setTestNotes(e.target.value)}
                    placeholder="e.g. Wedding banquet with catering"
                  />
                </div>
              </div>

              <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={testSubmitting || testSelectedHalls.length === 0}
                  style={{ padding: "8px 16px" }}
                >
                  <CalendarCheck size={15} aria-hidden="true" />
                  {testSubmitting ? "Submitting Booking..." : "Submit Booking Request as Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
