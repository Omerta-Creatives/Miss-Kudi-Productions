"use client";

import React, { useEffect, useState } from "react";
import {
  appendAuditLog,
  buildInvoiceFromOrder,
  ClientInvoice,
  computeInvoiceTotals,
  generateInvoiceNumber,
  InvoiceLineItem,
  InvoiceStatus,
  loadInvoices,
  loadOrders,
  loadReceipts,
  PaymentMethod,
  PaymentReceipt,
  ProductionOrder,
  recordInvoicePayment,
  saveInvoices,
} from "../lib/production-os";
import { ModalDialog } from "./ProductionJobTicketModal";
import {
  InvoiceDocumentModal,
  ReceiptDocumentModal,
} from "./InvoiceReceiptModal";
import { UiIcon } from "./UiIcon";

interface InvoicingLedgerPanelProps {
  actorName: string;
  branchId?: string;
  orders?: ProductionOrder[];
  onNotice?: (message: string) => void;
}

const STATUS_BADGE_MAP: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "mkp-badge" },
  issued: { label: "Issued", className: "mkp-badge mkp-badge-warn" },
  part_paid: { label: "Part paid", className: "mkp-badge mkp-badge-olive" },
  paid: { label: "Paid in full", className: "mkp-badge mkp-badge-olive" },
};

