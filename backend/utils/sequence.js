// Generates a sequential, human friendly document number such as
// QUO-2026-00001, INV-2026-00001, COMP-2026-00001
// Follows the same pattern already used for WorkSubmission.workId
export const generateSequenceNumber = async (Model, prefix) => {
  const count = await Model.countDocuments();
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
};

export default generateSequenceNumber;
