"use client";

import React, { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { ProductionOrder, STAGE_METADATA } from "../lib/production-os";
import { UiIcon } from "./UiIcon";

export function ModalDialog({
  open,
  onClose,
  title,
  children,
  maxWidth = 640,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);

    let handleBackdropClick: ((event: MouseEvent) => void) | null = null;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener("click", handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener("click", handleBackdropClick);
      }
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className="mkp-dialog"
      style={{ maxWidth }}
    >
      <div className="mkp-dialog-header no-print">
        <div>
          <h3 id={titleId} style={{ margin: 0, fontSize: 18 }}>
            {title}
          </h3>
        </div>
        <button
          type="button"
          className="mkp-dialog-close"
          onClick={() => dialogRef.current?.close()}
        >
          Close
        </button>
      </div>
      <div className="mkp-dialog-body">{children}</div>
    </dialog>
  );
}

export function ProductionJobTicketModal({
  order,
  open,
  onClose,
}: {
  order: ProductionOrder | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!order) return null;

  const stageMeta = STAGE_METADATA[order.stage] || STAGE_METADATA["01_brief"];
  const sizes = order.sizeBreakdown || { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={`Production Job Ticket: ${order.jobCode}`}
      maxWidth={680}
    >
      <div className="job-ticket-sheet" id="printable-job-ticket">
        <div className="job-ticket-top">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/images/mk-logo-transparent.png"
              alt="Miss Kudi Productions"
              width={58}
              height={58}
              className="wordmark-logo-img"
              style={{ width: 58, height: 58 }}
            />
            <div className="wordmark-sub">
              B2B garment manufacturing, 1 Alawode Street, Surulere, Lagos
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="mkp-badge mkp-badge-olive">
              Stage {stageMeta.stepNumber}: {stageMeta.shortLabel}
            </span>
            <div
              className="mono"
              style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}
            >
              {order.jobCode}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>
              Issued: {new Date(order.createdAt).toLocaleDateString()}, Target:{" "}
              {order.targetDeliveryDate}
            </div>
          </div>
        </div>

        <hr className="ticket-divider" />

        <div className="ticket-grid-2">
          <div>
            <div className="ticket-label">Fashion brand / client</div>
            <div className="ticket-value">{order.company}</div>
            <div className="ticket-sub">
              {order.email} {order.phone ? `, ${order.phone}` : ""}
            </div>
          </div>
          <div>
            <div className="ticket-label">Garment specification</div>
            <div className="ticket-value">{order.garmentCategory}</div>
            <div className="ticket-sub">
              Input Ready: <strong>{order.specificationsReady}</strong>, Run Volume:{" "}
              <strong>{order.exactQuantity.toLocaleString()} pcs</strong>
            </div>
          </div>
        </div>

        <div className="ticket-box" style={{ marginTop: 14 }}>
          <div className="ticket-label">Assigned artisan production team</div>
          <div className="ticket-grid-3" style={{ marginTop: 8 }}>
            <div>
              <span className="ticket-role-tag">Pattern Designer</span>
              <div style={{ fontWeight: 700, fontSize: 12, marginTop: 3 }}>
                {order.assignedPatternDesigner}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                CAD Grading &amp; Marker Layout
              </div>
            </div>
            <div>
              <span className="ticket-role-tag">Master Tailor / Sewing Lead</span>
              <div style={{ fontWeight: 700, fontSize: 12, marginTop: 3 }}>
                {order.assignedTailorLead}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                Bulk Sewing Line &amp; Assembly
              </div>
            </div>
            <div>
              <span className="ticket-role-tag">Quality Control (QC)</span>
              <div style={{ fontWeight: 700, fontSize: 12, marginTop: 3 }}>
                {order.assignedQcInspector}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                AQL 2.5 &amp; Measurement Check
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="ticket-label" style={{ marginBottom: 6 }}>
            Size-grading matrix (Total: {order.exactQuantity.toLocaleString()} pieces)
          </div>
          <table className="ticket-size-table">
            <thead>
              <tr>
                <th>XS</th>
                <th>S</th>
                <th>M</th>
                <th>L</th>
                <th>XL</th>
                <th>XXL</th>
                <th>Total Units</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{sizes.XS}</td>
                <td>{sizes.S}</td>
                <td>{sizes.M}</td>
                <td>{sizes.L}</td>
                <td>{sizes.XL}</td>
                <td>{sizes.XXL}</td>
                <td>
                  <strong>{order.exactQuantity.toLocaleString()} pcs</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="ticket-label">Technical brief &amp; finishing notes</div>
          <p
            className="mkp-surface-warm"
            style={{
              fontSize: 11.5,
              lineHeight: 1.6,
              margin: "4px 0 0",
              padding: "10px 12px",
              border: "1px solid var(--line)",
            }}
          >
            {order.details}
          </p>
        </div>

        <hr className="ticket-divider" />

        <div className="ticket-grid-2" style={{ alignItems: "end" }}>
          <div>
            <div className="ticket-label">Fabric &amp; lead-time allocation</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>
              Est. Fabric Required:{" "}
              <strong>{order.estimatedFabricMeters.toLocaleString()} meters</strong> (incl.
              5% cutting lay allowance)
            </div>
            <div style={{ fontSize: 11.5, marginTop: 2 }}>
              Est. Turnaround:{" "}
              <strong>{order.estimatedLeadWeeks} weeks</strong> from sample sign-off
            </div>
            {order.unitsSewn > 0 && (
              <div style={{ fontSize: 11.5, marginTop: 4, color: "var(--ink)" }}>
                Floor Progress: <strong>{order.unitsSewn}</strong> sewn,{" "}
                <strong>{order.unitsPassedQc}</strong> passed QC (
                {Math.round((order.unitsPassedQc / Math.max(1, order.unitsSewn)) * 100)}%
                First-Pass Yield)
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="ticket-label">Pro-forma cost estimate</div>
            <div style={{ fontSize: 11.5, marginTop: 3 }}>
              Unit Rate: <strong>₦{order.estimatedUnitCostNgn.toLocaleString()}/pc</strong>
              {order.discountPercent > 0 && (
                <span> ({order.discountPercent}% Volume/Partner Discount)</span>
              )}
            </div>
            <div
              className="mono"
              style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}
            >
              ₦{order.totalQuoteNgn.toLocaleString()}
            </div>
            <div style={{ fontSize: 9.5, color: "var(--muted)" }}>
              Subject to final pattern review &amp; fabric swatch confirmation
            </div>
          </div>
        </div>
      </div>

      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="button button-dark"
            onClick={() => window.print()}
            style={{ minHeight: 42 }}
          >
            <UiIcon name="print" /> Print Job Ticket
          </button>
          <Link
            href={`/tracker?job=${encodeURIComponent(order.jobCode)}`}
            className="button button-light"
            onClick={onClose}
            style={{ minHeight: 42, border: "1px solid var(--line)" }}
          >
            Track Production Stage
          </Link>
        </div>
        <button
          type="button"
          className="button button-light"
          onClick={onClose}
          style={{ minHeight: 42, border: "1px solid var(--line)" }}
        >
          Done
        </button>
      </div>
    </ModalDialog>
  );
}
