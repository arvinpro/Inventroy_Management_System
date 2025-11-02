// src/store/features/booksSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ✅ Define the Book type
export interface Book {
  id: string;
  title: string;
  author: string;
  quantity: number;
 price: number;
}

// ✅ Define the initial state
interface BooksState {
  books: Book[];
}

const initialState: BooksState = {
  books: [],
};

// ✅ Create slice
const booksSlice = createSlice({
  name: 'books',
  initialState,
  reducers: {
    addBook: (state, action: PayloadAction<Book>) => {
      state.books.push(action.payload);
    },
    editBook: (state, action: PayloadAction<Book>) => {
      const index = state.books.findIndex((b) => b.id === action.payload.id);
      if (index !== -1) {
        state.books[index] = action.payload;
      }
    },
    deleteBook: (state, action: PayloadAction<string>) => {
      state.books = state.books.filter((b) => b.id !== action.payload);
    },
  },
});

// ✅ Export actions and reducer
export const { addBook, editBook, deleteBook } = booksSlice.actions;
export default booksSlice.reducer;
