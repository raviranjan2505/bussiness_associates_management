import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  quotations: [],
  loading: false,
  error: null,
};

const quotationSlice = createSlice({
  name: "quotations",
  initialState,
  reducers: {
    setQuotations: (state, action) => { state.quotations = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    addQuotation: (state, action) => { state.quotations.unshift(action.payload); },
    updateQuotation: (state, action) => {
      const idx = state.quotations.findIndex((q) => q._id === action.payload._id);
      if (idx !== -1) state.quotations[idx] = action.payload;
    },
    removeQuotation: (state, action) => {
      state.quotations = state.quotations.filter((q) => q._id !== action.payload);
    },
  },
});

export const { setQuotations, setLoading, setError, addQuotation, updateQuotation, removeQuotation } =
  quotationSlice.actions;
export default quotationSlice.reducer;
