import { redirect } from 'next/navigation';
import { getCurrentUser, isUserAdmin } from "@/lib/auth/session";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "Admin Dashboard - Finance Tracker",
  description: "Admin dashboard for system management",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const isAdmin = await isUserAdmin();
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row">
      <DashboardNav />

      {/* Let WINDOW handle scrolling */}
      <main className="flex-1">
        {children}
      </main>

      <Toaster />
    </div>
  );
}
