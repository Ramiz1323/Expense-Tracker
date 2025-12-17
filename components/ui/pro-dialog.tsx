"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { GoProButton } from "@/components/ui/go-pro-button";

interface ProDialogProps {
  children: React.ReactNode;
}

export function ProDialog({ children }: ProDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/20 dark:border-slate-700/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Unlock premium features for better financial management
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p>Get access to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Advanced analytics and reports</li>
              <li>Unlimited transaction categories</li>
              <li>Priority customer support</li>
              <li>Export data in multiple formats</li>
              <li>AI-powered financial insights</li>
              <li>Advanced budget planning tools</li>
            </ul>
          </div>
          <p className="text-sm font-medium">Price: ₹299</p>
          <GoProButton className="w-full bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer" />
        </div>
      </DialogContent>
    </Dialog>
  );
}