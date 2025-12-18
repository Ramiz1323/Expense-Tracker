import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser, isUserAdmin } from '@/lib/auth/session';
import { User } from '@/lib/mongodb/models/User';
import { Transaction } from '@/lib/mongodb/models/Transaction';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const totalUsers = await User.countDocuments();
    // Count users who have the isPro flag set to true
    const activePremiumUsers = await User.countDocuments({ isPro: true });
    
    const transactions = await Transaction.find().lean();
    const totalTransactions = transactions.length;
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      totalUsers,
      activePremiumUsers, // Return the new stat
      totalTransactions,
      totalIncome,
      totalExpenses,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}