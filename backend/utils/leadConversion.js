import Lead from "../models/lead.model.js";
import WorkSubmission from "../models/workSubmission.model.js";
import { errorHandler } from "./error.js";

export const convertLeadToWork = async (lead, options = {}) => {
  if (!lead) throw errorHandler(404, "Lead not found");
  if (lead.isConverted) return null;

  const {
    status = "Pending",
    reason = "Lead converted to work",
    remark = "Work created after payment",
    updatedBy = lead.associate,
  } = options;

  const work = new WorkSubmission({
    associate: lead.associate,
    division: lead.division,
    service: lead.service,
    servicePrice: lead.servicePrice,
    associateEarningPercent: lead.associateEarningPercent,
    associateEarningAmount: lead.associateEarningAmount,
    loanAmount: lead.loanAmount || 0,
    clientDetails: lead.clientDetails,
    formData: lead.formData,
    documents: lead.documents,
    expectedCompletionDate: lead.expectedCompletionDate,
    remarks: lead.remarks,
    leadId: lead._id,
    quotationId: lead.quotationId,
    invoiceId: lead.invoiceId,
    paymentId: lead.paymentId,
    status,
  });

  work.statusHistory.push({
    newStatus: status,
    reason,
    remark,
    updatedBy,
  });

  work.auditLogs.push({
    actionType: "Lead Converted",
    description: `Lead ${lead.leadId} converted into work`,
    user: lead.associate,
    userName: "System",
    userRole: "system",
  });

  await work.save();

  const previousStatus = lead.leadStatus;
  lead.isConverted = true;
  lead.convertedWorkId = work._id;
  lead.convertedAt = new Date();
  lead.leadStatus = "Converted To Work";
  lead.statusHistory.push({
    previousStatus,
    newStatus: "Converted To Work",
    reason: "Payment completed",
    remark: "Lead moved into work management",
    updatedBy: lead.associate,
  });
  lead.auditLogs.push({
    actionType: "Converted To Work",
    description: `Converted lead to work ${work.workId}`,
    user: lead.associate,
    userName: "System",
    userRole: "system",
  });

  await lead.save();
  return work;
};

export const convertLeadIfPaid = async (invoice) => {
  if (!invoice || !invoice.leadId) return null;
  if (!["Partially Paid", "Paid"].includes(invoice.invoiceStatus)) return null;

  const lead = await Lead.findById(invoice.leadId);
  if (!lead || lead.isConverted) return null;

  if (!lead.invoiceId) {
    lead.invoiceId = invoice._id;
    await lead.save();
  }

  return convertLeadToWork(lead);
};