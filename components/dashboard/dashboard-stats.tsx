"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";

interface Stats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalInvestments: number;
  chartData: Array<{ name: string; value: number; fill: string }>;
}

export function DashboardStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Stats>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    totalInvestments: 0,
    chartData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transactionsRes, investmentsRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/investments')
        ]);

        if (!transactionsRes.ok || !investmentsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const transactions = await transactionsRes.json();
        const investments = await investmentsRes.json();

        // 1. Transaction Calculations
        const totalIncome = transactions
          .filter((t: any) => t.type === "income")
          .reduce((sum: number, t: any) => sum + t.amount, 0);

        const totalExpense = transactions
          .filter((t: any) => t.type === "expense")
          .reduce((sum: number, t: any) => sum + t.amount, 0);

        // 2. Investment Calculations
        const monthDiff = (start: Date, end: Date) => {
          return (
            end.getFullYear() * 12 +
            end.getMonth() -
            (start.getFullYear() * 12 + start.getMonth())
          ) + 1;
        };

        const totalInvestments = investments.reduce((sum: number, i: any) => {
          if (i.type === "recurring") {
            const months = monthDiff(new Date(i.date), new Date());
            return sum + (i.amount * (months > 0 ? months : 1));
          }
          return sum + i.amount;
        }, 0);

        // 3. Prepare Simplified Chart Data (Income, Expense, Investment ONLY)
        const chartData = [
          { name: "Income", value: totalIncome, fill: "#10b981" },     // Emerald
          { name: "Expense", value: totalExpense, fill: "#ef4444" },   // Red
          { name: "Investment", value: totalInvestments, fill: "#3b82f6" } // Blue
        ].filter(item => item.value > 0); // Optional: Hide zero values if preferred

        setStats({
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          totalInvestments,
          chartData,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  if (loading) {
    return <div className="p-4 text-sm sm:text-base">Loading stats...</div>;
  }

  return (
    <div className="grid gap-4 lg:gap-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Income
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹ {stats.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Expenses
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              ₹ {stats.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Investments
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹ {stats.totalInvestments.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Current Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? "text-slate-900 dark:text-white" : "text-red-600"}`}>
              ₹ {stats.balance.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Breakdown Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Financial Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.chartData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-full sm:w-1/2 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {stats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `₹ ${Number(value).toLocaleString("en-IN")}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full sm:w-1/2 space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {stats.chartData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }}></div>
                        <span className="text-slate-600 dark:text-slate-300 truncate">{item.name}</span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">
                        ₹ {item.value.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-slate-400">
                <PieChart className="w-10 h-10 mb-2 opacity-20" />
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overview Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.chartData} // Using the same simplified data
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  barSize={32}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 13, fill: '#64748b' }} 
                    width={80} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => [`₹ ${Number(value).toLocaleString("en-IN")}`, 'Amount']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} background={{ fill: 'var(--muted)', radius: 4 }} >
                     {
                      stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}