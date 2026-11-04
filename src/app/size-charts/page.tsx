"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GARMENT_ESTIMATION_SPECS,
  saveDraftSizeMatrix,
  SizeBreakdown,
} from "../lib/production-os";

interface SizeRow {
  category: string;
  size: keyof SizeBreakdown;
  chestIn: [number, number];
  waistIn: [number, number];
  hipIn: [number, number];
  garmentLengthIn: number;
}

const SIZE_CHART_DATA: SizeRow[] = [
  { category: "Women – Tops & Dresses", size: "XS", chestIn: [31, 32], waistIn: [24, 25], hipIn: [34, 35], garmentLengthIn: 24.5 },
  { category: "Women – Tops & Dresses", size: "S", chestIn: [33, 34], waistIn: [26, 27], hipIn: [36, 37], garmentLengthIn: 25.0 },
  { category: "Women – Tops & Dresses", size: "M", chestIn: [35, 36], waistIn: [28, 29], hipIn: [38, 39], garmentLengthIn: 25.5 },
  { category: "Women – Tops & Dresses", size: "L", chestIn: [37, 39], waistIn: [30, 32], hipIn: [40, 42], garmentLengthIn: 26.2 },
  { category: "Women – Tops & Dresses", size: "XL", chestIn: [40, 42], waistIn: [33, 35], hipIn: [43, 45], garmentLengthIn: 26.8 },
  { category: "Women – Tops & Dresses", size: "XXL", chestIn: [43, 45], waistIn: [36, 38], hipIn: [46, 48], garmentLengthIn: 27.4 },

  { category: "Men – Shirts & Tops", size: "XS", chestIn: [34, 35], waistIn: [28, 29], hipIn: [35, 36], garmentLengthIn: 27.5 },
  { category: "Men – Shirts & Tops", size: "S", chestIn: [36, 37], waistIn: [30, 31], hipIn: [37, 38], garmentLengthIn: 28.2 },
  { category: "Men – Shirts & Tops", size: "M", chestIn: [38, 40], waistIn: [32, 34], hipIn: [39, 41], garmentLengthIn: 29.0 },
  { category: "Men – Shirts & Tops", size: "L", chestIn: [41, 43], waistIn: [35, 37], hipIn: [42, 44], garmentLengthIn: 29.8 },
  { category: "Men – Shirts & Tops", size: "XL", chestIn: [44, 46], waistIn: [38, 40], hipIn: [45, 47], garmentLengthIn: 30.5 },
  { category: "Men – Shirts & Tops", size: "XXL", chestIn: [47, 49], waistIn: [41, 43], hipIn: [48, 50], garmentLengthIn: 31.2 },

  { category: "Trousers & Bottoms", size: "XS", chestIn: [32, 33], waistIn: [26, 27], hipIn: [35, 36], garmentLengthIn: 39.5 },
  { category: "Trousers & Bottoms", size: "S", chestIn: [34, 35], waistIn: [28, 29], hipIn: [37, 38], garmentLengthIn: 40.0 },
  { category: "Trousers & Bottoms", size: "M", chestIn: [36, 38], waistIn: [30, 32], hipIn: [39, 41], garmentLengthIn: 40.8 },
  { category: "Trousers & Bottoms", size: "L", chestIn: [39, 41], waistIn: [33, 35], hipIn: [42, 44], garmentLengthIn: 41.5 },
  { category: "Trousers & Bottoms", size: "XL", chestIn: [42, 44], waistIn: [36, 38], hipIn: [45, 47], garmentLengthIn: 42.0 },
  { category: "Trousers & Bottoms", size: "XXL", chestIn: [45, 47], waistIn: [39, 41], hipIn: [48, 50], garmentLengthIn: 42.5 },
];

const CURVE_PRESETS: Record<
  string,
  { label: string; weights: Record<keyof SizeBreakdown, number> }
> = {
  standard: {
    label: "Standard Retail Bell Curve (M-Core)",
    weights: { XS: 0.1, S: 0.22, M: 0.32, L: 0.22, XL: 0.1, XXL: 0.04 },
  },
  womenswear: {
    label: "Womenswear / Resortwear Curve (XS–M Core)",
    weights: { XS: 0.14, S: 0.28, M: 0.3, L: 0.18, XL: 0.07, XXL: 0.03 },
  },
  streetwear: {
    label: "Streetwear / Boxy Oversized (M–XL Core)",
    weights: { XS: 0.06, S: 0.16, M: 0.3, L: 0.28, XL: 0.14, XXL: 0.06 },
  },
};

