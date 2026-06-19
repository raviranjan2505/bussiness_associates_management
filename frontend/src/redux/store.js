import { combineReducers, configureStore } from "@reduxjs/toolkit";
import userReducer from "./slice/userSlice";
import quotationReducer from "./slice/quotationSlice";
import invoiceReducer from "./slice/invoiceSlice";
import complaintReducer from "./slice/complaintSlice";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

const rootReducer = combineReducers({
  user: userReducer,
  quotations: quotationReducer,
  invoices: invoiceReducer,
  complaints: complaintReducer,
});

const persistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["user"],   // only persist auth; module data is fetched fresh
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);
