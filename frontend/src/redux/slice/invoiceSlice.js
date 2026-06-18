import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  invoices: [],
  loading: false,
  error: null,
};

const invoiceSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    setInvoices: (state, action) => { state.invoices = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    updateInvoice: (state, action) => {
      const idx = state.invoices.findIndex((i) => i._id === action.payload._id);
      if (idx !== -1) state.invoices[idx] = action.payload;
    },
  },
});

export const { setInvoices, setLoading, setError, updateInvoice } = invoiceSlice.actions;
export default invoiceSlice.reducer;
