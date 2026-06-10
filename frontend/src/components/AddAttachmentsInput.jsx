import React, { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";

const AddAttachmentsInput = ({ attachments, setAttachments }) => {
  const [previews, setPreviews] = useState([]);

  const safeAttachments = Array.isArray(attachments)
    ? attachments
    : attachments
    ? Array.from(attachments)
    : [];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setAttachments([...safeAttachments, ...files]);
    setPreviews((prev) => [
      ...prev,
      ...files.map((file) => ({
        name: file.name,
        type: file.type,
        preview: URL.createObjectURL(file),
      })),
    ]);
    e.target.value = "";
  };

  const handleRemove = (index) => {
    setAttachments(safeAttachments.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!safeAttachments.length) {
      setPreviews([]);
      return;
    }

    if (safeAttachments[0] instanceof File) return;

    setPreviews(
      safeAttachments.map((url) => ({
        name: typeof url === "string" ? url.split("/").pop() : "File",
        type: "application/octet-stream",
        preview: typeof url === "string" ? url : "",
      }))
    );
  }, [attachments]);

  return (
    <div className="w-full">
      <label className="block mb-2 text-sm font-semibold text-gray-800">
        Attachments <span className="text-gray-500 text-xs">(PDF or Images)</span>
      </label>

      <label
        htmlFor="attachments"
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
      >
        <FileText className="w-10 h-10 mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">
          <span className="text-blue-600 font-medium">Click to upload</span> or drag files
        </p>
        <input
          id="attachments"
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {previews.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {previews.map((file, index) => (
            <div key={index} className="relative border rounded-xl shadow-sm bg-white hover:shadow-md transition-all duration-200">
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
              >
                <X size={14} />
              </button>

              {file.type.includes("image") ? (
                <img src={file.preview} alt={file.name} className="h-28 w-full object-cover rounded-t-xl" />
              ) : (
                <div className="flex items-center justify-center h-28 bg-gray-100 rounded-t-xl text-gray-600">
                  <FileText className="w-8 h-8" />
                </div>
              )}

              <div className="p-2 text-center text-xs truncate text-gray-700 font-medium">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddAttachmentsInput;
