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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Calendar, TrendingUp, Wallet, SquarePen } from "lucide-react";

interface Investment {
  _id: string;
  type: "oneTime" | "recurring";
  category: string;
  amount: number;
  description: string;
  date: string;
  expectedReturnRate: number;
  expectedEndDate: string;
}

const TYPES = ["Stocks", "Mutual Funds", "Gold", "Real Estate", "Crypto", "Other"];

export default function InvestmentPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    type: "oneTime",
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    expectedReturnRate: "",
    expectedEndDate: "",
  });

  const router = useRouter();

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      const res = await fetch("/api/investments");
      if (!res.ok) {
        if (res.status === 401) router.push("/auth/login");
        return;
      }
      const data = await res.json();
      setInvestments(data);
    } catch (err) {
      setError("Failed to fetch investments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.category || !formData.amount) {
      setError("Please fill all required fields");
      return;
    }

    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
      expectedReturnRate: parseFloat(formData.expectedReturnRate) || 0,
      expectedEndDate: formData.expectedEndDate || null,
    };

    try {
      const res = await fetch(
        isEditMode
          ? `/api/investments/${editId}`
          : `/api/investments`,
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
        type: "oneTime",
        category: "",
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        expectedReturnRate: "",
        expectedEndDate: "",
      });

      fetchInvestments();
    } catch {
      setError("Failed to save investment");
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this investment?")) return;
    try {
      const res = await fetch(`/api/investments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchInvestments();
    } catch {
      setError("Failed to delete");
    }
  };

  // ---- CALCULATIONS ----

  const monthDiffExact = (start: Date, end: Date) => {
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) months--;

    return Math.max(0, months);
  };

  const calculateOneTimeFV = (amount: number, rate: number, months: number) => {
    const r = rate / 100 / 12;
    return amount * Math.pow(1 + r, months);
  };

  const calculateRecurringFV = (amount: number, rate: number, startDate: Date, endDate: Date) => {
    const r = rate / 100 / 12;
    let fv = 0;

    const d = new Date(startDate);

    while (d <= endDate) {
      const monthsRemaining =
        (endDate.getFullYear() - d.getFullYear()) * 12 +
        (endDate.getMonth() - d.getMonth());

      fv += amount * Math.pow(1 + r, monthsRemaining);
      d.setMonth(d.getMonth() + 1);
    }

    return fv;
  };

  const countInstallments = (startDate: Date, endDate: Date) => {
    let count = 0;
    const d = new Date(startDate);

    while (d <= endDate) {
      count++;
      d.setMonth(d.getMonth() + 1);
    }

    return count;
  };

  const getEffectiveEndDate = (inv: Investment) => {
    const today = new Date();
    return inv.expectedEndDate ? new Date(inv.expectedEndDate) < today ? new Date(inv.expectedEndDate) : today : today;
  };

  const calculateFutureValueTillEnd = (inv: Investment) => {
    if (!inv.expectedEndDate) return 0;

    const rate = inv.expectedReturnRate || 0;
    const start = new Date(inv.date);
    const end = new Date(inv.expectedEndDate);

    if (end <= start) return 0;

    // ONE-TIME
    if (inv.type === "oneTime") {
      const months = monthDiffExact(start, end);
      return rate === 0 ? inv.amount : calculateOneTimeFV(inv.amount, rate, months);
    }

    // RECURRING
    const installments = countInstallments(start, end);
    const invested = inv.amount * installments;

    return rate === 0 ? invested : calculateRecurringFV(inv.amount, rate, start, end);
  };

  const totalFutureEstimatedValue = investments.reduce((sum, inv) => {
    if (!inv.expectedEndDate) return sum;
    return sum + calculateFutureValueTillEnd(inv);
  }, 0);


  const totalOneTime = investments.filter((i) => i.type === "oneTime").reduce((sum, i) => sum + i.amount, 0);
  const totalRecurringMonthly = investments.filter((i) => i.type === "recurring").reduce((sum, i) => sum + i.amount, 0);
  const totalInvested = investments.reduce((sum, inv) => {
    if (inv.type === "oneTime") return sum + inv.amount;

    const end = getEffectiveEndDate(inv);
    const installments = countInstallments(new Date(inv.date), end);

    return sum + inv.amount * installments;
  }, 0);

  const totalEstimatedCurrent = investments.reduce((sum, inv) => {
    const rate = inv.expectedReturnRate || 0;
    if (rate === 0) return sum;

    const start = new Date(inv.date);
    const end = getEffectiveEndDate(inv);

    const currentValue = inv.type === "oneTime"
      ? calculateOneTimeFV(inv.amount, rate, monthDiffExact(start, end))
      : calculateRecurringFV(inv.amount, rate, start, end);

    return sum + currentValue;
  }, 0);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedInvestments = [...investments].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA: any;
    let valB: any;

    switch (key) {
      case "name":
        valA = (a.description || a.category).toLowerCase();
        valB = (b.description || b.category).toLowerCase();
        break;
      case "type":
        valA = a.type;
        valB = b.type;
        break;
      case "category":
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
        break;
      case "amount":
        valA = a.amount;
        valB = b.amount;
        break;
      case "invested": {
        const endA = getEffectiveEndDate(a);
        const endB = getEffectiveEndDate(b);

        valA = a.type === "recurring" ? a.amount * countInstallments(new Date(a.date), endA) : a.amount;
        valB = b.type === "recurring" ? b.amount * countInstallments(new Date(b.date), endB) : b.amount;
        break;
      }
      case "roi":
        valA = a.expectedReturnRate || 0;
        valB = b.expectedReturnRate || 0;
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


  const handleEditInvestment = (inv: Investment) => {
    setIsEditMode(true);
    setEditId(inv._id);

    setFormData({
      type: inv.type,
      category: inv.category,
      description: inv.description || "",
      amount: inv.amount.toString(),
      date: inv.date.split("T")[0],
      expectedReturnRate: inv.expectedReturnRate?.toString() || "",
      expectedEndDate: inv.expectedEndDate
        ? inv.expectedEndDate.split("T")[0]
        : "",
    });

    setIsOpen(true);
  };


  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 space-y-6 p-4 sm:p-6 pb-20"> {/* pb-20 added for mobile nav clearance if needed */}

        {/* HEADER */}
        <div className="bg-linear-to-r from-blue-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Investments</h1>
          <p className="text-sm mt-1 opacity-90">Track and visualise your portfolio</p>
        </div>

        {/* SUMMARY CARDS - Responsive Grid/Scroll */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-5 sm:overflow-visible sm:snap-none no-scrollbar">
          {[
            { label: "Total One-Time", value: totalOneTime },
            { label: "Monthly Recurring", value: totalRecurringMonthly },
            { label: "Total Invested", value: totalInvested },
            { label: "Current Value", value: totalEstimatedCurrent },
            { label: "Future Value", value: totalFutureEstimatedValue },
          ].map((item, i) => (
            <div key={i} className="min-w-60 sm:min-w-0 snap-start backdrop-blur-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 cursor-help">
                    {item.label}
                  </p>
                </TooltipTrigger>

                {item.label === "Current Value" && (
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Estimated portfolio value as of today,
                    calculated using expected return rates.
                  </TooltipContent>
                )}

                {item.label === "Future Value" && (
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Expected value at the planned end date.
                    <br />
                    Calculated only for investments with an end date.
                  </TooltipContent>
                )}
              </Tooltip>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white whitespace-nowrap">
                ₹ {item.value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>

        {/* ADD BUTTON */}
        <div className="flex justify-between items-center mt-6">
          <h2 className="text-xl font-semibold">Investment History</h2>
          <Button onClick={() => setIsOpen(true)} className="rounded-xl shadow-md bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Add Investment</span><span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* ADD MODAL */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Edit Investment" : "Add Investment"}
              </DialogTitle>

              <DialogDescription>Enter investment details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitInvestment} className="space-y-4 mt-2">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oneTime">One-Time</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="e.g. Axis Bluechip Fund" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Expected Return (%)</Label>
                  <Input type="number" placeholder="12" value={formData.expectedReturnRate} onChange={(e) => setFormData({ ...formData, expectedReturnRate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{formData.type === "recurring" ? "Start Date" : "Date"}</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date (Opt)</Label>
                  <Input type="date" value={formData.expectedEndDate} onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })} />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {isEditMode ? "Update Investment" : "Save Investment"}
              </Button>

            </form>
          </DialogContent>
        </Dialog>

        {/* --- DESKTOP VIEW (TABLE) --- */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th onClick={() => handleSort("name")} className="px-4 py-3 text-left font-medium cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">Name</th>
                <th onClick={() => handleSort("category")} className="px-4 py-3 text-left font-medium cursor-pointer">Category</th>
                <th onClick={() => handleSort("amount")} className="px-4 py-3 text-right font-medium cursor-pointer">Amount</th>
                <th onClick={() => handleSort("invested")} className="px-4 py-3 text-right font-medium cursor-pointer">Total Invested</th>
                <th className="px-4 py-3 text-right font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">Current Value</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      Estimated value as of today based on
                      expected return rates.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">Future Est. Value</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      Expected value at the investment’s end date.
                      <br />
                      Shown only when an end date is set.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th onClick={() => handleSort("roi")} className="px-4 py-3 text-right font-medium cursor-pointer">ROI</th>
                <th className="px-4 py-3 text-left font-medium">Timeline</th>
                <th className="px-4 py-3 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedInvestments.map((inv) => {
                const today = new Date();
                const end = getEffectiveEndDate(inv);
                const installments = inv.type === "recurring" ? countInstallments(new Date(inv.date), today) : 1;
                const invested = inv.type === "recurring" ? inv.amount * installments : inv.amount;
                const rate = inv.expectedReturnRate || 0;

                const currentValue = rate === 0 ? invested : inv.type === "oneTime"
                  ? calculateOneTimeFV(inv.amount, rate, monthDiffExact(new Date(inv.date), end))
                  : calculateRecurringFV(inv.amount, rate, new Date(inv.date), end);
                const futureValue = inv.expectedEndDate ? calculateFutureValueTillEnd(inv) : null;
                return (
                  <tr key={inv._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex flex-col">
                        <span>{inv.description || inv.category}</span>
                        <span className="text-xs text-slate-400 font-normal">{inv.type === "recurring" ? "Recurring" : "One-Time"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="font-normal">{inv.category}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                      {inv.type === "recurring" ? `₹${inv.amount.toLocaleString()}/mo` : `₹${inv.amount.toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">₹{invested.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-green-600 dark:text-green-400 cursor-help">
                            ₹{currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Value estimated using expected return till today
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {futureValue !== null ? (
                        <span className="text-indigo-600 dark:text-indigo-400">
                          ₹{futureValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-slate-400 cursor-help">—</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            No end date set
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{rate}%</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="flex flex-col gap-0.5">
                        <span>Start: {formatDate(inv.date)}</span>
                        {inv.expectedEndDate && <span>End: {formatDate(inv.expectedEndDate)}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => handleEditInvestment(inv)}
                        >
                          <SquarePen className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleDelete(inv._id)}
                        >
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

        {/* MOBILE CARD STYLE */}
        <div className="md:hidden space-y-4">
          {sortedInvestments.map((inv) => {
            const end = getEffectiveEndDate(inv);
            const rate = inv.expectedReturnRate || 0;
            const invested = inv.type === "recurring" ? inv.amount * countInstallments(new Date(inv.date), end) : inv.amount;
            const currentValue = rate === 0 ? invested : inv.type === "oneTime"
              ? calculateOneTimeFV(inv.amount, rate, monthDiffExact(new Date(inv.date), end))
              : calculateRecurringFV(inv.amount, rate, new Date(inv.date), end);
            const futureValue = inv.expectedEndDate ? calculateFutureValueTillEnd(inv) : null;

            return (
              <div
                key={inv._id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {inv.description || inv.category}
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {inv.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {inv.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="font-bold text-blue-600">₹{inv.amount}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Invested</p>
                    <p className="font-semibold">₹{invested}</p>
                  </div>
                  <div className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-slate-500 cursor-help">Current</p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Estimated value based on expected return till today
                      </TooltipContent>
                    </Tooltip>
                    <p className="font-semibold text-green-600">
                      ₹{currentValue.toFixed(0)}
                    </p>
                  </div>
                </div>

                {inv.expectedEndDate && (
                  <div className="mt-3 text-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-slate-500 cursor-help">
                          Future Est. Value
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Value expected at the planned end date
                      </TooltipContent>
                    </Tooltip>
                    <p className="font-semibold text-indigo-600">
                      ₹{calculateFutureValueTillEnd(inv).toFixed(0)}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 text-xs text-slate-500">
                  <span>{formatDate(inv.date)}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-blue-500"
                      onClick={() => handleEditInvestment(inv)}
                    >
                      <SquarePen className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(inv._id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}