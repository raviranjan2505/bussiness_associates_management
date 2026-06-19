import React, { useEffect, useState } from "react";
import moment from "moment";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import axiosInstance from "../../utils/axioInstance";
import { formatMoney } from "../../utils/helper";

const AssociatePayments = () => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    axiosInstance.get("/payments").then((r) => setPayments(r.data.payments || [])).catch(console.error);
  }, []);

  return (
    <DashboardLayout activeMenu="Payments">
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
          <p className="text-sm text-gray-500">View payment history and download receipts.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {payments.map((p) => (
            <div key={p._id} className="bg-white border border-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{p.invoice?.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{p.invoice?.customerName}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-gray-900">{formatMoney(p.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span>{p.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span>{moment(p.paymentDate).format("DD MMM YYYY")}</span>
                </div>
                {p.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Txn ID</span>
                    <span className="text-xs">{p.transactionId}</span>
                  </div>
                )}
              </div>
              {p.status === "Verified" && (
                <a href={`${axiosInstance.defaults.baseURL}/payments/${p._id}/receipt`}
                  target="_blank" rel="noreferrer"
                  className="block text-center bg-gray-900 text-white rounded-lg py-2 text-xs">
                  Download Receipt
                </a>
              )}
            </div>
          ))}
          {!payments.length && (
            <p className="col-span-3 py-12 text-center text-gray-500">No payment records found.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssociatePayments;
