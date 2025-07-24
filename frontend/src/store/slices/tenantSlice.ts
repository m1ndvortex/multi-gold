import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  logo?: string;
  settings: {
    currency: string;
    language: string;
    timezone: string;
    goldPriceSource: string;
  };
}

interface TenantState {
  currentTenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TenantState = {
  currentTenant: null,
  isLoading: false,
  error: null,
};

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    setTenantStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    setTenantSuccess: (state, action: PayloadAction<Tenant>) => {
      state.isLoading = false;
      state.currentTenant = action.payload;
      state.error = null;
    },
    setTenantFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.currentTenant = null;
      state.error = action.payload;
    },
    updateTenantSettings: (state, action: PayloadAction<Partial<Tenant['settings']>>) => {
      if (state.currentTenant) {
        state.currentTenant.settings = {
          ...state.currentTenant.settings,
          ...action.payload,
        };
      }
    },
    clearTenant: (state) => {
      state.currentTenant = null;
      state.error = null;
    },
  },
});

export const {
  setTenantStart,
  setTenantSuccess,
  setTenantFailure,
  updateTenantSettings,
  clearTenant,
} = tenantSlice.actions;

export default tenantSlice.reducer;