export function InvoicingLedgerPanel({
  actorName,
  branchId,
  orders: externalOrders,
  onNotice,
}: InvoicingLedgerPanelProps) {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [localOrders, setLocalOrders] = useState<ProductionOrder[]>([]);

  const [subView, setSubView] = useState<"invoices" | "receipts">("invoices");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>("");
  const [activeInvoiceDoc, setActiveInvoiceDoc] =
    useState<ClientInvoice | null>(null);
  const [activeReceiptDoc, setActiveReceiptDoc] =
    useState<PaymentReceipt | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<ClientInvoice | null>(
    null
  );

  // Create Invoice Form
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("Lagos, Nigeria");
  const [linkedJobCode, setLinkedJobCode] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [includeVat, setIncludeVat] = useState<boolean>(false);
  const [paymentTerms, setPaymentTerms] = useState(
    "60% deposit required prior to bulk fabric cutting; 40% balance due upon AQL 2.5 quality sign-off and prior to dispatch."
  );
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: "line-1",
      description: "Bulk cut-and-sew garment production",
      sizeSpec: "XS to XXL graded size curve",
      quantity: 100,
      unitPriceNgn: 13500,
      lineTotalNgn: 1350000,
    },
  ]);

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  const syncBilling = () => {
    setInvoices(loadInvoices());
    setReceipts(loadReceipts());
    setLocalOrders(loadOrders());
  };

  useEffect(() => {
    syncBilling();
    window.addEventListener("mkp:billing-change", syncBilling);
    return () => window.removeEventListener("mkp:billing-change", syncBilling);
  }, []);

  const notify = (msg: string) => {
    if (onNotice) onNotice(msg);
  };

  const ordersList = externalOrders || localOrders;

  const scopedInvoices = branchId
    ? invoices.filter((inv) => !inv.branchId || inv.branchId === branchId)
    : invoices;

  const scopedInvoiceIds = new Set(scopedInvoices.map((i) => i.id));
  const scopedReceipts = branchId
    ? receipts.filter((rcp) => scopedInvoiceIds.has(rcp.invoiceId))
    : receipts;

  const totalInvoicedNgn = scopedInvoices.reduce(
    (sum, inv) => sum + inv.totalAmountNgn,
    0
  );
  const totalCollectedNgn = scopedInvoices.reduce(
    (sum, inv) => sum + inv.amountPaidNgn,
    0
  );
  const totalBalanceDueNgn = scopedInvoices.reduce(
    (sum, inv) => sum + inv.balanceDueNgn,
    0
  );

  const filteredInvoices = scopedInvoices.filter((inv) => {
    const matchesStatus =
      statusFilter === "all" || inv.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      inv.clientEmail.toLowerCase().includes(q) ||
      (inv.jobCode || "").toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const filteredReceipts = scopedReceipts.filter((rcp) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      rcp.receiptNumber.toLowerCase().includes(q) ||
      rcp.invoiceNumber.toLowerCase().includes(q) ||
      rcp.clientName.toLowerCase().includes(q) ||
      rcp.paymentReference.toLowerCase().includes(q) ||
      (rcp.jobCode || "").toLowerCase().includes(q)
    );
  });

  const resetCreateForm = () => {
    setSelectedOrderCode("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("Lagos, Nigeria");
    setLinkedJobCode("");
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
    setDiscountPercent(0);
    setIncludeVat(false);
    setNotes("");
    setLineItems([
      {
        id: `line-${Date.now()}`,
        description: "Bulk cut-and-sew garment production",
        sizeSpec: "XS to XXL graded size curve",
        quantity: 100,
        unitPriceNgn: 13500,
        lineTotalNgn: 1350000,
      },
    ]);
  };

  const handlePrefillFromOrder = (jobCode: string) => {
    setSelectedOrderCode(jobCode);
    const matched = ordersList.find((o) => o.jobCode === jobCode);
    if (!matched) return;
    const draft = buildInvoiceFromOrder(matched);
    setClientName(draft.clientName);
    setClientEmail(draft.clientEmail);
    setClientPhone(draft.clientPhone || "");
    setClientAddress(draft.clientAddress || "Lagos, Nigeria");
    setLinkedJobCode(matched.jobCode);
    setLineItems(draft.items);
    setDiscountPercent(0);
    setNotes(draft.notes || "");
  };

  const handleLineChange = (
    idx: number,
    field: keyof InvoiceLineItem,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        const qty = Math.max(1, Number(updated.quantity) || 1);
        const rate = Math.max(0, Number(updated.unitPriceNgn) || 0);
        updated.lineTotalNgn = Math.round(qty * rate);
        return updated;
      })
    );
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length + 1}`,
        description: "Custom woven neck labels & finishing",
        sizeSpec: "All sizes",
        quantity: 100,
        unitPriceNgn: 850,
        lineTotalNgn: 85000,
      },
    ]);
  };

  const handleRemoveLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const draftTotals = computeInvoiceTotals(
    lineItems,
    discountPercent,
    includeVat ? 7.5 : 0,
    0
  );

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) return;

    const now = new Date();
    const created: ClientInvoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      invoiceNumber: generateInvoiceNumber(),
      jobCode: linkedJobCode.trim() || undefined,
      branchId,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientAddress: clientAddress.trim() || undefined,
      issueDate: now.toISOString().slice(0, 10),
      dueDate,
      ...draftTotals,
      paymentTerms: paymentTerms.trim(),
      notes: notes.trim() || undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const next = [created, ...invoices];
    setInvoices(next);
    saveInvoices(next);
    appendAuditLog({
      action: "finance.invoice_issued",
      actor: actorName,
      role: "Accounts & Production Desk",
      targetRef: created.invoiceNumber,
      summary: `Issued invoice ${created.invoiceNumber} to ${created.clientName} for ₦${created.totalAmountNgn.toLocaleString()}.`,
    });

    setCreateModalOpen(false);
    resetCreateForm();
    setActiveInvoiceDoc(created);
    notify(
      `Issued commercial invoice ${created.invoiceNumber} for ₦${created.totalAmountNgn.toLocaleString()}.`
    );
  };

  const openRecordPaymentModal = (inv: ClientInvoice) => {
    setActiveInvoiceDoc(null);
    setPaymentTarget(inv);
    const depositDefault =
      inv.amountPaidNgn === 0
        ? Math.round(inv.totalAmountNgn * 0.6)
        : inv.balanceDueNgn;
    setPaymentAmount(String(depositDefault));
    setPaymentMethod("Bank Transfer");
    setPaymentReference(
      `TRF-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(
        100 + Math.random() * 900
      )}`
    );
    setPaymentNotes(
      inv.amountPaidNgn === 0
        ? "60% mobilization deposit prior to bulk cutting"
        : "Balance settlement prior to dispatch"
    );
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    const amount = Number(paymentAmount);
    if (!(amount > 0)) return;

    const result = recordInvoicePayment({
      invoiceId: paymentTarget.id,
      amountNgn: amount,
      paymentMethod,
      paymentReference,
      receivedBy: actorName,
      notes: paymentNotes,
    });

    setInvoices(result.invoices);
    setReceipts(result.receipts);
    setPaymentTarget(null);

    if (result.receipt) {
      setActiveReceiptDoc(result.receipt);
      notify(
        `Recorded ₦${result.receipt.amountPaidNgn.toLocaleString()} and issued official receipt ${result.receipt.receiptNumber}.`
      );
    }
  };

  const handleDeleteInvoice = (inv: ClientInvoice) => {
    const next = invoices.filter((item) => item.id !== inv.id);
    setInvoices(next);
    saveInvoices(next);
    notify(`Deleted invoice ${inv.invoiceNumber}.`);
  };

  const handleExportBillingCsv = () => {
    const rows = [
      [
        "Document Type",
        "Number",
        "Client Brand",
        "Job Code",
        "Total (NGN)",
        "Paid (NGN)",
        "Balance Due (NGN)",
        "Status / Method",
        "Date",
      ],
      ...scopedInvoices.map((inv) => [
        "INVOICE",
        inv.invoiceNumber,
        `"${inv.clientName}"`,
        inv.jobCode || "-",
        String(inv.totalAmountNgn),
        String(inv.amountPaidNgn),
        String(inv.balanceDueNgn),
        inv.status,
        inv.issueDate,
      ]),
      ...scopedReceipts.map((rcp) => [
        "OFFICIAL_RECEIPT",
        rcp.receiptNumber,
        `"${rcp.clientName}"`,
        rcp.jobCode || "-",
        String(rcp.amountPaidNgn),
        String(rcp.amountPaidNgn),
        String(rcp.balanceAfterNgn),
        `"${rcp.paymentMethod} (${rcp.paymentReference})"`,
        rcp.paidAt.slice(0, 10),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miss-kudi-invoices-receipts-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="invoicing-module-stack">
      <div className="kpi-grid-4">
        <div className="kpi-card">
          <span className="ticket-label">Total invoiced</span>
          <div className="kpi-value mono">
            ₦{totalInvoicedNgn.toLocaleString()}
          </div>
          <div className="kpi-sub">
            {scopedInvoices.length} commercial invoices issued
          </div>
        </div>

        <div className="kpi-card">
          <span className="ticket-label">Payments collected</span>
          <div className="kpi-value mono">
            ₦{totalCollectedNgn.toLocaleString()}
          </div>
          <div className="kpi-sub">
            {totalInvoicedNgn > 0
              ? `${Math.round(
                  (totalCollectedNgn / totalInvoicedNgn) * 100
                )}% collection rate`
              : "Deposits & balance settlements"}
          </div>
        </div>

        <div className="kpi-card">
          <span className="ticket-label">Balance receivable</span>
          <div className="kpi-value mono">
            ₦{totalBalanceDueNgn.toLocaleString()}
          </div>
          <div className="kpi-sub">
            {scopedInvoices.filter((i) => i.balanceDueNgn > 0).length} open
            client balances
          </div>
        </div>

        <div className="kpi-card">
          <span className="ticket-label">Official receipts</span>
          <div className="kpi-value mono">{scopedReceipts.length}</div>
          <div className="kpi-sub">
            Numbered A4 &amp; thermal payment receipts
          </div>
        </div>
      </div>

      <div className="workspace-panel">
        <div className="panel-header-row">
          <div>
            <h3>Client Invoicing &amp; Official Payment Receipts</h3>
            <p>
              Issue NGN pro-forma or commercial invoices from any production
              order, log deposits or balance transfers, and print numbered
              payment receipts.
            </p>
          </div>

          <div className="panel-filter-bar">
            <button
              type="button"
              className="button button-light"
              onClick={handleExportBillingCsv}
            >
              Export Statement
            </button>
            <button
              type="button"
              className="button button-dark"
              onClick={() => {
                resetCreateForm();
                setCreateModalOpen(true);
              }}
            >
              <UiIcon name="plus" size={14} /> New Invoice
            </button>
          </div>
        </div>

        <div className="billing-toolbar-row">
          <div className="billing-view-pills" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={subView === "invoices"}
              className={`mkp-filter-pill ${
                subView === "invoices" ? "active" : ""
              }`}
              onClick={() => setSubView("invoices")}
            >
              Invoices ({scopedInvoices.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subView === "receipts"}
              className={`mkp-filter-pill ${
                subView === "receipts" ? "active" : ""
              }`}
              onClick={() => setSubView("receipts")}
            >
              Official Receipts ({scopedReceipts.length})
            </button>
          </div>

          <div className="panel-filter-bar">
            {subView === "invoices" && (
              <select
                aria-label="Filter invoices by status"
                className="table-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="issued">Issued (Unpaid)</option>
                <option value="part_paid">Part paid (Deposit in)</option>
                <option value="paid">Paid in full</option>
              </select>
            )}
            <input
              type="search"
              className="table-select"
              placeholder={
                subView === "invoices"
                  ? "Search invoice #, brand, or job code..."
                  : "Search receipt #, reference, or brand..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {subView === "invoices" ? (
          filteredInvoices.length === 0 ? (
            <div className="console-empty-state">
              <h4>No commercial invoices recorded yet</h4>
              <p>
                Create an itemized client invoice from an active production run
                or enter a custom atelier billing schedule.
              </p>
              <button
                type="button"
                className="button button-dark"
                onClick={() => {
                  resetCreateForm();
                  setCreateModalOpen(true);
                }}
              >
                <UiIcon name="plus" size={14} /> Create First Invoice
              </button>
            </div>
          ) : (
            <div className="table-scroll-wrap">
              <table className="responsive-data-table workspace-table">
                <thead>
                  <tr>
                    <th>Invoice &amp; Job Ref</th>
                    <th>Brand Client</th>
                    <th>Issued / Due</th>
                    <th>Total</th>
                    <th>Paid / Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const badge = STATUS_BADGE_MAP[inv.status];
                    const linkedReceipts = scopedReceipts.filter(
                      (r) => r.invoiceId === inv.id
                    );
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div className="mono" style={{ fontWeight: 700 }}>
                            {inv.invoiceNumber}
                          </div>
                          <div className="ticket-sub mono">
                            {inv.jobCode || "Custom commission"}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.clientName}</div>
                          <div className="ticket-sub">{inv.clientEmail}</div>
                        </td>
                        <td>
                          <div className="mono">{inv.issueDate}</div>
                          <div className="ticket-sub">Due {inv.dueDate}</div>
                        </td>
                        <td className="mono">
                          <strong>
                            ₦{inv.totalAmountNgn.toLocaleString()}
                          </strong>
                          {inv.vatPercent > 0 && (
                            <div className="ticket-sub">
                              Incl. {inv.vatPercent}% VAT
                            </div>
                          )}
                        </td>
                        <td className="mono">
                          <div>Paid: ₦{inv.amountPaidNgn.toLocaleString()}</div>
                          <div className="ticket-sub">
                            Due: ₦{inv.balanceDueNgn.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className={badge.className}>{badge.label}</span>
                        </td>
                        <td>
                          <div className="table-action-cluster">
                            <button
                              type="button"
                              className="button button-light table-btn-compact"
                              onClick={() => setActiveInvoiceDoc(inv)}
                            >
                              <UiIcon name="print" size={13} /> Invoice
                            </button>
                            {inv.balanceDueNgn > 0 && (
                              <button
                                type="button"
                                className="button button-dark table-btn-compact"
                                onClick={() => openRecordPaymentModal(inv)}
                              >
                                Record Payment
                              </button>
                            )}
                            {linkedReceipts.length > 0 && (
                              <button
                                type="button"
                                className="button button-light table-btn-compact"
                                onClick={() =>
                                  setActiveReceiptDoc(linkedReceipts[0])
                                }
                              >
                                <UiIcon name="receipt" size={13} /> Receipt
                              </button>
                            )}
                            <button
                              type="button"
                              className="button button-light table-btn-compact mkp-danger-text"
                              onClick={() => handleDeleteInvoice(inv)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : filteredReceipts.length === 0 ? (
          <div className="console-empty-state">
            <h4>No payment receipts issued yet</h4>
            <p>
              Record a deposit or balance payment against any client invoice to
              generate an official numbered receipt automatically.
            </p>
            <button
              type="button"
              className="button button-light"
              onClick={() => setSubView("invoices")}
            >
              View Invoices
            </button>
          </div>
        ) : (
          <div className="table-scroll-wrap">
            <table className="responsive-data-table workspace-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Brand Client</th>
                  <th>Invoice &amp; Job Ref</th>
                  <th>Method &amp; Ref</th>
                  <th>Amount Received</th>
                  <th>Balance After</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((rcp) => (
                  <tr key={rcp.id}>
                    <td>
                      <div className="mono" style={{ fontWeight: 700 }}>
                        {rcp.receiptNumber}
                      </div>
                      <div className="ticket-sub">
                        {rcp.paidAt.slice(0, 10)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rcp.clientName}</div>
                      <div className="ticket-sub">{rcp.clientEmail}</div>
                    </td>
                    <td className="mono">
                      <div>{rcp.invoiceNumber}</div>
                      {rcp.jobCode && (
                        <div className="ticket-sub">{rcp.jobCode}</div>
                      )}
                    </td>
                    <td>
                      <div>{rcp.paymentMethod}</div>
                      <div className="ticket-sub mono">
                        {rcp.paymentReference}
                      </div>
                    </td>
                    <td className="mono">
                      <strong>₦{rcp.amountPaidNgn.toLocaleString()}</strong>
                    </td>
                    <td className="mono">
                      {rcp.balanceAfterNgn <= 0 ? (
                        <span className="mkp-badge mkp-badge-olive">
                          Settled (₦0)
                        </span>
                      ) : (
                        <span>₦{rcp.balanceAfterNgn.toLocaleString()}</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button button-dark table-btn-compact"
                        onClick={() => setActiveReceiptDoc(rcp)}
                      >
                        <UiIcon name="print" size={13} /> Print Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE INVOICE MODAL */}
      <ModalDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Commercial Invoice"
        maxWidth={760}
      >
        <form className="quote-form modal-clean-form" onSubmit={handleCreateInvoice}>
          {ordersList.length > 0 && (
            <label>
              Auto-fill from an active Production Order (optional)
              <select
                value={selectedOrderCode}
                onChange={(e) => handlePrefillFromOrder(e.target.value)}
              >
                <option value="">Custom standalone invoice</option>
                {ordersList.map((ord) => (
                  <option key={ord.jobCode} value={ord.jobCode}>
                    {ord.jobCode} — {ord.company} ({ord.garmentCategory},{" "}
                    {ord.exactQuantity} pcs, ₦
                    {ord.totalQuoteNgn.toLocaleString()})
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="form-row">
            <label>
              Brand / Client Name
              <input
                type="text"
                required
                placeholder="e.g. Zora Lagos Ready-to-Wear"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </label>
            <label>
              Billing Email
              <input
                type="email"
                required
                placeholder="accounts@brandlabel.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Client Phone
              <input
                type="tel"
                placeholder="+234 800 000 0000"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </label>
            <label>
              Billing Address
              <input
                type="text"
                placeholder="Surulere, Lagos"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Linked Job Code (optional)
              <input
                type="text"
                placeholder="MKP-20261112-840"
                value={linkedJobCode}
                onChange={(e) => setLinkedJobCode(e.target.value)}
              />
            </label>
            <label>
              Payment Due Date
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>

          <div className="invoice-builder-lines">
            <div className="invoice-builder-head">
              <span className="ticket-label">Invoice line items</span>
              <button
                type="button"
                className="button button-light table-btn-compact"
                onClick={handleAddLineItem}
              >
                <UiIcon name="plus" size={13} /> Add Line Item
              </button>
            </div>

            {lineItems.map((item, idx) => (
              <div key={item.id} className="invoice-line-editor">
                <div className="form-row">
                  <label>
                    Garment / Service Description
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) =>
                        handleLineChange(idx, "description", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Size Curve / Specification
                    <input
                      type="text"
                      value={item.sizeSpec || ""}
                      onChange={(e) =>
                        handleLineChange(idx, "sizeSpec", e.target.value)
                      }
                    />
                  </label>
                </div>
                <div className="invoice-line-numbers-row">
                  <label>
                    Quantity (pcs)
                    <input
                      type="number"
                      min={1}
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineChange(
                          idx,
                          "quantity",
                          parseInt(e.target.value || "1", 10)
                        )
                      }
                    />
                  </label>
                  <label>
                    Unit Rate (₦)
                    <input
                      type="number"
                      min={0}
                      required
                      value={item.unitPriceNgn}
                      onChange={(e) =>
                        handleLineChange(
                          idx,
                          "unitPriceNgn",
                          parseInt(e.target.value || "0", 10)
                        )
                      }
                    />
                  </label>
                  <div className="invoice-line-computed">
                    <span className="ticket-label">Line total</span>
                    <strong className="mono">
                      ₦{item.lineTotalNgn.toLocaleString()}
                    </strong>
                  </div>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      className="button button-light table-btn-compact mkp-danger-text"
                      onClick={() => handleRemoveLineItem(idx)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="form-row">
            <label>
              Partner Discount (%)
              <input
                type="number"
                min={0}
                max={50}
                value={discountPercent}
                onChange={(e) =>
                  setDiscountPercent(
                    Math.min(50, Math.max(0, Number(e.target.value) || 0))
                  )
                }
              />
            </label>
            <label className="invoice-vat-checkbox">
              <span>Value Added Tax (7.5% VAT)</span>
              <span className="auth-remember-inline">
                <input
                  type="checkbox"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                />
                <span>Include statutory 7.5% VAT on invoice</span>
              </span>
            </label>
          </div>

          <label>
            Payment Terms
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </label>

          <label>
            Additional Notes (optional)
            <input
              type="text"
              placeholder="Delivery schedule, fabric lot reference, or packaging notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="estimator-card">
            <div className="estimator-metrics">
              <div>
                <span className="estimator-label">Subtotal</span>
                <strong className="estimator-num">
                  ₦{draftTotals.subtotalNgn.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="estimator-label">60% Deposit Milestone</span>
                <strong className="estimator-num">
                  ₦{Math.round(draftTotals.totalAmountNgn * 0.6).toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="estimator-label">Invoice Total</span>
                <strong className="estimator-num">
                  ₦{draftTotals.totalAmountNgn.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          <div className="invoice-modal-actions">
            <button
              type="button"
              className="button button-light"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="button button-dark">
              Issue Commercial Invoice
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* RECORD PAYMENT & ISSUE RECEIPT MODAL */}
      <ModalDialog
        open={Boolean(paymentTarget)}
        onClose={() => setPaymentTarget(null)}
        title={
          paymentTarget
            ? `Record Payment — ${paymentTarget.invoiceNumber}`
            : "Record Payment"
        }
        maxWidth={560}
      >
        {paymentTarget && (
          <form
            className="quote-form modal-clean-form"
            onSubmit={handleSubmitPayment}
          >
            <div className="estimator-card">
              <div className="estimator-metrics">
                <div>
                  <span className="estimator-label">Invoice Total</span>
                  <strong className="estimator-num">
                    ₦{paymentTarget.totalAmountNgn.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="estimator-label">Already Paid</span>
                  <strong className="estimator-num">
                    ₦{paymentTarget.amountPaidNgn.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="estimator-label">Balance Due</span>
                  <strong className="estimator-num">
                    ₦{paymentTarget.balanceDueNgn.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="panel-filter-bar">
                {paymentTarget.amountPaidNgn === 0 && (
                  <button
                    type="button"
                    className="mkp-filter-pill"
                    onClick={() =>
                      setPaymentAmount(
                        String(Math.round(paymentTarget.totalAmountNgn * 0.6))
                      )
                    }
                  >
                    60% Deposit (₦
                    {Math.round(
                      paymentTarget.totalAmountNgn * 0.6
                    ).toLocaleString()}
                    )
                  </button>
                )}
                <button
                  type="button"
                  className="mkp-filter-pill"
                  onClick={() =>
                    setPaymentAmount(String(paymentTarget.balanceDueNgn))
                  }
                >
                  Full Balance (₦
                  {paymentTarget.balanceDueNgn.toLocaleString()})
                </button>
              </div>
            </div>

            <div className="form-row">
              <label>
                Amount Received (₦)
                <input
                  type="number"
                  min={1}
                  max={paymentTarget.balanceDueNgn}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </label>
              <label>
                Payment Method
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Corporate Card">Corporate Card</option>
                  <option value="POS Terminal">POS Terminal</option>
                  <option value="Cash Deposit">Cash Deposit</option>
                </select>
              </label>
            </div>

            <label>
              Bank / Transaction Reference
              <input
                type="text"
                required
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </label>

            <label>
              Receipt Narration / Milestone Note
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </label>

            <div className="invoice-modal-actions">
              <button
                type="button"
                className="button button-light"
                onClick={() => setPaymentTarget(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button button-dark">
                <UiIcon name="receipt" size={14} /> Issue Official Receipt
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      <InvoiceDocumentModal
        invoice={activeInvoiceDoc}
        open={Boolean(activeInvoiceDoc)}
        onClose={() => setActiveInvoiceDoc(null)}
        onRecordPayment={(inv) => openRecordPaymentModal(inv)}
      />

      <ReceiptDocumentModal
        receipt={activeReceiptDoc}
        open={Boolean(activeReceiptDoc)}
        onClose={() => setActiveReceiptDoc(null)}
      />
    </div>
  );
}
