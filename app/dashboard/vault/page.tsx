"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { 
  Lock, 
  Plus, 
  TrendingUp, 
  PiggyBank, 
  CheckCircle, 
  XCircle, 
  Target,   
  Wallet,   
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface VaultItem {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  status: 'active' | 'purchased' | 'saved' | 'invested';
}

export default function VaultPage() {
  const router = useRouter();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fundingItem, setFundingItem] = useState<VaultItem | null>(null);
  const [decisionItem, setDecisionItem] = useState<VaultItem | null>(null);
  
  // Form inputs
  const [newItem, setNewItem] = useState({ name: "", targetAmount: "", category: "Shopping" });
  const [fundAmount, setFundAmount] = useState("");

  // Decision Logic State
  const [decisionStep, setDecisionStep] = useState<'want_check' | 'invest_check'>('want_check');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/vault");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      toast.error("Failed to load vault");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.name || !newItem.targetAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountValue = parseFloat(newItem.targetAmount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newItem, targetAmount: amountValue }),
      });
      
      const data = await res.json();

      if (res.ok) {
        toast.success("Added to Vault!");
        setIsAddOpen(false);
        setNewItem({ name: "", targetAmount: "", category: "Shopping" });
        fetchData();
      } else {
        toast.error(data.error || "Failed to create item");
      }
    } catch (err) {
      toast.error("Error creating item");
    }
  };

  const handleAddFunds = async () => {
    if (!fundingItem || !fundAmount) return;
    try {
      const res = await fetch(`/api/vault/${fundingItem._id}/fund`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: fundAmount }),
      });
      
      if (res.ok) {
        toast.success("Funds added!");
        setFundingItem(null);
        setFundAmount("");
        fetchData();
      }
    } catch (err) {
      toast.error("Error adding funds");
    }
  };

  const handleGoalReached = (item: VaultItem) => {
    setDecisionStep('want_check'); 
    setDecisionItem(item); 
  };

  const handleDecision = async (decision: 'buy' | 'save' | 'invest') => {
    if (!decisionItem) return;

    try {
      if (decision === 'invest') {
         // Mark as invested in backend
         await fetch(`/api/vault/${decisionItem._id}/decision`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ decision: 'invest' }),
         });
         
         // Safe redirect with encoding
         const encodedName = encodeURIComponent(decisionItem.name);
         router.push(`/dashboard/investment?action=new&amount=${decisionItem.currentAmount}&name=${encodedName}`);
         return;
      }

      const res = await fetch(`/api/vault/${decisionItem._id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (res.ok) {
        setDecisionItem(null); 
        fetchData(); 

        if (decision === 'buy') {
          toast.success("Enjoy your purchase! Expense recorded.");
        } else if (decision === 'save') {
          triggerConfetti();
          toast.success(`Congratulations! Saved ₹${decisionItem.currentAmount}.`);
        }
      }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const triggerConfetti = () => {
    if (typeof confetti === 'function') {
        const end = Date.now() + 2000;
        const colors = ['#10b981', '#34d399'];
        (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
  };

  // --- Summary Calculations ---
  const activeItems = items.filter(i => i.status === 'active');
  const totalSaved = activeItems.reduce((acc, i) => acc + i.currentAmount, 0);
  const totalTarget = activeItems.reduce((acc, i) => acc + i.targetAmount, 0);
  const activeCount = activeItems.length;
  const readyCount = activeItems.filter(i => i.currentAmount >= i.targetAmount).length;

  if (loading) return <div className="p-8">Loading Vault...</div>;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 space-y-6 p-4 sm:p-6 pb-20">
        
        {/* HEADER */}
        <div className="bg-linear-to-r from-emerald-600 to-cyan-600 p-6 rounded-2xl shadow-lg text-white mb-4">
          <div className="flex items-center gap-3">
             <Lock className="w-8 h-8 text-white/80" />
             <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Impulse Vault</h1>
                <p className="text-sm mt-1 opacity-90">Fund your wants slowly. Decide later.</p>
             </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:overflow-visible sm:snap-none no-scrollbar">
          {[
            { label: "Total Saved", value: totalSaved, icon: <PiggyBank className="w-4 h-4 text-emerald-500"/>, isCurrency: true },
            { label: "Total Goals", value: totalTarget, icon: <Target className="w-4 h-4 text-cyan-500"/>, isCurrency: true },
            { label: "Active Items", value: activeCount, icon: <Wallet className="w-4 h-4 text-blue-500"/>, isCurrency: false },
            { label: "Ready to Decide", value: readyCount, icon: <CheckCircle className="w-4 h-4 text-green-500"/>, isCurrency: false },
          ].map((item, i) => (
            <div key={i} className="min-w-60 sm:min-w-0 snap-start backdrop-blur-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                 {item.icon}
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white whitespace-nowrap">
                {item.isCurrency ? `₹ ${item.value.toLocaleString("en-IN")}` : item.value}
              </p>
            </div>
          ))}
        </div>

        {/* ACTIONS & HEADING */}
        <div className="flex justify-between items-center mt-6">
          <h2 className="text-xl font-semibold">Your Wants</h2>
          <Button onClick={() => setIsAddOpen(true)} className="rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Add Goal</span><span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* GRID OF VAULT ITEMS */}
        {activeItems.length === 0 ? (
           <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <Lock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No active goals. Add something you want to buy!</p>
           </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeItems.map((item) => {
              const progress = Math.min((item.currentAmount / item.targetAmount) * 100, 100);
              const isReady = progress >= 100;

              return (
                <Card key={item._id} className="relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  {isReady && <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />}
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.category}</p>
                      </div>
                      <div className="text-right">
                         <span className="block font-bold text-emerald-600 dark:text-emerald-400">₹{item.currentAmount.toLocaleString()}</span>
                         <span className="text-xs text-slate-400">of ₹{item.targetAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2">
                    <div className="flex justify-between text-xs mb-2 text-slate-500">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 mb-4" />
                    
                    {isReady ? (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center border border-green-100 dark:border-green-900/50">
                        <p className="text-green-700 dark:text-green-400 font-medium mb-3 flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4"/> Goal Reached!
                        </p>
                        <Button onClick={() => handleGoalReached(item)} className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm">
                          Make Decision
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => setFundingItem(item)}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Funds
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* --- MODALS --- */}

        {/* 1. Add New Item Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Vault</DialogTitle>
              <DialogDescription>What is something you want to buy?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. PS5 Pro" />
              </div>
              <div className="space-y-2">
                <Label>Target Price (₹)</Label>
                <Input type="number" value={newItem.targetAmount} onChange={(e) => setNewItem({...newItem, targetAmount: e.target.value})} placeholder="50000" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})} placeholder="Shopping" />
              </div>
              <Button onClick={handleCreate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2. Add Funds Modal */}
        <Dialog open={!!fundingItem} onOpenChange={(open) => !open && setFundingItem(null)}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add funds to {fundingItem?.name}</DialogTitle>
              <DialogDescription>How much do you want to contribute today?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-400">₹</span>
                  <Input 
                    type="number" 
                    className="text-2xl h-14 font-bold" 
                    value={fundAmount} 
                    onChange={(e) => setFundAmount(e.target.value)} 
                    placeholder="0"
                    autoFocus
                  />
              </div>
              <Button onClick={handleAddFunds} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Add Funds</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3. THE DECISION POPUP FLOW */}
        <Dialog open={!!decisionItem} onOpenChange={(open) => !open && setDecisionItem(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            {decisionItem ? (
              <>
                {decisionStep === 'want_check' ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl text-center">Goal Reached! 🎉</DialogTitle>
                      <DialogDescription className="text-center text-lg mt-2">
                        You have fully funded <strong>{decisionItem.name}</strong>.
                      </DialogDescription>
                      {/* Fixed: Moved this DIV outside DialogDescription */}
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                          <p className="text-sm text-slate-500 uppercase tracking-wide font-semibold mb-1">Wait 24 Hours</p>
                          <p className="text-slate-700 dark:text-slate-300">Do you still really want to buy this?</p>
                      </div>
                    </DialogHeader>
                    <div className="flex gap-4 justify-center mt-6">
                      <Button 
                        variant="outline" 
                        className="w-1/2 border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        onClick={() => setDecisionStep('invest_check')} 
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Changed mind
                      </Button>
                      <Button 
                        className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleDecision('buy')} 
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Yes, Buy it
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-xl text-center">Smart Move! 🧠</DialogTitle>
                      <DialogDescription className="text-center mt-2">
                        Since you decided not to buy it, do you want to <strong>invest</strong> this ₹{decisionItem.currentAmount}?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-4">
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6"
                        onClick={() => handleDecision('invest')}
                      >
                        <TrendingUp className="w-5 h-5 mr-3" />
                        <div>
                          <div className="font-semibold">YES, Invest this amount</div>
                          <div className="text-xs opacity-90 font-normal">Grow your wealth instead</div>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="secondary" 
                        className="w-full bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 py-6"
                        onClick={() => handleDecision('save')}
                      >
                        <PiggyBank className="w-5 h-5 mr-3" />
                        <div>
                          <div className="font-semibold">NO, just keep it</div>
                          <div className="text-xs opacity-80 font-normal">Add to general savings</div>
                        </div>
                      </Button>
                    </div>
                  </>
                )}
              </>
            ) : (
               // Prevents crash when closing (item becomes null)
               <div className="h-40" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}