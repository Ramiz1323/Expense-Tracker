"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Lock, Plus, TrendingUp, PiggyBank, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
      const data = await res.json();
      setItems(data);
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
    setDecisionItem(item);
    setDecisionStep('want_check'); 
  };

  const handleDecision = async (decision: 'buy' | 'save' | 'invest') => {
    if (!decisionItem) return;

    try {
      if (decision === 'invest') {
         await fetch(`/api/vault/${decisionItem._id}/decision`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ decision: 'invest' }),
         });
         
         router.push(`/dashboard/investment?action=new&amount=${decisionItem.currentAmount}&name=${decisionItem.name}`);
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
          toast.success(`Congratulations! You saved ₹${decisionItem.currentAmount}. Added to savings.`);
        }
      }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const triggerConfetti = () => {
    const end = Date.now() + 2000;
    const colors = ['#10b981', '#34d399'];
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  if (loading) return <div className="p-8">Loading Vault...</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-950 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold">Impulse Vault</h1>
          <p className="opacity-90 mt-1">Fund your wants slowly. Decide later.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-white text-slate-950 hover:bg-slate-200">
          <Plus className="w-4 h-4 mr-2" /> Add Want
        </Button>
      </div>

      {/* Grid of Vault Items */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.filter(i => i.status === 'active').map((item) => {
          const progress = Math.min((item.currentAmount / item.targetAmount) * 100, 100);
          const isReady = progress >= 100;

          return (
            <Card key={item._id} className="relative overflow-hidden border-2 border-slate-100 dark:border-slate-800">
              {isReady && <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />}
              
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{item.name}</CardTitle>
                  {/* CHANGED TO RUPEE SYMBOL */}
                  <span className="font-mono font-bold">₹{item.currentAmount} / ₹{item.targetAmount}</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <Progress value={progress} className="h-2 mb-4" />
                
                {isReady ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-green-700 dark:text-green-400 font-medium mb-2">Goal Reached!</p>
                    <Button onClick={() => handleGoalReached(item)} className="w-full bg-green-600 hover:bg-green-700">
                      Make Decision
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full border-dashed"
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

      {/* --- MODALS --- */}

      {/* 1. Add New Item Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add to Vault</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. PS5 Pro" />
            </div>
            <div className="space-y-2">
              {/* CHANGED LABEL */}
              <Label>Target Price (₹)</Label>
              <Input type="number" value={newItem.targetAmount} onChange={(e) => setNewItem({...newItem, targetAmount: e.target.value})} placeholder="50000" />
            </div>
            <Button onClick={handleCreate} className="w-full">Create Vault</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Add Funds Modal */}
      <Dialog open={!!fundingItem} onOpenChange={(open) => !open && setFundingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add funds to {fundingItem?.name}</DialogTitle>
            <DialogDescription>How much do you want to contribute today?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="flex items-center gap-2">
                {/* CHANGED ICON */}
                <span className="text-2xl font-bold">₹</span>
                <Input 
                  type="number" 
                  className="text-2xl h-12" 
                  value={fundAmount} 
                  onChange={(e) => setFundAmount(e.target.value)} 
                  autoFocus
                />
             </div>
             <Button onClick={handleAddFunds} className="w-full">Add Funds</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. THE DECISION POPUP FLOW */}
      <Dialog open={!!decisionItem} onOpenChange={(open) => !open && setDecisionItem(null)}>
        <DialogContent className="sm:max-w-md">
          {decisionStep === 'want_check' ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Goal Reached! 🎉</DialogTitle>
                <DialogDescription className="text-center text-lg mt-2">
                   You have fully funded <strong>{decisionItem?.name}</strong>.
                   <br/>
                   <span className="font-medium text-slate-900 dark:text-slate-100 block mt-4">
                     Do you really want to buy this product?
                   </span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-4 justify-center mt-6">
                <Button 
                  variant="outline" 
                  className="w-1/2 border-slate-200 hover:bg-slate-100"
                  onClick={() => setDecisionStep('invest_check')} 
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  No, I changed my mind
                </Button>
                <Button 
                  className="w-1/2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleDecision('buy')} 
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Yes, Buy it!
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Investment Check */}
              <DialogHeader>
                <DialogTitle className="text-xl text-center">Smart Move! 🧠</DialogTitle>
                <DialogDescription className="text-center mt-2">
                   {/* CHANGED TO RUPEE */}
                   Since you decided not to buy it, do you want to <strong>invest</strong> this ₹{decisionItem?.currentAmount}?
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 mt-4">
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => handleDecision('invest')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  YES, Invest this amount
                </Button>
                
                <Button 
                  variant="secondary" 
                  className="w-full bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                  onClick={() => handleDecision('save')}
                >
                  <PiggyBank className="w-4 h-4 mr-2" />
                  NO, just add to Savings
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}