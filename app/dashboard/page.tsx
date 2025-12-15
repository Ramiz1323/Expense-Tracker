import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { GoalsSection } from "@/components/dashboard/goals-section"; 
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 pb-20">
      {/* Header */}
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm mt-1 opacity-90">
          Welcome back, {user?.fullName?.split(" ")[0] || "User"}!
        </p>
      </div>

      {/* Existing Stats */}
      <DashboardStats userId={user?.userId || ""} />
      
      {/* NEW: Financial Goals Section */}
      <GoalsSection />

      {/* Existing Transactions */}
      <div className="mt-6">
        <RecentTransactions userId={user?.userId || ""} />
      </div>
    </div>
  );
}