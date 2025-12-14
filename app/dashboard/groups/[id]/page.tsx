"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Receipt, ArrowLeft, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to fetch group");
        router.push("/dashboard/groups");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, amount: parseFloat(amount) }),
      });

      if (res.ok) {
        toast.success("Expense added");
        setIsOpen(false);
        setDesc("");
        setAmount("");
        fetchDetails();
      }
    } catch (e) {
      toast.error("Failed to add expense");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if(!confirm("Delete this expense?")) return;

    try {
      const res = await fetch(`/api/groups/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      
      if(res.ok) {
        toast.success("Expense deleted");
        fetchDetails();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
      }
    } catch (e) {
      toast.error("Error deleting expense");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short'
    });
  };

  if (loading) return <div className="p-6">Loading group...</div>;
  if (!data) return <div className="p-6">Group not found</div>;

  const { group, expenses, currentUserId } = data;

  // --- 1. Calculate Balances ---
  const totalSpent = expenses.reduce((sum: number, ex: any) => sum + ex.amount, 0);
  const sharePerPerson = totalSpent / (group.members.length || 1);
  const paidByMember: Record<string, number> = {};
  
  // Initialize paid amounts
  group.members.forEach((m: any) => paidByMember[m._id] = 0);
  
  // Sum up payments
  expenses.forEach((ex: any) => {
    if (paidByMember[ex.paidBy._id] !== undefined) {
      paidByMember[ex.paidBy._id] += ex.amount;
    }
  });

  // --- 2. Calculate Settlements (Who pays Whom) ---
  const memberBalances: Record<string, number> = {};
  const debtors: any[] = [];
  const creditors: any[] = [];

  group.members.forEach((m: any) => {
    const paid = paidByMember[m._id] || 0;
    const balance = paid - sharePerPerson;
    memberBalances[m._id] = balance;

    if (balance < -0.5) debtors.push({ ...m, balance }); // Owes money
    else if (balance > 0.5) creditors.push({ ...m, balance }); // Gets money
  });

  // Sort by magnitude to simplify transactions
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  const settlements = [];
  let i = 0; // Debtor index
  let j = 0; // Creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    // Transaction amount is the minimum of debt or credit
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
    
    if (amount > 0.5) {
      settlements.push({
        from: debtor,
        to: creditor,
        amount
      });
    }

    // Adjust balances
    debtor.balance += amount;
    creditor.balance -= amount;

    // Move indices if settled
    if (Math.abs(debtor.balance) < 0.5) i++;
    if (creditor.balance < 0.5) j++;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/groups" className="text-sm text-slate-500 hover:text-pink-600 flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Groups
        </Link>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
            <div className="flex items-center gap-3 mt-2">
               <div className="flex -space-x-2">
                {group.members.map((m: any) => (
                  <div key={m._id} title={m.fullName}>
                     <Avatar className="w-8 h-8 border-2 border-white dark:border-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                      <AvatarFallback className="bg-pink-100 text-pink-700 text-xs font-medium">{m.fullName[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                ))}
              </div>
              <span className="text-sm text-slate-500">{group.members.length} members</span>
            </div>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-pink-600 hover:bg-pink-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Shared Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddExpense} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="Dinner, Taxi, etc." value={desc} onChange={e => setDesc(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount (Total)</Label>
                  <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <p className="text-xs text-muted-foreground">Paid by you, split equally among all members.</p>
                <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700">Save Expense</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* LEFT COL: Balances & Settlements */}
        <div className="lg:col-span-1 space-y-6">
          {/* Net Balances Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm gap-0">
            <CardHeader className="pb-3 bg-card">
              <CardTitle className="text-base font-semibold">Net Balances</CardTitle>
            </CardHeader>
            <hr />
            <CardContent className="pt-4 space-y-4">
               {group.members.map((m: any) => {
                 const paid = paidByMember[m._id] || 0;
                 const balance = memberBalances[m._id];
                 const isOwed = balance > 0;
                 const isSettled = Math.abs(balance) < 1;
                 
                 return (
                   <div key={m._id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-slate-100 text-slate-600">{m.fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                           <p className="font-medium">{m.fullName}</p>
                           <p className="text-xs text-slate-500">Paid ₹{paid.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isSettled ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Settled</span>
                        ) : (
                          <div className={`text-sm font-semibold ${isOwed ? "text-emerald-600" : "text-red-600"}`}>
                            {isOwed ? "+" : "-"} ₹{Math.abs(balance).toFixed(0)}
                          </div>
                        )}
                      </div>
                   </div>
                 );
               })}
               <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-center text-slate-400">
                  Total Spent: ₹{totalSpent.toLocaleString()}
               </div>
            </CardContent>
          </Card>

          {/* SETTLEMENTS CARD */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm gap-0">
            <CardHeader className="pb-3 bg-card">
              <CardTitle className="text-base font-semibold text-pink-700 dark:text-pink-300">Suggested Payments</CardTitle>
            </CardHeader>
            <hr />
            <CardContent className="pt-4">
              {settlements.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">
                  All settled up! No dues pending.
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
                      
                      <div className="flex items-center gap-3">
                          {/* From User */}
                          <div className="flex items-center gap-2">
                             <Avatar className="w-7 h-7 border border-slate-100 dark:border-slate-800">
                                <AvatarFallback className="bg-red-50 text-red-600 text-[10px]">{s.from.fullName[0]}</AvatarFallback>
                             </Avatar>
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.from.fullName.split(' ')[0]}</span>
                          </div>

                          {/* Arrow */}
                          <ArrowRight className="w-4 h-4 text-slate-300" />

                          {/* To User */}
                          <div className="flex items-center gap-2">
                             <Avatar className="w-7 h-7 border border-slate-100 dark:border-slate-800">
                                <AvatarFallback className="bg-emerald-50 text-emerald-600 text-[10px]">{s.to.fullName[0]}</AvatarFallback>
                             </Avatar>
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.to.fullName.split(' ')[0]}</span>
                          </div>
                      </div>

                      {/* Amount */}
                      <div className="font-bold text-pink-600 text-sm">
                        ₹{s.amount.toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COL: Expenses List */}
        <div className="lg:col-span-2 space-y-4">
           <h2 className="text-lg font-semibold">Recent Activity</h2>
           
           {expenses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                 <p className="text-slate-500">No expenses yet.</p>
              </div>
           ) : (
             <div className="space-y-3">
               {expenses.map((ex: any) => (
                 <div key={ex._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                       <div className="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-full text-pink-600">
                          <Receipt className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{ex.description}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                             <span>{ex.paidBy.fullName} paid</span>
                             <span>•</span>
                             <span>{formatDate(ex.date)}</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="font-bold text-lg text-slate-900 dark:text-white">₹{ex.amount.toLocaleString()}</span>
                       {currentUserId === ex.paidBy._id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteExpense(ex._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                       )}
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}