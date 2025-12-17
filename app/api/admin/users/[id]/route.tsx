import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb/db";
import { getCurrentUser, isUserAdmin } from "@/lib/auth/session";

import { User } from "@/lib/mongodb/models/User";
import { Transaction } from "@/lib/mongodb/models/Transaction";
import { Subscription } from "@/lib/mongodb/models/Subscription";
import { Investment } from "@/lib/mongodb/models/Investment";
import { SplitExpense } from "@/lib/mongodb/models/SplitExpense";
import { Group } from "@/lib/mongodb/models/Group";
import { Goal } from "@/lib/mongodb/models/Goal";
import { Budget } from "@/lib/mongodb/models/Budget";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isUserAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(id)
      .select("-password")
      .lean<{ _id: Types.ObjectId }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [
      transactions,
      subscriptions,
      investments,
      goals,
      budgets,
      groups,
    ] = await Promise.all([
      Transaction.find({ userId: user._id }).sort({ date: -1 }).lean(),
      Subscription.find({ userId: user._id }).lean(),
      Investment.find({ userId: user._id }).lean(),
      Goal.find({ userId: user._id }).lean(),
      Budget.find({ userId: user._id }).lean(),
      Group.find({ members: user._id }).lean(),
    ]);

    const splitExpenses = await SplitExpense.find({
      groupId: { $in: groups.map(g => g._id) },
    }).lean();

    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);


    return NextResponse.json({
      user,
      stats: {
        transactions: transactions.length,
        totalIncome,
        totalExpenses,
      },
      data: {
        transactions,
        investments,
        subscriptions,
        splitExpenses,
        goals,
        groups,
        budgets,
      },
    });
  } catch (err) {
    console.error("Admin view user error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
