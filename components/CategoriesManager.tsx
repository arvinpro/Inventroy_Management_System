'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2, MoreHorizontal, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

// ✅ Schema for Category
const categorySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  totalItems: z.number().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function CategoriesManager() {
  const [categories, setCategories] = useState<CategoryFormData[]>([]);
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '' },
  });

  // ✅ Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch {
      toast.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ Submit Add/Edit Category
  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingIndex !== null) {
        const categoryToEdit = categories[editingIndex];
        const res = await axios.put(`/api/categories`, {
          id: categoryToEdit.id,
          ...data,
        });
        const updated = [...categories];
        updated[editingIndex] = res.data;
        setCategories(updated);
        toast.success(`Updated "${data.name}"`);
        setEditingIndex(null);
      } else {
        const res = await axios.post('/api/categories', data);
        setCategories((prev) => [res.data, ...prev]);
        toast.success(`Added "${data.name}"`);
      }
      form.reset();
      setOpen(false);
    } catch {
      toast.error('Failed to save category');
    }
  };

  // ✅ Handle Edit
  const handleEdit = (index: number) => {
    const category = categories[index];
    form.reset(category);
    setEditingIndex(index);
    setOpen(true);
  };

  // ✅ Handle Delete
  const confirmDelete = async () => {
    if (deleteIndex !== null) {
      const categoryToDelete = categories[deleteIndex];
      try {
        await axios.delete(`/api/categories?id=${categoryToDelete.id}`);
        setCategories((prev) => prev.filter((_, i) => i !== deleteIndex));
        toast.success(`Deleted "${categoryToDelete.name}"`);
      } catch {
        toast.error('Failed to delete category');
      } finally {
        setDeleteIndex(null);
      }
    }
  };

  // ✅ Filter + Pagination
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1;
  const paginatedCategories = filteredCategories.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  useEffect(() => setPage(1), [search]);

  // ✅ Chart Data
  const chartData = categories.map((c) => ({
    name: c.name,
    total: c.totalItems ?? 0,
  }));

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white shadow-xl rounded-2xl p-6">
        <h1 className="text-4xl font-semibold text-gray-800 mb-2">Manage Categories</h1>
        <p className="text-gray-600 mb-6 opacity-50">
          Add, edit, delete, and analyze your product categories
        </p>

        {/* 🔍 Search + Add */}
        <div className="flex flex-wrap gap-3 justify-between mb-6">
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} /> {editingIndex !== null ? 'Edit Category' : 'Add Category'}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null ? 'Edit Category' : 'Add Category'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Input placeholder="Category Name" {...form.register('name')} />
                <Input placeholder="Description (optional)" {...form.register('description')} />
                <Button type="submit" className="w-full">
                  {editingIndex !== null ? 'Update Category' : 'Add Category'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* 🧾 Table */}
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <Table>
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableHead className="text-center w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Total Products</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCategories.map((c, index) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-center">
                      {index + 1 + (page - 1) * itemsPerPage}
                    </TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.description || '-'}</TableCell>
                    <TableCell className="text-center font-medium">
                      {c.totalItems ?? 0} products
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(index + (page - 1) * itemsPerPage)}
                          >
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              setDeleteIndex(index + (page - 1) * itemsPerPage)
                            }
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 🧭 Pagination */}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="px-3 py-1 text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>

        {/* 🗑️ Delete Confirmation */}
        <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this category? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 📊 Charts */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Category Analysis</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
