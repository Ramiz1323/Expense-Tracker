"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Calendar, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, SquarePen } from 'lucide-react';

interface Transaction {
  _id: string;
  category: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
}

const CATEGORIES = {
  income: ["Salary", "Bonus", "Freelance", "Investment", "Other"],
  expense: ["Food", "Transport", "Entertainment", "Utilities", "Healthcare", "Shopping", "Other"],
};

export default function TransactionPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const router = useRouter();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.category || !formData.amount) {
      setError("Please fill in all required fields");
      return;
    }

    const payload = {
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      date: new Date(formData.date).toISOString(),
    };

    try {
      const response = await fetch(
        isEditMode
          ? `/api/transactions/${editId}`
          : `/api/transactions`,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to save transaction");

      setIsOpen(false);
      setIsEditMode(false);
      setEditId(null);

      setFormData({
        type: "expense",
        category: "",
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
      });

      fetchTransactions();
    } catch (err) {
      setError("Something went wrong");
    }
  };


  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // ---- CALCULATIONS ----
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // ---- SORTING ----
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (!sortConfig) {
      // Default sort by date descending (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    const { key, direction } = sortConfig;
    let valA: any;
    let valB: any;

    switch (key) {
      case "description":
        valA = (a.description || a.category).toLowerCase();
        valB = (b.description || b.category).toLowerCase();
        break;
      case "category":
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
        break;
      case "amount":
        valA = a.amount;
        valB = b.amount;
        break;
      case "date":
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
        break;
      default:
        return 0;
    }

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handleEditTransaction = (transaction: Transaction) => {
    setIsEditMode(true);
    setEditId(transaction._id);

    setFormData({
      type: transaction.type,
      category: transaction.category,
      description: transaction.description || "",
      amount: transaction.amount.toString(),
      date: transaction.date.split("T")[0],
    });

    setIsOpen(true);
  };


  if (loading) {
    return <div className="p-4 sm:p-6">Loading transactions...</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 pb-20">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-2xl shadow-lg text-white mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Transactions</h1>
        <p className="text-sm mt-1 opacity-90">Manage your income and expenses</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:snap-none no-scrollbar">
        {[
          {
            label: "Total Income",
            value: totalIncome,
            color: "text-emerald-600 dark:text-emerald-400",
            icon: <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          },
          {
            label: "Total Expenses",
            value: totalExpense,
            color: "text-red-600 dark:text-red-400",
            icon: <ArrowDownRight className="w-4 h-4 text-red-500" />
          },
          {
            label: "Net Balance",
            value: balance,
            color: balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400",
            icon: <Wallet className="w-4 h-4 text-blue-500" />
          },
        ].map((item, i) => (
          <div key={i} className="min-w-[240px] sm:min-w-0 snap-start backdrop-blur-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              {item.icon}
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
            <p className={`text-2xl font-bold whitespace-nowrap ${item.color}`}>
              ₹ {item.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* ADD BUTTON SECTION */}
      <div className="flex justify-between items-center mt-6">
        <h2 className="text-xl font-semibold">Transaction History</h2>
        <Button onClick={() => setIsOpen(true)} className="rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* ADD MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
            <DialogDescription>
              Record a new income or expense transaction
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTransaction} className="space-y-4 mt-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value, category: "" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES[formData.type].map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g. Monthly Grocery"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isEditMode ? "Update Transaction" : "Save Transaction"}
            </Button>

          </form>
        </DialogContent>
      </Dialog>

      {/* --- DESKTOP VIEW (TABLE) --- */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th onClick={() => handleSort("description")} className="px-4 py-3 text-left font-medium cursor-pointer hover:text-slate-700">Description</th>
              <th onClick={() => handleSort("category")} className="px-4 py-3 text-left font-medium cursor-pointer">Category</th>
              <th onClick={() => handleSort("date")} className="px-4 py-3 text-left font-medium cursor-pointer">Date</th>
              <th onClick={() => handleSort("amount")} className="px-4 py-3 text-right font-medium cursor-pointer">Amount</th>
              <th className="px-4 py-3 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedTransactions.map((t) => (
              <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="px-4 py-3 font-medium">
                  <div className="flex flex-col">
                    <span>{t.description || t.category}</span>
                    <span className="text-xs text-slate-400 font-normal capitalize">{t.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="font-normal">{t.category}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(t.date)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {t.type === "income" ? "+" : "-"} ₹{Math.abs(t.amount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                      onClick={() => handleEditTransaction(t)}
                    >
                      <SquarePen className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={() => handleDeleteTransaction(t._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedTransactions.length === 0 && (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            No transactions found.
          </div>
        )}
      </div>

      {/* --- MOBILE VIEW (CARDS) --- */}
      <div className="md:hidden space-y-4">
        {sortedTransactions.map((t) => (
          <div key={t._id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">{t.description || t.category}</h3>
                <div className="flex gap-2 mt-1.5">
                  <Badge variant={t.type === "income" ? "default" : "destructive"} className={`text-[10px] h-5 ${t.type === "income" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"}`}>
                    {t.type === "income" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {t.type}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-5">{t.category}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {t.type === "income" ? "+" : "-"} ₹{Math.abs(t.amount).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(t.date)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteTransaction(t._id)} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 p-2">
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-500"
                onClick={() => handleEditTransaction(t)}
              >
                <SquarePen className="w-4 h-4" /> Edit
              </Button>

            </div>
          </div>
        ))}
        {sortedTransactions.length === 0 && (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            No transactions found. Add one to get started!
          </div>
        )}
      </div>

    </div>
  );
}