"use client";

import { Key, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Wallet,
  TrendingUp,
  BarChart3,
  Trash2,
  Search,
  SquarePen,
  Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

interface ViewUserResponse {
  user: User;
  stats: {
    transactions: number;
    totalIncome: number;
    totalExpenses: number;
  };
  data: {
    transactions: any[];
    investments: any[];
    subscriptions: any[];
    splitExpenses: any[];
    goals: any[];
    groups: any[];
    budgets: any[];
  };
}

interface User {
  _id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="
      rounded-xl border border-slate-200 dark:border-slate-800
      bg-white dark:bg-slate-900
      p-3
    ">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Row({
  left,
  right,
  sub,
  accent,
}: {
  left: string;
  right: string;
  sub?: string;
  accent?: "green" | "red" | "blue" | "purple" | "orange";
}) {
  const accentMap = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  return (
    <div
      className="
        group flex items-center justify-between
        rounded-xl border border-slate-200 dark:border-slate-800
        bg-white dark:bg-slate-900
        px-4 py-3
        transition-all
        hover:border-slate-300 dark:hover:border-slate-700
        hover:shadow-sm
      "
    >
      {/* LEFT */}
      <div className="flex flex-col gap-0.5">
        <p className="font-medium text-slate-900 dark:text-white leading-tight">
          {left}
        </p>
        {sub && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {sub}
          </p>
        )}
      </div>

      {/* RIGHT */}
      <div className="text-right">
        <p className={`font-semibold text-sm ${accent ? accentMap[accent] : "text-slate-700 dark:text-slate-200"}`} >
          {right}
        </p>
      </div>
    </div>
  );
}


function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
    {text}
  </div>
}


