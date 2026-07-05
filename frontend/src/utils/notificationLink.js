// Resolves the route a notification should open when clicked, based on the
// current user's role and whichever related record is attached to it.
// Existing notification types/refs (lead, workSubmission, quotation,
// invoice, payment, complaint) are unchanged — this only adds navigation
// on top of data that's already being sent by the backend.
export const resolveNotificationLink = (notification, role) => {
  if (!notification) return null;
  const prefix = role === "admin" ? "/admin" : "/associate";

  const idOf = (ref) => (typeof ref === "string" ? ref : ref?._id);

  if (notification.complaint) {
    return `${prefix}/complaints/${idOf(notification.complaint)}`;
  }
  if (notification.invoice) {
    // Payment notifications always carry the related invoice too, so
    // payments open the invoice they belong to (there's no standalone
    // payment detail page in this app).
    return `${prefix}/invoices/${idOf(notification.invoice)}`;
  }
  if (notification.payment) {
    return `${prefix}/payments`;
  }
  if (notification.quotation) {
    return `${prefix}/quotations/${idOf(notification.quotation)}`;
  }
  if (notification.workSubmission) {
    return `${prefix}/work/${idOf(notification.workSubmission)}`;
  }
  if (notification.lead) {
    return `${prefix}/leads/${idOf(notification.lead)}`;
  }
  return null;
};