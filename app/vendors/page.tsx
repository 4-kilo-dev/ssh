"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Building2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Tag,
  Zap,
  UserCheck,
  Plus,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";

interface Account {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface VendorItem {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  description: string | null;
  priceRange: string | null;
  phone: string | null;
  email: string | null;
  area: string | null;
  verified: boolean;
  boostStatus: "standard" | "boosted";
  boostScore: number;
  createdAt: string;
}

export default function VendorsDirectoryPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Vendor owner profile form
  const [myVendor, setMyVendor] = useState<VendorItem | null>(null);
  const [togglingBoost, setTogglingBoost] = useState(false);

  // Categories & Areas
  const categories = [
    "all",
    "Photography",
    "Catering",
    "Decor & Stage",
    "Sound & DJ",
    "Traditional Attire",
    "Cake & Pastry",
  ];

  const areas = [
    "all",
    "Bole",
    "Kazanchis",
    "Old Airport",
    "Piazza",
    "Tor Hailoch",
    "Megenagna",
  ];

  useEffect(() => {
    fetchSession();
    loadVendors();
  }, []);

  useEffect(() => {
    loadVendors();
  }, [selectedCategory, selectedArea, verifiedOnly]);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account || null);
        if (data.account && (data.account.role === "vendor" || data.account.role === "super_admin")) {
          // Check if caller owns a vendor
          fetchMyVendor(data.account.id);
        }
      }
    } catch {
      setAccount(null);
    }
  };

  const fetchMyVendor = async (ownerId: string) => {
    try {
      const res = await fetch("/api/vendors?limit=100");
      if (res.ok) {
        const data = await res.json();
        const found = (data.vendors || []).find((v: VendorItem) => v.ownerId === ownerId);
        if (found) {
          setMyVendor(found);
        }
      }
    } catch {
      // Ignore
    }
  };

  const loadVendors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedArea !== "all") params.set("area", selectedArea);
      if (verifiedOnly) params.set("verified", "true");
      params.set("limit", "100");

      const res = await fetch(`/api/vendors?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
      }
    } catch (err: any) {
      console.error("Failed to load vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoVendorLogin = async () => {
    setStatusMessage(null);
    try {
      const res = await fetch("/api/auth/demo-vendor", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAccount(data.vendor);
        setMyVendor(data.vendor.profile || null);
        setStatusMessage({
          type: "success",
          text: `Signed in as Demo Vendor: ${data.vendor.name} (${data.vendor.phone})`,
        });
        loadVendors();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to log in as demo vendor" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    }
  };

  const handleToggleMyBoost = async () => {
    if (!myVendor) return;
    setTogglingBoost(true);
    setStatusMessage(null);

    const nextStatus = myVendor.boostStatus === "boosted" ? "standard" : "boosted";
    const nextScore = nextStatus === "boosted" ? 100 : 0;

    try {
      const res = await fetch(`/api/vendors/${myVendor.id}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boostStatus: nextStatus,
          boostScore: nextScore,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMyVendor(data.vendor);
        setStatusMessage({
          type: "success",
          text: `Boost status updated to '${nextStatus}'. Notice your new position in the ranked directory!`,
        });
        loadVendors();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to update boost" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setTogglingBoost(false);
    }
  };

  // Filter local search query
  const filteredVendors = vendors.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.description && v.description.toLowerCase().includes(q)) ||
      v.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-stack" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Top Banner / Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <span className="pill" style={{ background: "rgba(13, 148, 136, 0.12)", color: "var(--teal)", fontWeight: 600 }}>
            Phase 8 • Vendor Marketplace
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>
            Addis Event Vendors Directory
          </h1>
          <p style={{ color: "var(--muted, #64748b)", margin: 0, fontSize: "0.925rem" }}>
            Curated photographers, caterers, stage decorators, and sound technicians across Addis Ababa.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/manager/venue" className="btn btn-outline" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Building2 size={15} /> Manager Workspace
          </Link>
          <Link href="/admin" className="btn btn-outline" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ShieldCheck size={15} /> Super Admin
          </Link>
          <Link href="/" className="btn btn-outline" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ExternalLink size={15} /> Public Site
          </Link>
        </div>
      </div>

      {/* Status Notice */}
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

      {/* Vendor Profile Switcher & Test Banner */}
      <div className="card" style={{ marginBottom: "1.5rem", background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: account?.role === "vendor" ? "var(--teal)" : "#94a3b8",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {account ? `${account.name} (${account.role})` : "Viewing as Guest"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
                {myVendor
                  ? `Your Vendor Profile: ${myVendor.name} • Status: ${myVendor.boostStatus.toUpperCase()}`
                  : "Sign in with a vendor account to test boost placements and rankings"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            {myVendor && (
              <button
                onClick={handleToggleMyBoost}
                disabled={togglingBoost}
                className={`btn ${myVendor.boostStatus === "boosted" ? "btn-outline" : "btn-primary"}`}
                style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <Sparkles size={15} />
                {myVendor.boostStatus === "boosted" ? "Deactivate Boost" : "Activate Paid Boost (Rank #1)"}
              </button>
            )}

            <button
              onClick={handleDemoVendorLogin}
              className="btn btn-outline"
              style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <UserCheck size={16} /> 1-Click Demo Vendor Login
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card"
        style={{
          padding: "1rem",
          border: "1px solid var(--line)",
          marginBottom: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search text */}
          <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted, #64748b)" }} />
            <input
              type="text"
              placeholder="Search vendor name, specialty, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field"
              style={{ width: "100%", paddingLeft: "2.25rem", fontSize: "0.875rem" }}
            />
          </div>

          {/* Area select */}
          <div style={{ minWidth: 160 }}>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="field"
              style={{ width: "100%", fontSize: "0.875rem", padding: "0.55rem" }}
            >
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a === "all" ? "All Addis Areas" : a}
                </option>
              ))}
            </select>
          </div>

          {/* Verified toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            <span>Verified Trust Badge Only</span>
          </label>

          <button
            onClick={() => loadVendors()}
            className="btn btn-outline"
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <RotateCcw size={14} /> Refresh
          </button>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted, #64748b)", marginRight: "0.35rem" }}>
            Categories:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn ${selectedCategory === cat ? "btn-primary" : "btn-outline"}`}
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", textTransform: "capitalize" }}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>
            Showing {filteredVendors.length} Verified & Ranked Partners
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <ArrowUpDown size={14} /> Ordered by: Boost Status $\rightarrow$ Verified $\rightarrow$ Recent
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
            Loading ranked vendor directory...
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--muted, #64748b)" }}>
            No vendors found matching your current filters.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {filteredVendors.map((vendor, index) => {
              const isBoosted = vendor.boostStatus === "boosted";

              return (
                <div
                  key={vendor.id}
                  className="card"
                  style={{
                    padding: "1.25rem",
                    border: isBoosted ? "2px solid var(--teal)" : "1px solid var(--line)",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: isBoosted ? "rgba(13, 148, 136, 0.02)" : "#ffffff",
                    boxShadow: isBoosted ? "0 4px 14px rgba(13, 148, 136, 0.12)" : "none",
                    position: "relative",
                  }}
                >
                  {/* Top Bar: Rank & Status Badges */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: isBoosted ? "var(--teal)" : "#64748b",
                        }}
                      >
                        RANK #{index + 1}
                      </span>

                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {isBoosted && (
                          <span
                            className="pill"
                            style={{
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "#d97706",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <Sparkles size={11} /> BOOSTED
                          </span>
                        )}

                        {vendor.verified && (
                          <span
                            className="pill"
                            style={{
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#059669",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <ShieldCheck size={12} /> VERIFIED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Name & Category */}
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.35rem 0" }}>
                      {vendor.name}
                    </h3>

                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
                      <span
                        className="pill"
                        style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <Tag size={12} /> {vendor.category}
                      </span>

                      {vendor.area && (
                        <span
                          className="pill"
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <MapPin size={12} /> {vendor.area}
                        </span>
                      )}

                      {vendor.priceRange && (
                        <span
                          className="pill"
                          style={{
                            background: "rgba(13, 148, 136, 0.08)",
                            color: "var(--teal)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {vendor.priceRange}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                      {vendor.description || "Trusted service provider for weddings and corporate gatherings."}
                    </p>
                  </div>

                  {/* Contact Strip */}
                  <div style={{ borderTop: "1px dashed var(--line)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Phone size={13} />
                        <span>{vendor.phone || "+251911..."}</span>
                      </div>
                      {vendor.email && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Mail size={13} />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Isolation Statement Footnote */}
      <div className="card" style={{ padding: "1.25rem", background: "#f8fafc", border: "1px solid var(--line)" }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--teal)", marginBottom: "0.25rem" }}>
          Core Isolation Invariant
        </div>
        <p style={{ fontSize: "0.825rem", color: "var(--muted, #64748b)", margin: 0, lineHeight: 1.5 }}>
          The Vendor Side Module is strictly decoupled from the venue booking engine: vendor listings and boost sponsorships
          operate as an independent marketplace layer and do not mutate or constrain venue hall availability, double-booking exclusion
          rules, or deposit workflows.
        </p>
      </div>
    </div>
  );
}