export default function SizeCharts() {
  const router = useRouter();
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [garmentCategory, setGarmentCategory] = useState<string>(
    "Dresses and womenswear"
  );
  const [totalUnits, setTotalUnits] = useState<number>(500);
  const [preset, setPreset] = useState<string>("standard");
  const [breakdown, setBreakdown] = useState<SizeBreakdown>({
    XS: 50,
    S: 110,
    M: 160,
    L: 110,
    XL: 50,
    XXL: 20,
  });
  const [savedNotice, setSavedNotice] = useState<string>("");

  const applyCurve = (qty: number, curveKey: string) => {
    const weights =
      CURVE_PRESETS[curveKey]?.weights || CURVE_PRESETS.standard.weights;
    const xs = Math.round(qty * weights.XS);
    const s = Math.round(qty * weights.S);
    const m = Math.round(qty * weights.M);
    const l = Math.round(qty * weights.L);
    const xl = Math.round(qty * weights.XL);
    const xxl = Math.max(0, qty - (xs + s + m + l + xl));
    setBreakdown({ XS: xs, S: s, M: m, L: l, XL: xl, XXL: xxl });
  };

  const handleTotalChange = (val: string) => {
    const qty = Math.max(10, parseInt(val || "0", 10));
    setTotalUnits(qty);
    applyCurve(qty, preset);
  };

  const handlePresetChange = (curveKey: string) => {
    setPreset(curveKey);
    applyCurve(totalUnits, curveKey);
  };

  const handleSingleSizeChange = (sz: keyof SizeBreakdown, val: string) => {
    const count = Math.max(0, parseInt(val || "0", 10));
    const next = { ...breakdown, [sz]: count };
    setBreakdown(next);
    setTotalUnits(next.XS + next.S + next.M + next.L + next.XL + next.XXL);
  };

  const formatRange = (rangeIn: [number, number]) => {
    if (unit === "in") return `${rangeIn[0]}–${rangeIn[1]} in`;
    return `${Math.round(rangeIn[0] * 2.54)}–${Math.round(
      rangeIn[1] * 2.54
    )} cm`;
  };

  const formatLength = (lenIn: number) => {
    if (unit === "in") return `${lenIn.toFixed(1)} in`;
    return `${(lenIn * 2.54).toFixed(1)} cm`;
  };

  const filteredRows =
    categoryFilter === "All"
      ? SIZE_CHART_DATA
      : SIZE_CHART_DATA.filter((r) => r.category === categoryFilter);

  const fabricSpec =
    GARMENT_ESTIMATION_SPECS[garmentCategory] ||
    GARMENT_ESTIMATION_SPECS["Dresses and womenswear"];

  const sizeYardageMultipliers: Record<keyof SizeBreakdown, number> = {
    XS: 0.92,
    S: 0.96,
    M: 1.0,
    L: 1.05,
    XL: 1.1,
    XXL: 1.15,
  };

  const totalFabricMeters = Math.ceil(
    (["XS", "S", "M", "L", "XL", "XXL"] as const).reduce((acc, sz) => {
      return (
        acc +
        breakdown[sz] *
          fabricSpec.fabricMetersPerUnit *
          sizeYardageMultipliers[sz] *
          1.05
      );
    }, 0)
  );

  const handleExportCsv = () => {
    const headers = [
      "Garment Category",
      "Size",
      "Piece Count",
      "Ratio %",
      "Est. Fabric Meters (incl 5% wastage)",
    ];
    const lines = (["XS", "S", "M", "L", "XL", "XXL"] as const).map((sz) => {
      const count = breakdown[sz];
      const pct = totalUnits > 0 ? ((count / totalUnits) * 100).toFixed(1) : "0";
      const meters = (
        count *
        fabricSpec.fabricMetersPerUnit *
        sizeYardageMultipliers[sz] *
        1.05
      ).toFixed(1);
      return `"${garmentCategory}",${sz},${count},${pct}%,${meters}`;
    });
    const csvContent = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miss-kudi-size-grading-${totalUnits}pcs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToQuote = () => {
    saveDraftSizeMatrix({
      garmentCategory,
      totalQuantity: totalUnits,
      sizeBreakdown: breakdown,
      unitSystem: unit,
      updatedAt: new Date().toISOString(),
    });
    setSavedNotice(
      `Saved ${totalUnits} pcs size ratio! Redirecting to Production Quote Studio...`
    );
    setTimeout(() => {
      router.push("/quote");
    }, 450);
  };

  return (
    <main>
      {/* Architectural Dark-Olive Editorial Hero Stage */}
      <section className="marketing-stage-hero">
        <img
          src="/images/pattern-cutting-studio.jpg"
          alt="Victoria Island and Yaba Pattern Studio CAD grading and marker layout"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="marketing-stage-bg"
        />
        <div className="marketing-stage-scrim" aria-hidden="true" />

        <div className="marketing-stage-inner section-wrap">
          <div className="marketing-stage-grid">
            <div className="marketing-stage-copy">
              <div className="hero-fs-badges" style={{ marginBottom: 18 }}>
                <span className="hero-fs-chip-primary mono">
                  04 / SIZE-GRADING &amp; MARKER CALCULATOR
                </span>
                <span className="hero-fs-chip-outline mono">
                  XS – XXL NESTED BLOCKS
                </span>
              </div>

              <h1 className="hero-fs-title">
                Size guide &amp;
                <br />
                <em>bulk grading matrix.</em>
              </h1>

              <p className="hero-fs-description">
                Plan your collection&apos;s XS–XXL size curve, compute exact fabric roll yardage
                (including 5% cutting table lay tolerance), and push your ratio directly into your
                Production Quote.
              </p>

              <div className="hero-fs-actions">
                <button
                  type="button"
                  className="button hero-fs-btn-gold"
                  onClick={handleSendToQuote}
                >
                  Attach {totalUnits.toLocaleString()} Pcs Ratio to Quote <span>↗</span>
                </button>
                <button
                  type="button"
                  className="button hero-fs-btn-glass"
                  onClick={handleExportCsv}
                >
                  Export Grading CSV <span>↓</span>
                </button>
              </div>
            </div>

            <div className="marketing-stage-card">
              <div className="marketing-stage-card-head mono">
                <span>LIVE MARKER SUMMARY</span>
                <span>{unit.toUpperCase()} SPEC</span>
              </div>
              <div className="marketing-stage-metrics">
                <div>
                  <span className="mono">TOTAL RUN QUANTITY</span>
                  <strong className="mono">{totalUnits.toLocaleString()} Pcs</strong>
                  <small>{garmentCategory}</small>
                </div>
                <div>
                  <span className="mono">GRADED FABRIC YARDAGE</span>
                  <strong className="mono">{totalFabricMeters.toLocaleString()} Meters</strong>
                  <small>Includes 5% lay wastage</small>
                </div>
                <div>
                  <span className="mono">MEASUREMENT SYSTEM</span>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <button
                      type="button"
                      className={`mkp-filter-pill ${unit === "in" ? "active" : ""}`}
                      onClick={() => setUnit("in")}
                    >
                      Inches (in)
                    </button>
                    <button
                      type="button"
                      className={`mkp-filter-pill ${unit === "cm" ? "active" : ""}`}
                      onClick={() => setUnit("cm")}
                    >
                      CM (cm)
                    </button>
                  </div>
                </div>
              </div>
              <a href="#grading-planner" className="marketing-stage-scroll mono">
                <span>OPEN INTERACTIVE RATIO PLANNER</span>
                <span>↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        className="size-chart-section section-wrap"
        id="grading-planner"
        style={{ paddingTop: 72, paddingBottom: 96 }}
      >
        {/* Interactive Bulk Size-Ratio & Fabric Consumption Calculator */}
        <div className="grading-calculator-card">
          <div className="grading-calc-header">
            <div>
              <span className="section-kicker mono">
                VICTORIA ISLAND &amp; YABA PATTERN STUDIO
              </span>
              <h2 style={{ margin: "8px 0 6px", fontSize: "clamp(22px, 2.6vw, 30px)" }}>
                Interactive Bulk Order Ratio &amp; Marker Consumption Planner
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                Adjust individual XS–XXL quantities or apply a retail bell-curve preset.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button button-light"
                style={{ minHeight: 42, border: "1px solid var(--line)" }}
                onClick={handleExportCsv}
              >
                Export Grading CSV <span>↓</span>
              </button>
              <button
                type="button"
                className="button button-dark"
                style={{ minHeight: 42 }}
                onClick={handleSendToQuote}
              >
                Attach Ratio to Quote Inquiry <span>↗</span>
              </button>
            </div>
          </div>

          {savedNotice && (
            <div className="mkp-banner mkp-banner-olive" style={{ marginTop: 14 }}>
              {savedNotice}
            </div>
          )}

          <div className="grading-controls-grid">
            <label>
              Garment Category
              <select
                value={garmentCategory}
                onChange={(e) => setGarmentCategory(e.target.value)}
              >
                <option value="Dresses and womenswear">
                  Dresses and womenswear (2.2m/pc base)
                </option>
                <option value="T-shirts and tops">
                  T-shirts and tops (1.3m/pc base)
                </option>
                <option value="Shirts and menswear">
                  Shirts and menswear (1.8m/pc base)
                </option>
                <option value="Trousers and bottoms">
                  Trousers and bottoms (1.7m/pc base)
                </option>
                <option value="Uniforms and workwear">
                  Uniforms and workwear (2.3m/pc base)
                </option>
                <option value="Sportswear and activewear">
                  Sportswear and activewear (1.7m/pc base)
                </option>
              </select>
            </label>

            <label>
              Total Order Quantity (Pieces)
              <input
                type="number"
                min={20}
                max={50000}
                value={totalUnits}
                onChange={(e) => handleTotalChange(e.target.value)}
              />
            </label>

            <label>
              Size Distribution Curve Preset
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                {Object.entries(CURVE_PRESETS).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grading-size-boxes">
            {(["XS", "S", "M", "L", "XL", "XXL"] as const).map((sz) => {
              const count = breakdown[sz];
              const pct =
                totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0;
              const meters = Math.ceil(
                count *
                  fabricSpec.fabricMetersPerUnit *
                  sizeYardageMultipliers[sz] *
                  1.05
              );
              return (
                <div key={sz} className="grading-size-cell">
                  <div className="grading-size-top">
                    <strong>{sz}</strong>
                    <span>{pct}%</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    aria-label={`${sz} quantity`}
                    value={count}
                    onChange={(e) => handleSingleSizeChange(sz, e.target.value)}
                  />
                  <div className="grading-size-meta">
                    ~{meters.toLocaleString()}m fabric
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grading-summary-bar">
            <div>
              <strong>Total Allocated:</strong>{" "}
              <span className="mono">{totalUnits.toLocaleString()} pieces</span>
            </div>
            <div>
              <strong>Graded Fabric Requirement:</strong>{" "}
              <span className="mono">
                {totalFabricMeters.toLocaleString()} meters
              </span>{" "}
              <small>(includes 5% cutting table lay wastage)</small>
            </div>
            <div>
              <strong>Assigned Pattern Studio Lead:</strong>{" "}
              <span>{fabricSpec.defaultPatternDesigner}</span>
            </div>
          </div>
        </div>

        {/* Filter pills & Unit Toggle for measurement table */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 48,
            marginBottom: 18,
          }}
        >
          <p className="size-chart-intro" style={{ margin: 0 }}>
            Standard body &amp; garment block measurements ({unit.toUpperCase()}). Our
            Pattern Designers grade custom tech packs to your brand&apos;s exact fit block.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              "All",
              "Women – Tops & Dresses",
              "Men – Shirts & Tops",
              "Trousers & Bottoms",
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`mkp-filter-pill ${
                  categoryFilter === cat ? "active" : ""
                }`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Container-Query Table */}
        <div className="table-scroll-wrap">
          <table
            className="size-chart responsive-data-table"
            style={
              {
                "--label-1": "'Category'",
                "--label-2": "'Size'",
                "--label-3": `'Chest / Bust (${unit})'`,
                "--label-4": `'Waist (${unit})'`,
                "--label-5": `'Hip (${unit})'`,
                "--label-6": `'Garment Length (${unit})'`,
                "--label-7": "'Allocated Run Qty'",
              } as React.CSSProperties
            }
          >
            <thead>
              <tr>
                <th>Category</th>
                <th>Size</th>
                <th>Chest / Bust ({unit})</th>
                <th>Waist ({unit})</th>
                <th>Hip ({unit})</th>
                <th>Garment Length ({unit})</th>
                <th>Allocated Run Qty</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={`${row.category}-${row.size}`}>
                  <td style={{ fontWeight: 600 }}>{row.category}</td>
                  <td>
                    <span className="mkp-badge mkp-badge-olive">{row.size}</span>
                  </td>
                  <td className="mono">{formatRange(row.chestIn)}</td>
                  <td className="mono">{formatRange(row.waistIn)}</td>
                  <td className="mono">{formatRange(row.hipIn)}</td>
                  <td className="mono">{formatLength(row.garmentLengthIn)}</td>
                  <td className="mono">
                    <strong>{breakdown[row.size]} pcs</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="marketing-bottom-cta-banner">
          <div>
            <span className="section-kicker mono" style={{ color: "#d4af37" }}>
              RATIO READY FOR COSTING?
            </span>
            <h3>Push your {totalUnits.toLocaleString()}-piece size breakdown to Quote Studio.</h3>
            <p>
              Your custom XS–XXL breakdown and {totalFabricMeters.toLocaleString()}m fabric
              requirement will pre-fill automatically.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="button hero-fs-btn-gold"
              onClick={handleSendToQuote}
            >
              Send Ratio to Quote Form <span>↗</span>
            </button>
            <Link className="button hero-fs-btn-glass" href="/services">
              Explore Capabilities <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
