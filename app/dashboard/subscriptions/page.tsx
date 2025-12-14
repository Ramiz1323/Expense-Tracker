"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Calendar, CreditCard, RefreshCw, SquarePen, AlertCircle } from "lucide-react";

interface Subscription {
  _id: string;
  name: string;
  amount: number;
  billingCycle: "monthly" | "yearly";
  startDate: string;
  nextPaymentDate: string;
  category: string;
  status: "active" | "cancelled";
}

const CATEGORIES = ["Entertainment", "Software", "Utilities", "Insurance", "Fitness", "Other"];

export default function SubscriptionsPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    billingCycle: "monthly",
    startDate: new Date().toISOString().split("T")[0],
    category: "Entertainment",
  });

  const router = useRouter();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) {
        if (res.status === 401) router.push("/auth/login");
        return;
      }
      const data = await res.json();
      setSubscriptions(data);
    } catch (err) {
      setError("Failed to fetch subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.amount) {
      setError("Please fill all required fields");
      return;
    }

    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
    };

    try {
      const res = await fetch(
        isEditMode ? `/api/subscriptions/${editId}` : "/api/subscriptions",
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      setIsOpen(false);
      setIsEditMode(false);
      setEditId(null);
      
      setFormData({
        name: "",
        amount: "",
        billingCycle: "monthly",
        startDate: new Date().toISOString().split("T")[0],
        category: "Entertainment",
      });

      fetchSubscriptions();
    } catch {
      setError("Failed to save subscription");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchSubscriptions();
    } catch {
      setError("Failed to delete");
    }
  };

  const handleEdit = (sub: Subscription) => {
    setIsEditMode(true);
    setEditId(sub._id);
    setFormData({
      name: sub.name,
      amount: sub.amount.toString(),
      billingCycle: sub.billingCycle,
      startDate: sub.startDate.split("T")[0],
      category: sub.category,
    });
    setIsOpen(true);
  };

  // ---- CALCULATIONS ----

  const totalMonthlyCost = subscriptions.reduce((sum, sub) => {
    if (sub.billingCycle === "monthly") return sum + sub.amount;
    return sum + (sub.amount / 12);
  }, 0);

  const activeCount = subscriptions.length;
  
  const upcomingRenewals = subscriptions.filter(sub => {
    const days = Math.ceil((new Date(sub.nextPaymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  }).length;

  // ---- SORTING & UTILS ----

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA: any = a[key as keyof Subscription];
    let valB: any = b[key as keyof Subscription];

    if (key === "nextPaymentDate") {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
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

  const getDaysRemaining = (dateString: string) => {
    const today = new Date();
    const nextDate = new Date(dateString);
    const diffTime = nextDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 pb-20">
      
      {/* HEADER */}
      <div className="bg-linear-to-r from-violet-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Subscriptions</h1>
        <p className="text-sm mt-1 opacity-90">Manage recurring payments and alerts</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:snap-none no-scrollbar">
        {[
          { label: "Monthly Cost (Est.)", value: totalMonthlyCost, icon: <CreditCard className="w-4 h-4 text-violet-500"/> },
          { label: "Active Services", value: activeCount, type: "count", icon: <RefreshCw className="w-4 h-4 text-indigo-500"/> },
          { label: "Renewing Soon", value: upcomingRenewals, type: "count", icon: <Calendar className="w-4 h-4 text-orange-500"/> },
        ].map((item, i) => (
          <div key={i} className="min-w-60 sm:min-w-0 snap-start backdrop-blur-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
               {item.icon}
               <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white whitespace-nowrap">
              {item.type === 'count' ? item.value : `₹ ${item.value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </p>
          </div>
        ))}
      </div>

      {/* ADD BUTTON */}
      <div className="flex justify-between items-center mt-6">
        <h2 className="text-xl font-semibold">Subscription List</h2>
        <Button onClick={() => { setIsEditMode(false); setIsOpen(true); }} className="rounded-xl shadow-md bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Add Subscription</span><span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* ADD/EDIT MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
            <DialogDescription>Enter service details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input placeholder="Netflix, Spotify..." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={formData.billingCycle} onValueChange={(v) => setFormData({ ...formData, billingCycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
            </div>

            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              {isEditMode ? "Update Subscription" : "Save Subscription"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- DESKTOP VIEW (TABLE) --- */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th onClick={() => handleSort("name")} className="px-4 py-3 text-left font-medium cursor-pointer hover:text-slate-700">Name</th>
              <th onClick={() => handleSort("category")} className="px-4 py-3 text-left font-medium cursor-pointer">Category</th>
              <th onClick={() => handleSort("amount")} className="px-4 py-3 text-right font-medium cursor-pointer">Cost</th>
              <th onClick={() => handleSort("billingCycle")} className="px-4 py-3 text-center font-medium cursor-pointer">Cycle</th>
              <th onClick={() => handleSort("nextPaymentDate")} className="px-4 py-3 text-left font-medium cursor-pointer">Next Payment</th>
              <th className="px-4 py-3 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedSubscriptions.map((sub) => {
              const daysLeft = getDaysRemaining(sub.nextPaymentDate);
              const isUrgent = daysLeft <= 3 && daysLeft >= 0;

              return (
                <tr key={sub._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{sub.name}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="font-normal">{sub.category}</Badge></td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">₹{sub.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-xs uppercase text-slate-500">{sub.billingCycle}</td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-2 ${isUrgent ? "text-red-600 font-medium" : "text-slate-600 dark:text-slate-400"}`}>
                      {isUrgent && <AlertCircle className="w-4 h-4" />}
                      {formatDate(sub.nextPaymentDate)}
                      <span className="text-xs text-slate-400">({daysLeft} days)</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => handleEdit(sub)}>
                        <SquarePen className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(sub._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE VIEW (CARDS) --- */}
      <div className="md:hidden space-y-4">
        {sortedSubscriptions.map((sub) => {
          const daysLeft = getDaysRemaining(sub.nextPaymentDate);
          const isUrgent = daysLeft <= 3 && daysLeft >= 0;

          return (
            <div key={sub._id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
               {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
               
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">{sub.name}</h3>
                  <div className="flex gap-2 mt-1.5">
                     <Badge variant="outline" className="text-[10px] h-5 capitalize">{sub.billingCycle}</Badge>
                     <Badge variant="secondary" className="text-[10px] h-5">{sub.category}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400">₹{sub.amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                <div className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due: {formatDate(sub.nextPaymentDate)} ({daysLeft}d)</span>
                </div>
                
                <div className="flex gap-1">
                   <Button variant="ghost" size="sm" className="h-8 text-blue-500" onClick={() => handleEdit(sub)}>
                    <SquarePen className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-red-500" onClick={() => handleDelete(sub._id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {sortedSubscriptions.length === 0 && (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            No subscriptions found.
          </div>
        )}
      </div>
    </div>
  );
}