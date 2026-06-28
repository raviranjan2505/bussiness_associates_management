/**
 * Lightweight PDF generator using raw PDF syntax (no external library).
 * Generates simple but professional A4 PDF documents for quotations,
 * invoices and payment receipts.
 */

const COMPANY = {
  name: process.env.COMPANY_NAME || "Your CA & Business Services Firm",
  address: process.env.COMPANY_ADDRESS || "123 Business Avenue, New Delhi, India - 110001",
  email: process.env.COMPANY_EMAIL || "contact@yourfirm.com",
  phone: process.env.COMPANY_PHONE || "+91-00000-00000",
};

export const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
export const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

// We use an HTML response that the browser auto-prints as a PDF.
// The frontend's /pdf endpoints stream this HTML; users trigger "Save as PDF"
// from the browser print dialog.
const buildHtml = ({ title, docNumber, docDate, status, partyLines, tableRows, totals, notes, terms, extraSections, showCommission }) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title} ${docNumber}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; }
  .page { max-width: 794px; margin: auto; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
  .company h1 { font-size: 17px; color: #111827; }
  .company p { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .doc-meta { text-align: right; }
  .doc-meta h2 { font-size: 22px; font-weight: 800; color: #111827; text-transform: uppercase; }
  .doc-meta p { font-size: 10px; color: #374151; margin-top: 2px; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0369a1; margin-top: 4px; }
  .party { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
  .party h3 { font-size: 9px; text-transform: uppercase; color: #9ca3af; margin-bottom: 4px; }
  .party p { font-size: 11px; color: #111827; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  thead tr { background: #111827; color: white; }
  thead th { padding: 7px 10px; text-align: left; font-size: 11px; }
  thead th:last-child, thead th:nth-child(4), thead th:nth-child(3), thead th:nth-child(2) { text-align: right; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tbody td { padding: 7px 10px; font-size: 11px; border-bottom: 1px solid #f3f4f6; }
  tbody td:last-child, tbody td:nth-child(4), tbody td:nth-child(3), tbody td:nth-child(2) { text-align: right; }
  .totals { margin-left: auto; width: 280px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
  .totals table { margin: 0; }
  .totals tbody tr:nth-child(even) { background: white; }
  .totals td { padding: 5px 12px; }
  .totals td:last-child { text-align: right; font-weight: 600; }
  .totals tr.total-row td { background: #111827; color: white; font-size: 13px; font-weight: 800; }
  .totals tr.due-row td { background: #fef2f2; color: #b91c1c; font-weight: 700; }
  .totals tr.commission-row td { background: #f0fdf4; color: #15803d; font-weight: 700; }
  .notes { margin-top: 20px; padding: 10px 14px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px; }
  .notes h4 { font-size: 10px; text-transform: uppercase; color: #92400e; margin-bottom: 4px; }
  .terms { margin-top: 10px; padding: 10px 14px; background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 4px; }
  .terms h4 { font-size: 10px; text-transform: uppercase; color: #166534; margin-bottom: 4px; }
  .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company">
      <h1>${COMPANY.name}</h1>
      <p>${COMPANY.address}</p>
      <p>Email: ${COMPANY.email} | Phone: ${COMPANY.phone}</p>
    </div>
    <div class="doc-meta">
      <h2>${title}</h2>
      <p><strong>No:</strong> ${docNumber}</p>
      <p><strong>Date:</strong> ${docDate}</p>
      ${status ? `<span class="status-badge">${status}</span>` : ""}
    </div>
  </div>

  <div class="party">
    <h3>Bill To</h3>
    ${partyLines.map((l) => `<p>${l}</p>`).join("")}
  </div>

  <table>
    <thead>
      <tr>
        <th>Service / Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
        ${showCommission ? "<th>Commission</th>" : ""}
      </tr>
    </thead>
    <tbody>
      ${tableRows
        .map(
          (r) => `
        <tr>
          <td>${r.name}${r.description ? `<br/><span style="color:#6b7280;font-size:10px">${r.description}</span>` : ""}</td>
          <td>${r.quantity || 1}</td>
          <td>${formatMoney(r.price)}</td>
          <td>${formatMoney(r.amount)}</td>
          ${showCommission ? `<td style="color:#15803d;font-weight:600">${r.associateEarningAmount > 0 ? formatMoney(r.associateEarningAmount) : (r.associateEarningPercent > 0 ? `${r.associateEarningPercent}%` : "—")}</td>` : ""}
        </tr>`
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr style="background:#f3f4f6;font-weight:700;font-size:11px">
        <td colspan="3" style="padding:7px 10px">Total</td>
        <td style="padding:7px 10px;text-align:right">${formatMoney(tableRows.reduce((s, r) => s + Number(r.amount || 0), 0))}</td>
        ${showCommission ? `<td style="padding:7px 10px;text-align:right;color:#15803d">${formatMoney(tableRows.reduce((s, r) => s + Number(r.associateEarningAmount || 0), 0))}</td>` : ""}
      </tr>
    </tfoot>
  </table>

  <div class="totals">
    <table>
      <tbody>
        <tr><td>Subtotal</td><td>${formatMoney(totals.subtotal)}</td></tr>
        ${totals.discountAmount ? `<tr><td>Discount${totals.discountLabel ? ` (${totals.discountLabel})` : ""}</td><td>- ${formatMoney(totals.discountAmount)}</td></tr>` : ""}
        ${totals.taxAmount ? `<tr><td>Tax${totals.taxPercent ? ` (${totals.taxPercent}%)` : ""}</td><td>${formatMoney(totals.taxAmount)}</td></tr>` : ""}
        <tr class="total-row"><td>Total</td><td>${formatMoney(totals.totalAmount)}</td></tr>
        ${totals.amountPaid !== undefined ? `<tr><td>Amount Paid</td><td>${formatMoney(totals.amountPaid)}</td></tr>` : ""}
        ${totals.balanceDue !== undefined ? `<tr class="due-row"><td>Balance Due</td><td>${formatMoney(totals.balanceDue)}</td></tr>` : ""}
        ${totals.commissionAmount ? `<tr class="commission-row"><td>Associate Commission</td><td>${formatMoney(totals.commissionAmount)}</td></tr>` : ""}
      </tbody>
    </table>
  </div>

  ${extraSections || ""}
  ${notes ? `<div class="notes"><h4>Notes</h4><p>${notes}</p></div>` : ""}
  ${terms ? `<div class="terms"><h4>Terms & Conditions</h4><p>${terms}</p></div>` : ""}
  <div class="footer">This is a computer-generated document. No signature required. &mdash; ${COMPANY.name}</div>
</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>
`;

// Shared helper — payment history table for invoice PDFs
const _buildPaymentHistoryHtml = (payments = []) =>
  payments.length
    ? `<div style="margin-top:20px">
        <h4 style="font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px">Payment History</h4>
        <table>
          <thead><tr><th>Date</th><th>Method</th><th>Txn ID</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${payments.map((p) => `<tr><td>${formatDate(p.paymentDate)}</td><td>${p.paymentMethod}</td><td>${p.transactionId || "-"}</td><td>${formatMoney(p.amount)}</td><td>${p.status}</td></tr>`).join("")}
          </tbody>
        </table>
       </div>`
    : "";

export const streamQuotationPdf = (res, quotation) => {
  const html = buildHtml({
    title: "QUOTATION — ASSOCIATE COPY",
    docNumber: quotation.quotationNumber,
    docDate: formatDate(quotation.createdAt),
    status: quotation.status,
    partyLines: [
      quotation.customerName,
      quotation.customerEmail,
      quotation.customerPhone,
      quotation.associate?.name ? `Associate: ${quotation.associate.name}` : "",
    ].filter(Boolean),
    tableRows: quotation.services || [],
    showCommission: true,
    totals: {
      subtotal: quotation.subtotal,
      discountAmount: quotation.discount?.amount,
      discountLabel: quotation.discount?.type === "percentage" ? `${quotation.discount?.value || 0}%` : "",
      taxAmount: quotation.tax?.amount,
      taxPercent: quotation.tax?.percent,
      totalAmount: quotation.totalAmount,
      commissionAmount: quotation.associateEarningAmount || 0,
    },
    notes: quotation.notes,
    terms: quotation.terms,
    extraSections:
      quotation.validUntil
        ? `<p style="margin-top:10px;font-size:11px;color:#6b7280">Valid Until: ${formatDate(quotation.validUntil)}</p>`
        : "",
  });
  res.setHeader("Content-Type", "text/html");
  res.send(html);
};

export const streamClientQuotationPdf = (res, quotation) => {
  const html = buildHtml({
    title: "QUOTATION",
    docNumber: quotation.quotationNumber,
    docDate: formatDate(quotation.createdAt),
    status: quotation.status,
    partyLines: [
      quotation.customerName,
      quotation.customerEmail,
      quotation.customerPhone,
    ].filter(Boolean),
    tableRows: quotation.services || [],
    showCommission: false,
    totals: {
      subtotal: quotation.subtotal,
      discountAmount: quotation.discount?.amount,
      discountLabel: quotation.discount?.type === "percentage" ? `${quotation.discount?.value || 0}%` : "",
      taxAmount: quotation.tax?.amount,
      taxPercent: quotation.tax?.percent,
      totalAmount: quotation.totalAmount,
    },
    notes: quotation.notes,
    terms: quotation.terms,
    extraSections:
      quotation.validUntil
        ? `<p style="margin-top:10px;font-size:11px;color:#6b7280">Valid Until: ${formatDate(quotation.validUntil)}</p>`
        : "",
  });
  res.setHeader("Content-Type", "text/html");
  res.send(html);
};

export const streamInvoicePdf = (res, invoice, payments = []) => {
  // Associate copy — includes commission row
  const paymentHistoryHtml = _buildPaymentHistoryHtml(payments);
  const html = buildHtml({
    title: "INVOICE — ASSOCIATE COPY",
    docNumber: invoice.invoiceNumber,
    docDate: formatDate(invoice.createdAt),
    status: invoice.invoiceStatus,
    partyLines: [
      invoice.customerName,
      invoice.customerEmail,
      invoice.customerPhone,
      invoice.associate?.name ? `Associate: ${invoice.associate.name}` : "",
      invoice.quotation?.quotationNumber ? `Quotation Ref: ${invoice.quotation.quotationNumber}` : "",
      `Due Date: ${formatDate(invoice.dueDate)}`,
    ].filter(Boolean),
    tableRows: invoice.services || [],
    showCommission: true,
    totals: {
      subtotal: invoice.subtotal,
      discountAmount: invoice.discount?.amount,
      discountLabel: invoice.discount?.type === "percentage" ? `${invoice.discount?.value || 0}%` : "",
      taxAmount: invoice.tax?.amount,
      taxPercent: invoice.tax?.percent,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      commissionAmount: invoice.associateEarningAmount || 0,
    },
    notes: invoice.notes,
    terms: invoice.terms,
    extraSections: paymentHistoryHtml,
  });
  res.setHeader("Content-Type", "text/html");
  res.send(html);
};

export const streamClientInvoicePdf = (res, invoice, payments = []) => {
  // Client copy — no commission
  const paymentHistoryHtml = _buildPaymentHistoryHtml(payments);
  const html = buildHtml({
    title: "INVOICE",
    docNumber: invoice.invoiceNumber,
    docDate: formatDate(invoice.createdAt),
    status: invoice.invoiceStatus,
    partyLines: [
      invoice.customerName,
      invoice.customerEmail,
      invoice.customerPhone,
      invoice.quotation?.quotationNumber ? `Quotation Ref: ${invoice.quotation.quotationNumber}` : "",
      `Due Date: ${formatDate(invoice.dueDate)}`,
    ].filter(Boolean),
    tableRows: invoice.services || [],
    showCommission: false,
    totals: {
      subtotal: invoice.subtotal,
      discountAmount: invoice.discount?.amount,
      discountLabel: invoice.discount?.type === "percentage" ? `${invoice.discount?.value || 0}%` : "",
      taxAmount: invoice.tax?.amount,
      taxPercent: invoice.tax?.percent,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
    },
    notes: invoice.notes,
    terms: invoice.terms,
    extraSections: paymentHistoryHtml,
  });
  res.setHeader("Content-Type", "text/html");
  res.send(html);
};

export const streamReceiptPdf = (res, payment, invoice) => {
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payment Receipt</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; }
  .page { max-width: 600px; margin: 40px auto; padding: 30px; border: 2px solid #111827; border-radius: 8px; }
  h1 { font-size: 24px; text-align: center; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 20px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
  .label { color: #6b7280; }
  .value { font-weight: 600; }
  .total { font-size: 16px; font-weight: 800; color: #111827; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af; }
</style>
</head>
<body>
<div class="page">
  <h1>PAYMENT RECEIPT</h1>
  <div class="row"><span class="label">Invoice No</span><span class="value">${invoice?.invoiceNumber || "-"}</span></div>
  <div class="row"><span class="label">Customer</span><span class="value">${invoice?.customerName || "-"}</span></div>
  <div class="row"><span class="label">Payment Date</span><span class="value">${formatDate(payment.paymentDate)}</span></div>
  <div class="row"><span class="label">Payment Method</span><span class="value">${payment.paymentMethod}</span></div>
  ${payment.transactionId ? `<div class="row"><span class="label">Transaction ID</span><span class="value">${payment.transactionId}</span></div>` : ""}
  <div class="row"><span class="label">Amount Paid</span><span class="value total">${formatMoney(payment.amount)}</span></div>
  <div class="row"><span class="label">Status</span><span class="value">${payment.status}</span></div>
  ${payment.remarks ? `<div class="row"><span class="label">Remarks</span><span class="value">${payment.remarks}</span></div>` : ""}
  ${invoice ? `
  <div class="row" style="margin-top:12px"><span class="label">Invoice Total</span><span class="value">${formatMoney(invoice.totalAmount)}</span></div>
  <div class="row"><span class="label">Total Paid</span><span class="value">${formatMoney(invoice.amountPaid)}</span></div>
  <div class="row"><span class="label" style="color:#b91c1c">Balance Due</span><span class="value" style="color:#b91c1c">${formatMoney(invoice.balanceDue)}</span></div>
  ` : ""}
  <div class="footer">Computer generated receipt — ${COMPANY.name} &mdash; ${COMPANY.email}</div>
</div>
<script>window.onload = function(){ window.print(); }</script>
</body></html>`;
  res.setHeader("Content-Type", "text/html");
  res.send(html);
};

/**
 * Build a client-facing quotation HTML string (no commission) — used for email sending.
 */
export const buildClientQuotationHtml = (quotation) =>
  buildHtml({
    title: "QUOTATION",
    docNumber: quotation.quotationNumber,
    docDate: formatDate(quotation.createdAt),
    status: quotation.status,
    partyLines: [quotation.customerName, quotation.customerEmail, quotation.customerPhone].filter(Boolean),
    tableRows: quotation.services || [],
    showCommission: false,
    totals: {
      subtotal: quotation.subtotal,
      discountAmount: quotation.discount?.amount,
      discountLabel: quotation.discount?.type === "percentage" ? `${quotation.discount?.value || 0}%` : "",
      taxAmount: quotation.tax?.amount,
      taxPercent: quotation.tax?.percent,
      totalAmount: quotation.totalAmount,
    },
    notes: quotation.notes,
    terms: quotation.terms,
    extraSections: quotation.validUntil
      ? `<p style="margin-top:10px;font-size:11px;color:#6b7280">Valid Until: ${formatDate(quotation.validUntil)}</p>`
      : "",
  });

/**
 * Build a client-facing invoice HTML string (no commission) — used for email sending.
 */
export const buildClientInvoiceHtml = (invoice, payments = []) =>
  buildHtml({
    title: "INVOICE",
    docNumber: invoice.invoiceNumber,
    docDate: formatDate(invoice.createdAt),
    status: invoice.invoiceStatus,
    partyLines: [
      invoice.customerName,
      invoice.customerEmail,
      invoice.customerPhone,
      invoice.quotation?.quotationNumber ? `Quotation Ref: ${invoice.quotation.quotationNumber}` : "",
      `Due Date: ${formatDate(invoice.dueDate)}`,
    ].filter(Boolean),
    tableRows: invoice.services || [],
    showCommission: false,
    totals: {
      subtotal: invoice.subtotal,
      discountAmount: invoice.discount?.amount,
      discountLabel: invoice.discount?.type === "percentage" ? `${invoice.discount?.value || 0}%` : "",
      taxAmount: invoice.tax?.amount,
      taxPercent: invoice.tax?.percent,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
    },
    notes: invoice.notes,
    terms: invoice.terms,
    extraSections: _buildPaymentHistoryHtml(payments),
  });