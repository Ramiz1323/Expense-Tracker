"use client";

import { useState, useEffect } from "react";
import { Plus, Target, Trophy, TrendingUp, MoreVertical, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Goal {
  _id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  isReached: boolean;
}

export function GoalsSection() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  // Form States
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      if (res.ok) setGoals(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!title || !targetAmount) return;
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        body: JSON.stringify({ title, targetAmount: Number(targetAmount) }),
      });
      if (res.ok) {
        setOpen(false);
        setTitle("");
        setTargetAmount("");
        fetchGoals();
        toast({ title: "Goal created successfully!" });
      }
    } catch (error) {
      toast({ title: "Failed to create goal", variant: "destructive" });
    }
  };

const addFunds = async (id: string, amount: number) => {
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json", // This line is crucial
        },
        body: JSON.stringify({ amountToAdd: amount }),
      });
      
      if (res.ok) {
        fetchGoals();
        toast({ title: "Funds added!" });
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      toast({ title: "Error adding funds", variant: "destructive" });
    }
  };

  const deleteGoal = async (id: string) => {
    if(!confirm("Delete this goal?")) return;
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchGoals();
        toast({ title: "Goal deleted" });
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div>Loading goals...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Financial Goals</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Savings Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input placeholder="e.g. New Laptop" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Target Amount (₹)</Label>
                <Input type="number" placeholder="50000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              </div>
              <Button className="w-full" onClick={createGoal}>Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          
          return (
            <Card key={goal._id} className={`relative overflow-hidden transition-all hover:shadow-md ${goal.isReached ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {goal.isReached ? (
                    <Trophy className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Target className="h-4 w-4 text-slate-500" />
                  )}
                  {goal.title}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => deleteGoal(goal._id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-2">
                  <div className="text-2xl font-bold">
                    ₹{goal.currentAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of ₹{goal.targetAmount.toLocaleString('en-IN')}
                  </div>
                </div>
                
                <Progress value={progress} className={`h-2 mb-4 ${goal.isReached ? '[&>div]:bg-emerald-500' : ''}`} />
                
                {!goal.isReached ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      const amount = prompt("Enter amount to add:");
                      if (amount && !isNaN(Number(amount))) addFunds(goal._id, Number(amount));
                    }}
                  >
                    <TrendingUp className="mr-2 h-3 w-3" /> Add Funds
                  </Button>
                ) : (
                  <div className="text-center text-sm font-medium text-emerald-600 flex items-center justify-center gap-1 py-1">
                     Goal Achieved! 🎉
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {goals.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-muted-foreground">
            <Target className="h-8 w-8 mb-2 opacity-50" />
            <p>No goals set yet. Create one to start saving!</p>
          </div>
        )}
      </div>
    </div>
  );
}