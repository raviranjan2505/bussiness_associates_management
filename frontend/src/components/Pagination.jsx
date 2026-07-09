import React from "react";

// Shared pagination bar used at the bottom of every table/list page across
// the app (admin & associate). Keeping it in one place keeps the look and
// behavior identical everywhere.
const Pagination = ({ page, totalPages, onPrev, onNext, totalItems, pageSize }) => {
  if (totalPages <= 1) return null;

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t p-3 sm:flex-row">
      <span className="text-xs text-gray-500">
        {totalItems > 0 ? `${start}–${end} of ${totalItems}` : ""}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Small helper hook: keeps page state, clamps it to the current data length,
// and returns the current page's slice. Pass a fresh `list` each render.
export const usePagination = (list, pageSize = 10) => {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(Math.ceil((list?.length || 0) / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const paged = (list || []).slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    page: currentPage,
    setPage,
    totalPages,
    paged,
    resetPage: () => setPage(1),
    onPrev: () => setPage((p) => Math.max(p - 1, 1)),
    onNext: () => setPage((p) => Math.min(p + 1, totalPages)),
  };
};

export default Pagination;
