import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { VaultItem } from '@/lib/mongodb/models/VaultItem';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { amount } = await request.json(); // Amount to ADD

    await connectDB();
    const item = await VaultItem.findById(id);

    if (!item || item.userId.toString() !== user.userId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    item.currentAmount += Number(amount);
    
    // Cap at target amount? Or allow overflow? 
    // Usually capping at target makes logic easier for "Goal Reached"
    if (item.currentAmount > item.targetAmount) {
        item.currentAmount = item.targetAmount;
    }

    await item.save();

    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}