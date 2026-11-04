"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ACCESS_TIER_LABELS,
  appendAuditLog,
  ARTISAN_ROLE_LABELS,
  ArtisanStaff,
  getCurrentSessionUser,
  INITIAL_ARTISANS,
  isSuperAdminUser,
  loadOrders,
  ProductionOrder,
  ProductionStage,
  saveOrders,
  STAGE_METADATA,
} from "../lib/production-os";
import { ProductionJobTicketModal } from "../components/ProductionJobTicketModal";

const STAGE_ORDER: ProductionStage[] = [
  "01_brief",
  "02_quotation",
  "03_approved",
  "04_production_qc",
  "05_dispatch",
];

export default function ProductionTrackerPage() {
  const [user, setUser] = useState<ArtisanStaff>(INITIAL_ARTISANS[0]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(
    null
  );
  const [ticketOpen, setTicketOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const syncState = () => {
      setUser(getCurrentSessionUser());
      setOrders(loadOrders());
    };
    syncState();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const jobParam = params.get("job");
      if (jobParam) {
        setSearchQuery(jobParam);
      }
      window.addEventListener("mkp:session-change", syncState);
      window.addEventListener("mkp:branch-change", syncState);
      return () => {
        window.removeEventListener("mkp:session-change", syncState);
        window.removeEventListener("mkp:branch-change", syncState);
      };
    }
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleAdvanceStage = (order: ProductionOrder) => {
    const currentIdx = STAGE_ORDER.indexOf(order.stage);
    if (currentIdx < 0 || currentIdx >= STAGE_ORDER.length - 1) return;
    const nextStage = STAGE_ORDER[currentIdx + 1];

    const updatedOrders = orders.map((o) => {
      if (o.jobCode !== order.jobCode) return o;
      const unitsSewn =
        nextStage === "05_dispatch"
          ? o.exactQuantity
          : nextStage === "04_production_qc" && o.unitsSewn === 0
          ? Math.round(o.exactQuantity * 0.35)
          : o.unitsSewn;
      const unitsPassedQc =
        nextStage === "05_dispatch"
          ? o.exactQuantity
          : nextStage === "04_production_qc" && o.unitsPassedQc === 0
          ? Math.round(unitsSewn * 0.98)
          : o.unitsPassedQc;

      return {
        ...o,
        stage: nextStage,
        unitsSewn,
        unitsPassedQc,
        updatedAt: new Date().toISOString(),
      };
    });

    setOrders(updatedOrders);
    saveOrders(updatedOrders);
    appendAuditLog({
      action: "pipeline.stage_advanced",
      actor: user.name,
      role: ACCESS_TIER_LABELS[user.accessTier],
      targetRef: order.jobCode,
      summary: `Advanced ${order.company} (${order.jobCode}) to Stage ${STAGE_METADATA[nextStage].stepNumber}: ${STAGE_METADATA[nextStage].shortLabel}.`,
    });
    showNotice(
      `Advanced ${order.jobCode} (${order.company}) to Stage ${STAGE_METADATA[nextStage].stepNumber}: ${STAGE_METADATA[nextStage].shortLabel}.`
    );
  };

  const handleIncrementUnits = (order: ProductionOrder, addUnits: number) => {
    const updatedOrders = orders.map((o) => {
      if (o.jobCode !== order.jobCode) return o;
      const nextSewn = Math.min(o.exactQuantity, o.unitsSewn + addUnits);
      const nextPassed = Math.min(
        nextSewn,
        o.unitsPassedQc + Math.max(1, Math.round(addUnits * 0.98))
      );
      return {
        ...o,
        unitsSewn: nextSewn,
        unitsPassedQc: nextPassed,
        updatedAt: new Date().toISOString(),
      };
    });

    setOrders(updatedOrders);
    saveOrders(updatedOrders);
    appendAuditLog({
      action: "floor.units_logged",
      actor: user.name,
      role: ARTISAN_ROLE_LABELS[user.role],
      targetRef: order.jobCode,
      summary: `Logged +${addUnits} sewn & QC-verified units on ${order.jobCode} (${order.company}).`,
    });
    showNotice(`Logged +${addUnits} sewn & QC units on ${order.jobCode}.`);
  };

  const filtered = orders.filter((o) => {
    const matchesStage = stageFilter === "ALL" || o.stage === stageFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      o.jobCode.toLowerCase().includes(q) ||
      o.company.toLowerCase().includes(q) ||
      o.garmentCategory.toLowerCase().includes(q) ||
      o.assignedPatternDesigner.toLowerCase().includes(q) ||
      o.assignedTailorLead.toLowerCase().includes(q) ||
      o.assignedQcInspector.toLowerCase().includes(q);
    return matchesStage && matchesQuery;
  });

  const isSuper = isSuperAdminUser(user);

  return (
    <main>
      <section className="section-wrap" style={{ paddingTop: 48, paddingBottom: 96 }}>
        {/* Internal Staff & Admin Context Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "12px 16px",
            marginBottom: 24,
            background: "#eff3e9",
            border: "1px solid #c3d2b0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="mkp-badge mkp-badge-olive">
              IN-HOUSE PRODUCTION TRACKER
            </span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              Active Operator: <strong>{user.name}</strong> ({ACCESS_TIER_LABELS[user.accessTier]} ·{" "}
              {ARTISAN_ROLE_LABELS[user.role]})
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/dashboard"
              className="button button-light"
              style={{ minHeight: 36, padding: "0 12px", border: "1px solid var(--line)" }}
            >
              ← Staff / Admin Dashboard
            </Link>
            <Link
              href="/workspace"
              className="button button-light"
              style={{ minHeight: 36, padding: "0 12px", border: "1px solid var(--line)" }}
            >
              Operations Workspace ⚙
            </Link>
            {isSuper && (
              <Link
                href="/superadmin"
                className="button button-dark"
                style={{ minHeight: 36, padding: "0 12px" }}
              >
                Superadmin HQ ★
              </Link>
            )}
          </div>
        </div>

        <div className="section-heading" style={{ marginBottom: 28 }}>
          <div>
            <div className="section-kicker mono">
              INTERNAL FLOOR PIPELINE · 5-STAGE PRODUCTION ORDER TRACKER
            </div>
            <h2>
              Manage &amp; track runs from{" "}
              <em>Pattern Studio to Dispatch.</em>
            </h2>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              className="button button-light"
              href="/workspace"
              style={{ border: "1px solid var(--line)" }}
            >
              Floor Operations Workspace <span>⚙</span>
            </Link>
            <Link className="button button-dark" href="/dashboard">
              Open Station Console <span>⊞</span>
            </Link>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="mkp-banner mkp-banner-olive"
            style={{ marginBottom: 20 }}
          >
            <span>✓ {notice}</span>
          </div>
        )}

        {/* Search & Stage Filter Bar */}
        <div className="tracker-toolbar">
          <input
            type="search"
            className="tracker-search-input"
            placeholder="Search by Job Code (e.g. MKP-20261018-841), Brand Name, Pattern Designer, Tailor or QC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="tracker-stage-pills" role="tablist" aria-label="Filter by production stage">
            <button
              type="button"
              className={`mkp-filter-pill ${stageFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStageFilter("ALL")}
            >
              All Runs ({orders.length})
            </button>
            {STAGE_ORDER.map((st) => {
              const meta = STAGE_METADATA[st];
              const count = orders.filter((o) => o.stage === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  className={`mkp-filter-pill ${stageFilter === st ? "active" : ""}`}
                  onClick={() => setStageFilter(st)}
                >
                  {meta.stepNumber}. {meta.shortLabel} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List */}
        <div className="tracker-cards-stack">
          {filtered.length === 0 ? (
            <div className="mkp-empty-card">
              <h3>No active production runs in tracker</h3>
              <p>
                Create a new production run from your Admin Dashboard, Operations Workspace, or
                Quote intake to track live 5-stage progress here.
              </p>
              <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/dashboard" className="button button-dark">
                  Go to Staff / Admin Dashboard <span>→</span>
                </Link>
                <Link href="/workspace" className="button button-light" style={{ border: "1px solid var(--line)" }}>
                  Open Operations Workspace <span>⚙</span>
                </Link>
              </div>
            </div>
          ) : (
            filtered.map((order) => {
              const currentIdx = STAGE_ORDER.indexOf(order.stage);
              const canAdvance = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1;
              const nextStageMeta = canAdvance
                ? STAGE_METADATA[STAGE_ORDER[currentIdx + 1]]
                : null;
              const sewPct = Math.min(
                100,
                Math.round((order.unitsSewn / Math.max(1, order.exactQuantity)) * 100)
              );
              const qcYield =
                order.unitsSewn > 0
                  ? ((order.unitsPassedQc / order.unitsSewn) * 100).toFixed(1)
                  : "100.0";

              return (
                <article key={order.jobCode} className="tracker-order-card">
                  <div className="tracker-card-top">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span className="mono tracker-job-code">{order.jobCode}</span>
                        <span className="mkp-badge mkp-badge-olive">
                          STAGE {STAGE_METADATA[order.stage].stepNumber} ·{" "}
                          {STAGE_METADATA[order.stage].shortLabel.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          Target Delivery: <strong>{order.targetDeliveryDate}</strong>
                        </span>
                      </div>
                      <h3 style={{ margin: "8px 0 4px", fontSize: 20 }}>
                        {order.company} — {order.garmentCategory} (
                        {order.exactQuantity.toLocaleString()} pcs)
                      </h3>
                      <p style={{ margin: 0, fontSize: 12, color: "#5f5b54", maxWidth: 780 }}>
                        {order.details}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {order.unitsSewn < order.exactQuantity && (
                        <button
                          type="button"
                          className="button button-light"
                          style={{
                            minHeight: 38,
                            padding: "0 12px",
                            border: "1px solid var(--line)",
                          }}
                          onClick={() => handleIncrementUnits(order, 25)}
                        >
                          +25 Sewn &amp; QC Units
                        </button>
                      )}
                      {canAdvance && nextStageMeta && (
                        <button
                          type="button"
                          className="button button-light"
                          style={{
                            minHeight: 38,
                            padding: "0 12px",
                            border: "1px solid var(--ink)",
                            color: "var(--ink)",
                          }}
                          onClick={() => handleAdvanceStage(order)}
                        >
                          Advance → {nextStageMeta.shortLabel}
                        </button>
                      )}
                      <button
                        type="button"
                        className="button button-dark"
                        style={{ minHeight: 38, padding: "0 14px" }}
                        onClick={() => {
                          setSelectedOrder(order);
                          setTicketOpen(true);
                        }}
                      >
                        Job Ticket &amp; Spec Sheet <span>🖨</span>
                      </button>
                    </div>
                  </div>

                  {/* 5-Stage Visual Pipeline Stepper */}
                  <div className="pipeline-stepper">
                    {STAGE_ORDER.map((st, idx) => {
                      const meta = STAGE_METADATA[st];
                      const done = idx < currentIdx;
                      const active = idx === currentIdx;
                      return (
                        <div
                          key={st}
                          className={`pipeline-step ${done ? "done" : ""} ${
                            active ? "active" : ""
                          }`}
                        >
                          <div className="pipeline-step-num">
                            {done ? "✓" : meta.stepNumber}
                          </div>
                          <div className="pipeline-step-title">{meta.shortLabel}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Artisan Assignment & QC Telemetry Grid */}
                  <div className="tracker-telemetry-grid">
                    <div className="telemetry-box">
                      <span className="ticket-label">PATTERN DESIGNER</span>
                      <strong>{order.assignedPatternDesigner}</strong>
                      <small>Input: {order.specificationsReady}</small>
                    </div>
                    <div className="telemetry-box">
                      <span className="ticket-label">MASTER TAILOR / SEWING LEAD</span>
                      <strong>{order.assignedTailorLead}</strong>
                      <small>
                        Sewn: {order.unitsSewn.toLocaleString()} /{" "}
                        {order.exactQuantity.toLocaleString()} pcs ({sewPct}%)
                      </small>
                    </div>
                    <div className="telemetry-box">
                      <span className="ticket-label">QUALITY CONTROL (QC)</span>
                      <strong>{order.assignedQcInspector}</strong>
                      <small>
                        Passed QC: {order.unitsPassedQc.toLocaleString()} pcs ({qcYield}% Yield
                        {order.unitsRework > 0 ? ` · ${order.unitsRework} rework` : ""})
                      </small>
                    </div>
                    <div className="telemetry-box">
                      <span className="ticket-label">FABRIC &amp; PRO-FORMA VALUE</span>
                      <strong className="mono">
                        ₦{order.totalQuoteNgn.toLocaleString()}
                      </strong>
                      <small>
                        {order.estimatedFabricMeters.toLocaleString()}m allocated ·{" "}
                        ₦{order.estimatedUnitCostNgn.toLocaleString()}/pc
                      </small>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <ProductionJobTicketModal
        order={selectedOrder}
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
      />
    </main>
  );
}
