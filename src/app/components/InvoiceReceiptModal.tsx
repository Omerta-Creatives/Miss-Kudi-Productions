"use client";

import React from "react";
import { ClientInvoice, InvoiceStatus, PaymentReceipt } from "../lib/production-os";
import { ModalDialog } from "./ProductionJobTicketModal";
import { UiIcon } from "./UiIcon";

const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; badgeClass: string }
> = {
  draft: { label: "Draft", badgeClass: "mkp-badge" },
  issued: { label: "Issued", badgeClass: "mkp-badge mkp-badge-warn" },
  part_paid: { label: "Part paid", badgeClass: "mkp-badge mkp-badge-olive" },
  paid: { label: "Paid in full", badgeClass: "mkp-badge mkp-badge-olive" },
};

interface InvoiceDocumentModalProps {
  invoice: ClientInvoice | null;
  open: boolean;
  onClose: () => void;
  onRecordPayment?: (invoice: ClientInvoice) => void;
}

export function InvoiceDocumentModal({
  invoice,
  open,
  onClose,
  onRecordPayment,
}: InvoiceDocumentModalProps) {
  if (!invoice) return null;

  const statusMeta = INVOICE_STATUS_META[invoice.status];

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={`Commercial Invoice ${invoice.invoiceNumber}`}
      maxWidth={780}
    >
      <div className="invoice-sheet-wrap">
        <div className="job-ticket-sheet invoice-print-sheet">
          <div className="invoice-doc-header">
            <div className="invoice-brand-block">
              <img
                src="/images/mk-logo-transparent.png"
                alt="Miss Kudi Productions"
                width={52}
                height={52}
                className="wordmark-logo-img"
              />
              <div>
                <h4 className="invoice-doc-brand">Miss Kudi Productions</h4>
                <p className="ticket-sub">
                  1 Alawode Street, Surulere, Lagos, Nigeria
                </p>
                <p className="ticket-sub">
                  B2B Garment Manufacturing &amp; Private-Label Atelier
                </p>
              </div>
            </div>

            <div className="invoice-doc-meta">
              <span className={statusMeta.badgeClass}>{statusMeta.label}</span>
              <div className="invoice-doc-number mono">
                {invoice.invoiceNumber}
              </div>
              <div className="ticket-sub">Issued: {invoice.issueDate}</div>
              <div className="ticket-sub">Due: {invoice.dueDate}</div>
            </div>
          </div>

          <hr className="ticket-divider" />

          <div className="ticket-grid-2">
            <div className="ticket-box">
              <span className="ticket-label">Billed to</span>
              <div className="ticket-value">{invoice.clientName}</div>
              <div className="ticket-sub">{invoice.clientEmail}</div>
              {invoice.clientPhone && (
                <div className="ticket-sub">{invoice.clientPhone}</div>
              )}
              {invoice.clientAddress && (
                <div className="ticket-sub">{invoice.clientAddress}</div>
              )}
            </div>

            <div className="ticket-box">
              <span className="ticket-label">Production reference</span>
              <div className="ticket-value mono">
                {invoice.jobCode || "Direct Atelier Commission"}
              </div>
              <div className="ticket-sub">Currency: Nigerian Naira (NGN)</div>
              <div className="ticket-sub">
                60% deposit milestone: ₦
                {Math.round(invoice.totalAmountNgn * 0.6).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="table-scroll-wrap">
            <table className="responsive-data-table invoice-items-table">
              <thead>
                <tr>
                  <th>Description &amp; size ratio</th>
                  <th>Qty</th>
                  <th>Unit rate</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="invoice-item-title">{item.description}</div>
                      {item.sizeSpec && (
                        <div className="ticket-sub">{item.sizeSpec}</div>
                      )}
                    </td>
                    <td className="mono">{item.quantity.toLocaleString()} pcs</td>
                    <td className="mono">
                      ₦{item.unitPriceNgn.toLocaleString()}
                    </td>
                    <td className="mono">
                      <strong>₦{item.lineTotalNgn.toLocaleString()}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invoice-totals-layout">
            <div className="ticket-box invoice-settlement-box">
              <span className="ticket-label">Settlement &amp; bank details</span>
              <div className="ticket-value">
                Miss Kudi Productions Ltd (Corporate NGN)
              </div>
              <div className="ticket-sub">
                Quote invoice reference <strong>{invoice.invoiceNumber}</strong>{" "}
                on transfer narration.
              </div>
              <div className="ticket-sub">{invoice.paymentTerms}</div>
              {invoice.notes && (
                <div className="ticket-sub">{invoice.notes}</div>
              )}
            </div>

            <div className="ticket-box invoice-summary-box">
              <div className="invoice-summary-row">
                <span>Subtotal</span>
                <span className="mono">
                  ₦{invoice.subtotalNgn.toLocaleString()}
                </span>
              </div>
              {invoice.discountPercent > 0 && (
                <div className="invoice-summary-row">
                  <span>Partner discount ({invoice.discountPercent}%)</span>
                  <span className="mono">
                    -₦{invoice.discountAmountNgn.toLocaleString()}
                  </span>
                </div>
              )}
              {invoice.vatPercent > 0 && (
                <div className="invoice-summary-row">
                  <span>VAT ({invoice.vatPercent}%)</span>
                  <span className="mono">
                    ₦{invoice.vatAmountNgn.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="invoice-summary-row invoice-summary-total">
                <strong>Invoice total</strong>
                <strong className="mono">
                  ₦{invoice.totalAmountNgn.toLocaleString()}
                </strong>
              </div>
              <div className="invoice-summary-row">
                <span>Payments received</span>
                <span className="mono">
                  ₦{invoice.amountPaidNgn.toLocaleString()}
                </span>
              </div>
              <div className="invoice-summary-row invoice-summary-balance">
                <strong>Balance due</strong>
                <strong className="mono">
                  ₦{invoice.balanceDueNgn.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="invoice-modal-actions no-print">
          <button
            type="button"
            className="button button-light"
            onClick={onClose}
          >
            Close
          </button>
          <div className="invoice-modal-actions-right">
            {invoice.balanceDueNgn > 0 && onRecordPayment && (
              <button
                type="button"
                className="button button-light"
                onClick={() => onRecordPayment(invoice)}
              >
                <UiIcon name="receipt" size={15} /> Record Payment
              </button>
            )}
            <button
              type="button"
              className="button button-dark"
              onClick={() => window.print()}
            >
              <UiIcon name="print" size={15} /> Print Invoice
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}

interface ReceiptDocumentModalProps {
  receipt: PaymentReceipt | null;
  open: boolean;
  onClose: () => void;
}

export function ReceiptDocumentModal({
  receipt,
  open,
  onClose,
}: ReceiptDocumentModalProps) {
  if (!receipt) return null;

  const paidDate = receipt.paidAt.slice(0, 10);
  const settledInFull = receipt.balanceAfterNgn <= 0;

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={`Official Payment Receipt ${receipt.receiptNumber}`}
      maxWidth={640}
    >
      <div className="invoice-sheet-wrap">
        <div className="job-ticket-sheet receipt-print-sheet">
          <div className="invoice-doc-header">
            <div className="invoice-brand-block">
              <img
                src="/images/mk-logo-transparent.png"
                alt="Miss Kudi Productions"
                width={48}
                height={48}
                className="wordmark-logo-img"
              />
              <div>
                <h4 className="invoice-doc-brand">Miss Kudi Productions</h4>
                <p className="ticket-sub">
                  1 Alawode Street, Surulere, Lagos, Nigeria
                </p>
                <p className="ticket-sub">Official Payment Receipt</p>
              </div>
            </div>

            <div className="invoice-doc-meta">
              <span className="mkp-badge mkp-badge-olive">
                <UiIcon name="check" size={13} />{" "}
                {settledInFull ? "Settled in full" : "Deposit verified"}
              </span>
              <div className="invoice-doc-number mono">
                {receipt.receiptNumber}
              </div>
              <div className="ticket-sub">Date: {paidDate}</div>
            </div>
          </div>

          <hr className="ticket-divider" />

          <div className="receipt-amount-banner">
            <span className="ticket-label">Amount received (NGN)</span>
            <strong className="receipt-amount-figure mono">
              ₦{receipt.amountPaidNgn.toLocaleString()}
            </strong>
            <span className="ticket-sub">
              Payment method: {receipt.paymentMethod} (Ref:{" "}
              <span className="mono">{receipt.paymentReference}</span>)
            </span>
          </div>

          <div className="ticket-grid-2">
            <div className="ticket-box">
              <span className="ticket-label">Received from</span>
              <div className="ticket-value">{receipt.clientName}</div>
              <div className="ticket-sub">{receipt.clientEmail}</div>
            </div>

            <div className="ticket-box">
              <span className="ticket-label">Applied to invoice</span>
              <div className="ticket-value mono">{receipt.invoiceNumber}</div>
              {receipt.jobCode && (
                <div className="ticket-sub">
                  Job Code: <span className="mono">{receipt.jobCode}</span>
                </div>
              )}
              <div className="ticket-sub">
                Remaining balance:{" "}
                <strong className="mono">
                  ₦{receipt.balanceAfterNgn.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {receipt.notes && (
            <div className="ticket-box">
              <span className="ticket-label">Payment note</span>
              <div className="ticket-sub">{receipt.notes}</div>
            </div>
          )}

          <div className="receipt-signoff-row">
            <div>
              <span className="ticket-label">Verified &amp; issued by</span>
              <div className="ticket-value">{receipt.receivedBy}</div>
              <div className="ticket-sub">
                Accounts &amp; Production Desk, Surulere
              </div>
            </div>
            <div className="receipt-stamp-pill mono">
              Verified payment receipt
            </div>
          </div>
        </div>

        <div className="invoice-modal-actions no-print">
          <button
            type="button"
            className="button button-light"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="button button-dark"
            onClick={() => window.print()}
          >
            <UiIcon name="print" size={15} /> Print Official Receipt
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
