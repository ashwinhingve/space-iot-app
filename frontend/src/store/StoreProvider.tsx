'use client';

import { ReactNode } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store, AppDispatch } from './store';

export function StoreProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

// Typed dispatch hook — exported here so Providers can import it without circular deps
export function useAppDispatch() {
  return useDispatch<AppDispatch>();
}
