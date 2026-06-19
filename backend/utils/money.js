// Shared money helpers used across business, quotation, invoice and payment controllers
export const toMoney = (value) => Number(Number(value || 0).toFixed(2));

export default toMoney;