export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const [editForm, setEditForm] = useState({
    fullName: "",
    role: "user",
  });

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewUser, setViewUser] = useState<ViewUserResponse | null>(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, s] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/stats"),
        ]);

        if (!u.ok || !s.ok) throw new Error();

        setUsers(await u.json());
        setStats(await s.json());
      } catch {
        setError("Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.fullName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const handleDelete = async (id: string) => {
    if (!confirm("This will permanently delete the user. Continue?")) return;

    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== id));
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({
      fullName: user.fullName || "",
      role: user.role,
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;

    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editUser._id,
        fullName: editForm.fullName,
        role: editForm.role,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u._id === updated.user._id ? updated.user : u
        )
      );
      setIsEditOpen(false);
    }
  };

  const openViewUser = async (id: string) => {
    setIsViewOpen(true);
    setViewLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error();

      setViewUser(await res.json());
    } catch {
      setViewUser(null);
    } finally {
      setViewLoading(false);
    }
  };


  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex-1 space-y-6 p-4 sm:p-6 pb-20">

        {/* HEADER */}
        <div className="bg-linear-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm mt-1 opacity-90">
            System overview & user management
          </p>
        </div>

        {/* STATS */}
        <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 no-scrollbar">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: <Users /> },
            {
              label: "Transactions",
              value: stats.totalTransactions,
              icon: <Wallet />,
            },
            {
              label: "Active Premium users",
              value: "merge pr & khud kar lena yeh",
              icon: <Users />,
            }
          ].map((s, i) => (
            <div
              key={i}
              className="min-w-56 backdrop-blur-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{s.label}</p>
                <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {s.icon}
                </div>
              </div>
              <p className={`text-2xl font-bold mt-1`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* USERS HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">All Users</h2>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <tr
                  key={u._id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                        {u.fullName?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-medium">
                          {u.fullName || "Unnamed"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={u.role === "admin" ? "default" : "secondary"}
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      {/* VIEW */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewUser(u._id)}
                        className="text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* EDIT */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(u)}
                        className="text-blue-500"
                      >
                        <SquarePen className="w-4 h-4" />
                      </Button>

                      {/* DELETE */}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={u.role === "admin"}
                        onClick={() => handleDelete(u._id)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-4">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">
                    {u.fullName || "Unnamed"}
                  </p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                  <div className="mt-2">
                    <Badge
                      variant={u.role === "admin" ? "default" : "secondary"}
                    >
                      {u.role}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(u)}
                  className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <SquarePen className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  disabled={u.role === "admin"}
                  onClick={() => handleDelete(u._id)}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-3">
                Joined:{" "}
                {new Date(u.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm({ ...editForm, fullName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, role: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleUpdateUser}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>User Overview</DialogTitle>
          </DialogHeader>

          {viewLoading ? (
            <p className="text-sm text-slate-500">Loading user data…</p>
          ) : !viewUser ? (
            <p className="text-sm text-red-500">Failed to load user</p>
          ) : (
            <Tabs defaultValue="profile" className="mt-2">

  {/* TABS LIST */}
  <TabsList
    className="
      relative flex gap-1 overflow-x-auto
      rounded-xl bg-slate-100 dark:bg-slate-900
      p-1 no-scrollbar
    "
  >
    {[
      ["profile", "Profile"],
      ["transactions", "Transactions"],
      ["investments", "Investments"],
      ["subscriptions", "Subscriptions"],
      ["split-expenses", "Split"],
      ["goals", "Goals"],
      ["groups", "Groups"],
      ["budgets", "Budgets"],
    ].map(([value, label]) => (
      <TabsTrigger
        key={value}
        value={value}
        className="
          whitespace-nowrap rounded-lg
          px-4 py-1.5 text-sm font-medium
          transition-all duration-200
          text-slate-600 dark:text-slate-300
          data-[state=active]:bg-white
          data-[state=active]:text-slate-900
          data-[state=active]:shadow-sm
          data-[state=active]:scale-[1.03]
          dark:data-[state=active]:bg-slate-800
        "
      >
        {label}
      </TabsTrigger>
    ))}
  </TabsList>

  {/* PROFILE */}
  <TabsContent
    value="profile"
    className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-200 space-y-4"
  >
    <div className="space-y-2">
      <div>
        <p className="text-xs text-slate-500">Name</p>
        <p className="font-medium">{viewUser.user.fullName || "—"}</p>
      </div>

      <div>
        <p className="text-xs text-slate-500">Email</p>
        <p className="font-medium">{viewUser.user.email}</p>
      </div>

      <div className="flex items-center gap-3">
        <Badge>{viewUser.user.role}</Badge>
        <span className="text-xs text-slate-500">
          Joined {new Date(viewUser.user.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
      <Stat label="Transactions" value={viewUser.data.transactions.length} />
      <Stat label="Income" value={`₹${viewUser.stats.totalIncome}`} />
      <Stat label="Expenses" value={`₹${viewUser.stats.totalExpenses}`} />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t">
      <Stat label="Investments" value={viewUser.data.investments.length} />
      <Stat label="Subscriptions" value={viewUser.data.subscriptions.length} />
      <Stat label="Goals" value={viewUser.data.goals.length} />
      <Stat label="Budgets" value={viewUser.data.budgets.length} />
      <Stat label="Groups" value={viewUser.data.groups.length} />
      <Stat label="Split Expenses" value={viewUser.data.splitExpenses.length} />
    </div>
  </TabsContent>

  {/* TRANSACTIONS */}
  <TabsContent value="transactions" className="mt-4 space-y-2">
    {viewUser.data.transactions.length === 0 ? (
      <Empty text="No transactions found" />
    ) : (
      viewUser.data.transactions.map(t => (
        <Row
          key={t._id}
          left={t.description || t.category}
          right={`₹${t.amount}`}
          sub={`${t.type} • ${new Date(t.date).toLocaleDateString()}`}
          accent={t.type === "income" ? "green" : "red"}
        />
      ))
    )}
  </TabsContent>

  {/* SUBSCRIPTIONS */}
  <TabsContent value="subscriptions" className="mt-4 space-y-2">
    {viewUser.data.subscriptions.length === 0 ? (
      <Empty text="No subscriptions found" />
    ) : (
      viewUser.data.subscriptions.map(s => (
        <Row
          key={s._id}
          left={s.name}
          right={`₹${s.amount}/${s.billingCycle}`}
          sub={`Next: ${new Date(s.nextPaymentDate).toLocaleDateString()}`}
          accent="blue"
        />
      ))
    )}
  </TabsContent>

  {/* INVESTMENTS */}
  <TabsContent value="investments" className="mt-4 space-y-2">
    {viewUser.data.investments.length === 0 ? (
      <Empty text="No investments found" />
    ) : (
      viewUser.data.investments.map(i => (
        <Row
          key={i._id}
          left={i.description || i.category}
          right={`₹${i.amount}`}
          sub={`${i.type} • ${i.expectedReturnRate || 0}% ROI`}
          accent="purple"
        />
      ))
    )}
  </TabsContent>

  {/* SPLIT EXPENSES */}
  <TabsContent value="split-expenses" className="mt-4 space-y-2">
    {viewUser.data.splitExpenses.length === 0 ? (
      <Empty text="No split expenses found" />
    ) : (
      viewUser.data.splitExpenses.map(se => (
        <Row
          key={se._id}
          left={se.description}
          right={`₹${se.amount}`}
          sub={`Paid by ${se.paidBy || "Member"}`}
          accent="orange"
        />
      ))
    )}
  </TabsContent>

  {/* GOALS */}
  <TabsContent value="goals" className="mt-4 space-y-2">
    {viewUser.data.goals.length === 0 ? (
      <Empty text="No goals created" />
    ) : (
      viewUser.data.goals.map(g => (
        <Row
          key={g._id}
          left={g.title}
          right={`₹${g.currentAmount} / ₹${g.targetAmount}`}
          sub={g.isReached ? "Completed" : "In Progress"}
          accent={g.isReached ? "green" : "blue"}
        />
      ))
    )}
  </TabsContent>

  {/* GROUPS */}
  <TabsContent value="groups" className="mt-4 space-y-2">
    {viewUser.data.groups.length === 0 ? (
      <Empty text="User is not part of any groups" />
    ) : (
      viewUser.data.groups.map(gr => (
        <Row
          key={gr._id}
          left={gr.name}
          right={`${gr.members.length} members`}
          sub={`Currency: ${gr.currency}`}
          accent="purple"
        />
      ))
    )}
  </TabsContent>

  {/* BUDGETS */}
  <TabsContent value="budgets" className="mt-4 space-y-2">
    {viewUser.data.budgets.length === 0 ? (
      <Empty text="No budgets defined" />
    ) : (
      viewUser.data.budgets.map(b => (
        <Row
          key={b._id}
          left={b.category}
          right={`₹${b.limitAmount}`}
          sub={b.period}
          accent="red"
        />
      ))
    )}
  </TabsContent>

</Tabs>

          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
