"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
} from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type CustomerType = "CUSTOMER" | "RETAILER";

type Customer = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  type: CustomerType;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | CustomerType>("ALL");
  const [isDeleting, setIsDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    type: "CUSTOMER" as CustomerType,
  });

  // 🔹 Fetch customers
  const fetchData = async () => {
    try {
      const res = await axios.get("/api/customer", {
        params: {
          search,
          type: selectedType !== "ALL" ? selectedType : undefined,
          page,
          limit,
        },
      });
      setCustomers(res.data.customers);
      setTotal(res.data.total);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching customers");
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, selectedType]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedType]);

  const totalPages = Math.ceil(total / limit) || 1;

  // 🔹 Add or Update Customer
 const handleSubmit = async () => {
  try {
    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }

    if (editingCustomer) {
      await axios.put(`/api/customer/${editingCustomer.id}`, formData);
      toast.success("Customer updated successfully");
    } else {
      await axios.post("/api/customer", formData);
      toast.success("Customer added successfully");
    }

    // 🔹 Fetch fresh data after add/update
    await fetchData();

    // Reset modal and form
    setModalOpen(false);
    setEditingCustomer(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      type: "CUSTOMER",
    });
  } catch (error) {
    console.error(error);
    toast.error("Error saving customer");
  }
};


  // 🔹 Edit Customer
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
      type: customer.type,
    });
    setModalOpen(true);
  };

  // 🔹 Delete Customer
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    setIsDeleting(true);
    try {
      await axios.delete(`/api/customer/${id}`);
      toast.success("Customer deleted successfully");

      // Remove from state immediately
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setTotal((prev) => prev - 1);
    } catch (error: any) {
      console.error("Delete error:", error.response?.data || error);
      const message =
        error.response?.data?.error ||
        "This customer cannot be deleted because they are linked to existing orders or sales.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 w-full bg-white shadow-xl rounded-2xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customers & Retailers</h1>
        <Button onClick={() => setModalOpen(true)}>Add Customer / Retailer</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={selectedType}
          onValueChange={(val) => setSelectedType(val as any)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
            <SelectItem value="RETAILER">Retailer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customers Table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-200">
            <TableHead>#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length > 0 ? (
            customers.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell>{i + 1 + (page - 1) * limit}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone || "-"}</TableCell>
                <TableCell>{c.address || "-"}</TableCell>
                <TableCell>{c.type}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => handleDelete(c.id)}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6">
                No customers found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="mt-6 flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "opacity-50 pointer-events-none" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 py-1 text-sm font-medium">
                Page {page} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "opacity-50 pointer-events-none" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  setFormData({ ...formData, type: val as CustomerType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="RETAILER">Retailer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingCustomer ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
