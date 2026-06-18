import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  complaints: [],
  loading: false,
  error: null,
};

const complaintSlice = createSlice({
  name: "complaints",
  initialState,
  reducers: {
    setComplaints: (state, action) => { state.complaints = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    addComplaint: (state, action) => { state.complaints.unshift(action.payload); },
    updateComplaint: (state, action) => {
      const idx = state.complaints.findIndex((c) => c._id === action.payload._id);
      if (idx !== -1) state.complaints[idx] = action.payload;
    },
  },
});

export const { setComplaints, setLoading, setError, addComplaint, updateComplaint } = complaintSlice.actions;
export default complaintSlice.reducer;
