import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";


const InvoiceDetail = () => {
  const { id } = useParams();
  const { currentUser } = useSelector((s) => s.user);
  const isAdmin = currentUser?.role === "admin";

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);

  const load = async () => {
    const [invRes, payRes] = await Promise.all([
      axiosInstance.get(`/invoices/${id}`),
      axiosInstance.get("/payments", { params: { invoiceId: id } }),
    ]);
    setInvoice(invRes.data);
    setPayments(payRes.data.payments || []);
  };

  useEffect(() => { load().catch(console.error); }, [id]);

  const downloadPdf = () => window.open(`${axiosInstance.defaults.baseURL}/invoices/${id}/pdf`, "_blank");

  if (!invoice) return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6">Loading…</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout activeMenu="Invoices">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-gray-500">
              {invoice.customerName}
              {invoice.quotation && ` · Quotation: ${invoice.quotation.quotationNumber}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={invoice.invoiceStatus} />
            <button onClick={downloadPdf} className="border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left */}
          <div className="xl:col-span-2 space-y-5">
            {/* Client details */}
            <section className="bg-white border border-gray-100 rounded-lg p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Client Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Info label="Customer"  value={invoice.customerName} />
                <Info label="Email"     value={invoice.customerEmail} />
                <Info label="Phone"     value={invoice.customerPhone} />
                <Info label="Associate" value={invoice.associate?.name} />
                <Info label="Due Date"  value={invoice.dueDate ? moment(invoice.dueDate).format("DD MMM YYYY") : "—"} />
              </div>
            </section>

            {/* Services */}
            <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="p-5 border-b"><h2 className="font-semibold text-gray-900">Services</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="p-3">Service</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.services?.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3 text-right">{formatMoney(s.price)}</td>
                        <td className="p-3 text-right">{s.quantity}</td>
                        <td className="p-3 text-right">{formatMoney(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Payment history */}
            <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Payment History</h2>
                {isAdmin && (
                  <Link to={`/admin/payments?invoiceId=${id}`} className="text-sm text-blue-700 hover:underline">
                    Manage Payments
                  </Link>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Method</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Status</th>
                      {!isAdmin && <th className="p-3">Receipt</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className="border-t">
                        <td className="p-3">{moment(p.paymentDate).format("DD MMM YYYY")}</td>
                        <td className="p-3">{p.paymentMethod}</td>
                        <td className="p-3 text-right font-medium">{formatMoney(p.amount)}</td>
                        <td className="p-3"><StatusBadge status={p.status} /></td>
                        {!isAdmin && (
                          <td className="p-3">
                            {p.status === "Verified" && (
                              <a href={`${axiosInstance.defaults.baseURL}/payments/${p._id}/receipt`}
                                target="_blank" rel="noreferrer" className="text-blue-700 text-xs hover:underline">
                                Download
                              </a>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {!payments.length && (
                      <tr><td colSpan={5} className="p-4 text-gray-500">No payments recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right */}
          <aside className="space-y-5">
            {/* Totals */}
            <section className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Summary</h2>
              <Row label="Subtotal"     value={formatMoney(invoice.subtotal)} />
              {invoice.discount?.amount > 0 && <Row label="Discount" value={`- ${formatMoney(invoice.discount.amount)}`} />}
              {invoice.tax?.amount > 0 && <Row label={`Tax (${invoice.tax.percent}%)`} value={formatMoney(invoice.tax.amount)} />}
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span><span>{formatMoney(invoice.totalAmount)}</span>
              </div>
              <Row label="Amount Paid" value={formatMoney(invoice.amountPaid)} />
              <div className={`flex justify-between font-semibold ${invoice.balanceDue > 0 ? "text-red-700" : "text-emerald-700"}`}>
                <span>Balance Due</span><span>{formatMoney(invoice.balanceDue)}</span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-lg bg-gray-50 p-3">
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <div className="font-medium text-gray-900 mt-1">{value || "—"}</div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default InvoiceDetail;
