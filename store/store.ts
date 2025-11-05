// src/store/store.ts
'use client';

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, TypedUseSelectorHook, useSelector } from 'react-redux';
import booksReducer from './features/booksSlice';
import itemsReducer from './features/itemsSlice';
import searchReducer from './features/searchSlice';

export const store = configureStore({
  reducer: {
    books: booksReducer,
    items: itemsReducer,
    search: searchReducer,
  },
});

// ✅ Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ✅ Custom hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
