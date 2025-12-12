"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Wallet, Settings, Users, Menu, X } from 'lucide-react';
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useRouter } from 'next/navigation';

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          setUserEmail(data.user.email);
          
          if (data.user.role === "admin") {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    checkUserRole();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push("/auth/login");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/transaction", label: "Transactions", icon: Wallet },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: "Admin Panel", icon: Users }] : []),
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">FinTrack</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Personal Finance Tracker</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start"
              >
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
        <Button
          onClick={() => {
            handleLogout();
            setIsMobileOpen(false);
          }}
          variant="outline"
          className="w-full justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col">
        <NavContent />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">FinTrack</h1>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            {/* ADDED THIS LINE FOR ACCESSIBILITY */}
            <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle> 
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}