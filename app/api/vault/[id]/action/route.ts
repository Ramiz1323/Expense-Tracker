import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { VaultItem } from '@/lib/mongodb/models/VaultItem';
import { Transaction } from '@/lib/mongodb/models/Transaction';
import { Goal } from '@/lib/mongodb/models/Goal';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Updated for Next.js 15+ param handling
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { action, goalId } = await request.json(); // action: 'purchase' | 'save'

    await connectDB();
    const item = await VaultItem.findById(id);

    if (!item || item.userId.toString() !== user.userId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (action === 'purchase') {
      // 1. Create Expense Transaction
      await Transaction.create({
        userId: user.userId,
        category: item.category,
        description: `Vault Purchase: ${item.name}`,
        amount: item.amount,
        type: 'expense',
        date: new Date()
      });

      // 2. Update Item Status
      item.status = 'purchased';
      await item.save();

      return NextResponse.json({ message: 'Item purchased', status: 'purchased' });
    } 
    
    else if (action === 'save') {
      // 1. Add to Goal (if goalId provided)
      if (goalId) {
        const goal = await Goal.findById(goalId);
        if (goal) {
          goal.currentAmount += item.amount;
          await goal.save();
        }
      }

      // 2. Update Item Status
      item.status = 'saved';
      await item.save();

      return NextResponse.json({ message: 'Money moved to savings', status: 'saved' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}