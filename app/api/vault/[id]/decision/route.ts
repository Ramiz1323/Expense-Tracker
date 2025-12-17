import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { VaultItem } from '@/lib/mongodb/models/VaultItem';
import { Transaction } from '@/lib/mongodb/models/Transaction';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    // decision: 'buy' | 'save' | 'invest'
    const { decision } = await request.json(); 

    await connectDB();
    const item = await VaultItem.findById(id);

    if (!item || item.userId.toString() !== user.userId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (decision === 'buy') {
      // 1. Create Expense Transaction
      await Transaction.create({
        userId: user.userId,
        category: item.category,
        description: `Vault Purchase: ${item.name}`,
        amount: item.currentAmount, // Use the accumulated amount
        type: 'expense',
        date: new Date()
      });
      item.status = 'purchased';
    } 
    
    else if (decision === 'save') {
      // 1. Create Savings Transaction (Income/Savings type)
      // As requested: "ADD the amount to Transaction section as SAVINGS"
      await Transaction.create({
        userId: user.userId,
        category: 'Savings',
        description: `Saved from Vault: ${item.name}`,
        amount: item.currentAmount,
        type: 'income', // Treated as "found money" or added to savings balance
        date: new Date()
      });
      item.status = 'saved';
    }
    
    else if (decision === 'invest') {
      // Just mark as invested here, the actual creation happens in the redirected form
      item.status = 'invested';
    }

    await item.save();
    return NextResponse.json({ message: 'Success', status: item.status });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}