"use client";

import React, { useEffect, useState } from "react";
import {
  appendAuditLog,
  calculateProductionEstimate,
  computeDefaultSizeBreakdown,
  loadDraftSizeMatrix,
  parseQuantityBracketToDefaultUnits,
  ProductionOrder,
  PROMO_CODES,
  SizeBreakdown,
  upsertOrderIdempotent,
} from "../lib/production-os";
import { ProductionJobTicketModal } from "./ProductionJobTicketModal";

export default function QuoteForm() {
  const [formData, setFormData] = useState({
    company: "",
    email: "",
    phone: "",
    garment: "Dresses and womenswear",
    quantity: "100–499 pieces",
    exactQuantity: 250,
    specifications: "Technical pack",
    targetDeliveryDate: "",
    promoCode: "",
    details: "",
  });

  const [sizeBreakdown, setSizeBreakdown] = useState<SizeBreakdown>(() =>
    computeDefaultSizeBreakdown(250)
  );
  const [showSizeEditor, setShowSizeEditor] = useState(false);
  const [hasSavedMatrix, setHasSavedMatrix] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [createdOrder, setCreatedOrder] = useState<ProductionOrder | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);

  // Check if user saved a size matrix from /size-charts
  useEffect(() => {
    const draft = loadDraftSizeMatrix();
    if (draft) {
      setHasSavedMatrix(true);
    }
  }, []);

  // modern-web-guidance: accessible-error-announcement
  // Synchronize aria-invalid with :user-invalid (with feature-detection fallback)
  const syncInputValidity = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    > | React.FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const input = e.currentTarget;
    if (typeof window === "undefined") return;
    const supportsUserInvalid =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("selector(:user-invalid)");

    if (supportsUserInvalid) {
      const isUserInvalid = input.matches(":user-invalid");
      if (isUserInvalid) {
        input.setAttribute("aria-invalid", "true");
      } else {
        input.removeAttribute("aria-invalid");
      }
    } else {
      const isValid = input.checkValidity();
      input.classList.toggle("user-invalid-fallback", !isValid);
      if (!isValid) {
        input.setAttribute("aria-invalid", "true");
      } else {
        input.removeAttribute("aria-invalid");
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "quantity") {
      const defaultUnits = parseQuantityBracketToDefaultUnits(value);
      setFormData((prev) => ({
        ...prev,
        quantity: value,
        exactQuantity: defaultUnits,
      }));
      setSizeBreakdown(computeDefaultSizeBreakdown(defaultUnits));
      return;
    }
    if (name === "exactQuantity") {
      const num = Math.max(10, Number(value) || 0);
      setFormData((prev) => ({ ...prev, exactQuantity: num }));
      setSizeBreakdown(computeDefaultSizeBreakdown(num));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSizeChange = (sizeKey: keyof SizeBreakdown, val: string) => {
    const count = Math.max(0, parseInt(val || "0", 10));
    const updated = { ...sizeBreakdown, [sizeKey]: count };
    setSizeBreakdown(updated);
    const sum =
      updated.XS +
      updated.S +
      updated.M +
      updated.L +
      updated.XL +
      updated.XXL;
    if (sum > 0) {
      setFormData((prev) => ({ ...prev, exactQuantity: sum }));
    }
  };

  const handleImportDraftMatrix = () => {
    const draft = loadDraftSizeMatrix();
    if (!draft) return;
    setSizeBreakdown(draft.sizeBreakdown);
    setFormData((prev) => ({
      ...prev,
      garment: draft.garmentCategory || prev.garment,
      exactQuantity: draft.totalQuantity,
      quantity:
        draft.totalQuantity < 100
          ? "Under 100 pieces"
          : draft.totalQuantity < 500
          ? "100–499 pieces"
          : draft.totalQuantity < 1000
          ? "500–999 pieces"
          : "1,000–4,999 pieces",
    }));
    setShowSizeEditor(true);
    setStatusBanner({
      type: "success",
      text: `Imported ${draft.totalQuantity} pcs size-grading ratio from Size Calculator.`,
    });
  };

  const estimate = calculateProductionEstimate({
    garmentCategory: formData.garment,
    exactQuantity: formData.exactQuantity,
    specificationsReady: formData.specifications,
    promoCode: formData.promoCode,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusBanner(null);

    const offlineId = `mkp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const jobCode = `MKP-${dateStamp}-${Math.floor(100 + Math.random() * 900)}`;

    const targetDate =
      formData.targetDeliveryDate ||
      new Date(Date.now() + estimate.estimatedLeadWeeks * 7 * 86400000)
        .toISOString()
        .slice(0, 10);

    const localOrder: ProductionOrder = {
      id: `ord-${Date.now()}`,
      jobCode,
      offlineId,
      company: formData.company.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      garmentCategory: formData.garment,
      quantityBracket: formData.quantity,
      exactQuantity: formData.exactQuantity,
      specificationsReady: formData.specifications,
      details: formData.details.trim(),
      stage: "01_brief",
      sizeBreakdown,
      estimatedUnitCostNgn: estimate.estimatedUnitCostNgn,
      totalQuoteNgn: estimate.totalQuoteNgn,
      estimatedFabricMeters: estimate.estimatedFabricMeters,
      estimatedLeadWeeks: estimate.estimatedLeadWeeks,
      discountPercent: estimate.combinedDiscountPercent,
      promoCode: estimate.promoApplied,
      assignedPatternDesigner: estimate.assignedPatternDesigner,
      assignedTailorLead: estimate.assignedTailorLead,
      assignedQcInspector: estimate.assignedQcInspector,
      unitsSewn: 0,
      unitsPassedQc: 0,
      unitsRework: 0,
      targetDeliveryDate: targetDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          offlineId,
          jobCode,
          sizeBreakdown,
          targetDeliveryDate: targetDate,
        }),
      });

      const data = await response.json().catch(() => null);
      const savedOrder: ProductionOrder = data?.order || localOrder;

      upsertOrderIdempotent(savedOrder);
      appendAuditLog({
        action: "inquiry.created",
        actor: savedOrder.company,
        role: "Brand Client",
        targetRef: savedOrder.jobCode,
        summary: `Submitted production inquiry for ${savedOrder.exactQuantity} pcs (${savedOrder.garmentCategory}). Assigned Pattern Designer: ${savedOrder.assignedPatternDesigner}.`,
      });

      setCreatedOrder(savedOrder);
      setTicketOpen(true);
      setStatusBanner({
        type: "success",
        text: `Production Brief ${savedOrder.jobCode} registered! Assigned to ${savedOrder.assignedPatternDesigner} (Pattern Studio).`,
      });
    } catch {
      // Offline-first fallback: still persist locally & generate printable job ticket
      upsertOrderIdempotent(localOrder);
      appendAuditLog({
        action: "inquiry.queued_offline",
        actor: localOrder.company,
        role: "Brand Client (Offline Queue)",
        targetRef: localOrder.jobCode,
        summary: `Queued offline production inquiry (${localOrder.exactQuantity} pcs ${localOrder.garmentCategory}).`,
      });
      setCreatedOrder(localOrder);
      setTicketOpen(true);
      setStatusBanner({
        type: "success",
        text: `Saved locally in Offline Queue (${localOrder.jobCode}). Job Ticket ready to print.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form className="quote-form" onSubmit={handleSubmit} noValidate>
        <div className="form-heading">
          <span>PRODUCTION INQUIRY &amp; LIVE MOQ ESTIMATOR</span>
          <p>Fields marked * are required · Instant Job Ticket</p>
        </div>

        {statusBanner && (
          <div
            role="status"
            className={`mkp-banner ${
              statusBanner.type === "success"
                ? "mkp-banner-olive"
                : "mkp-banner-error"
            }`}
          >
            <span>{statusBanner.text}</span>
            {createdOrder && (
              <button
                type="button"
                className="mkp-inline-btn"
                onClick={() => setTicketOpen(true)}
              >
                View / Print Job Ticket ({createdOrder.jobCode}) ↗
              </button>
            )}
          </div>
        )}

        <label>
          Company or brand name *
          <input
            name="company"
            required
            placeholder="Your fashion brand or company name"
            value={formData.company}
            onChange={handleChange}
            onBlur={syncInputValidity}
            onInput={syncInputValidity}
            aria-errormessage="err-company"
          />
          <span id="err-company" className="error-msg">
            Please enter your brand or company name.
          </span>
        </label>

        <div className="form-row">
          <label>
            Business email *
            <input
              type="email"
              name="email"
              required
              placeholder="you@brand.com"
              value={formData.email}
              onChange={handleChange}
              onBlur={syncInputValidity}
              onInput={syncInputValidity}
              aria-errormessage="err-email"
            />
            <span id="err-email" className="error-msg">
              Please enter a valid business email address.
            </span>
          </label>
          <label>
            Phone / WhatsApp
            <input
              type="tel"
              name="phone"
              placeholder="+234 ..."
              value={formData.phone}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Garment category *
            <select
              name="garment"
              required
              value={formData.garment}
              onChange={handleChange}
            >
              <option value="T-shirts and tops">T-shirts and tops</option>
              <option value="Dresses and womenswear">
                Dresses and womenswear
              </option>
              <option value="Shirts and menswear">Shirts and menswear</option>
              <option value="Trousers and bottoms">Trousers and bottoms</option>
              <option value="Uniforms and workwear">
                Uniforms and workwear
              </option>
              <option value="Sportswear and activewear">
                Sportswear and activewear
              </option>
              <option value="Mixed collection / other">
                Mixed collection / other
              </option>
            </select>
          </label>

          <label>
            Volume tier *
            <select
              name="quantity"
              required
              value={formData.quantity}
              onChange={handleChange}
            >
              <option value="Under 100 pieces">Under 100 pieces</option>
              <option value="100–499 pieces">100–499 pieces</option>
              <option value="500–999 pieces">500–999 pieces</option>
              <option value="1,000–4,999 pieces">1,000–4,999 pieces</option>
              <option value="5,000+ pieces">5,000+ pieces</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Exact piece count (for estimator) *
            <input
              type="number"
              name="exactQuantity"
              min={20}
              max={50000}
              required
              value={formData.exactQuantity}
              onChange={handleChange}
            />
          </label>
          <label>
            What do you have ready?
            <select
              name="specifications"
              value={formData.specifications}
              onChange={handleChange}
            >
              <option value="Designs and patterns">Designs and patterns</option>
              <option value="Technical pack">Technical pack</option>
              <option value="Prints and specifications">
                Prints and specifications
              </option>
              <option value="Sample garment">Sample garment</option>
              <option value="Need help defining production specifications">
                Need help defining production specifications
              </option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Target delivery date (optional)
            <input
              type="date"
              name="targetDeliveryDate"
              value={formData.targetDeliveryDate}
              onChange={handleChange}
            />
          </label>
          <label>
            B2B Partner / Promo Code
            <input
              type="text"
              name="promoCode"
              placeholder="e.g. LAGOSVIP10 or SCALE1000"
              value={formData.promoCode}
              onChange={handleChange}
            />
          </label>
        </div>

        {/* Size-Grading Ratio Bar */}
        <div className="estimator-size-bar">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
              SIZE-GRADING RATIO ({formData.exactQuantity.toLocaleString()} PCS)
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {hasSavedMatrix && (
                <button
                  type="button"
                  className="mkp-inline-btn"
                  onClick={handleImportDraftMatrix}
                >
                  ↓ Import Saved Size Chart Ratio
                </button>
              )}
              <button
                type="button"
                className="mkp-inline-btn"
                onClick={() => setShowSizeEditor((v) => !v)}
              >
                {showSizeEditor ? "Hide Size Split" : "Customize XS–XXL Split"}
              </button>
            </div>
          </div>

          {showSizeEditor ? (
            <div className="size-split-grid">
              {(["XS", "S", "M", "L", "XL", "XXL"] as const).map((sz) => (
                <label key={sz} style={{ marginBottom: 0 }}>
                  {sz}
                  <input
                    type="number"
                    min={0}
                    value={sizeBreakdown[sz]}
                    onChange={(e) => handleSizeChange(sz, e.target.value)}
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="size-pills-summary">
              {(["XS", "S", "M", "L", "XL", "XXL"] as const).map((sz) => (
                <span key={sz} className="size-pill-item">
                  <strong>{sz}:</strong> {sizeBreakdown[sz]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Live Pro-Forma Estimator Box (adapted from Nexus POS Summary) */}
        <div className="estimator-card" aria-live="polite">
          <div className="estimator-header">
            <span>INSTANT PRO-FORMA PRODUCTION ESTIMATE</span>
            <span className="mkp-badge mkp-badge-olive">
              {estimate.volumeTierLabel}
            </span>
          </div>

          <div className="estimator-metrics">
            <div>
              <div className="estimator-label">EST. UNIT COST</div>
              <div className="estimator-num mono">
                ₦{estimate.estimatedUnitCostNgn.toLocaleString()}
                <small>/pc</small>
              </div>
            </div>
            <div>
              <div className="estimator-label">EST. TOTAL QUOTE</div>
              <div className="estimator-num mono">
                ₦{estimate.totalQuoteNgn.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="estimator-label">FABRIC YARDAGE</div>
              <div className="estimator-num mono">
                {estimate.estimatedFabricMeters.toLocaleString()}m
              </div>
            </div>
            <div>
              <div className="estimator-label">LEAD TIME</div>
              <div className="estimator-num mono">
                ~{estimate.estimatedLeadWeeks} wks
              </div>
            </div>
          </div>

          <div className="estimator-team-row">
            <span>
              <strong>Pattern Designer:</strong> {estimate.assignedPatternDesigner}
            </span>
            <span>·</span>
            <span>
              <strong>Master Tailor Lead:</strong> {estimate.assignedTailorLead}
            </span>
            <span>·</span>
            <span>
              <strong>QC Inspector:</strong> {estimate.assignedQcInspector}
            </span>
          </div>

          {estimate.promoApplied && (
            <div className="estimator-promo-applied">
              ✓ Partner Code <strong>{estimate.promoApplied}</strong> applied (
              {PROMO_CODES[estimate.promoApplied]?.label})
            </div>
          )}
        </div>

        <label>
          Tell us about your order *
          <textarea
            name="details"
            required
            rows={4}
            placeholder="Garment details, fabric GSM/composition, branding labels, stitch finishes, target delivery date..."
            value={formData.details}
            onChange={handleChange}
            onBlur={syncInputValidity}
            onInput={syncInputValidity}
            aria-errormessage="err-details"
          />
          <span id="err-details" className="error-msg">
            Please share a brief description of your garment and order requirements.
          </span>
        </label>

        <button
          className="button button-dark form-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Generating Production Job Ticket..."
            : "Submit Inquiry & Generate Job Ticket"}{" "}
          <span>↗</span>
        </button>
        <p className="form-privacy">
          Generates an instant printable Pro-Forma Production Brief (`MKP-...`)
          and assigns a Pattern Designer &amp; Quality Control lead.
        </p>
      </form>

      <ProductionJobTicketModal
        order={createdOrder}
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
      />
    </>
  );
}
