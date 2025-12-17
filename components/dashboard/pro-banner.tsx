"use client";

import { useState } from "react";
import { GoProButton } from "@/components/ui/go-pro-button";
import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg text-white relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-white hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8" />
          <div>
            <h2 className="text-xl font-bold">Upgrade to Pro</h2>
            <p className="text-sm opacity-90">Unlock premium features for better financial management</p>
          </div>
        </div>
        <div className="mt-4">
          <GoProButton variant="secondary" className="bg-white text-emerald-600 hover:bg-gray-100" />
        </div>
      </div>
    </div>
  );
}