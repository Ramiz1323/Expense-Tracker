import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { SplitExpense } from '@/lib/mongodb/models/SplitExpense';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    const expense = await SplitExpense.findById(id);
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    // Only the person who paid or the group admin (not implemented here for simplicity) can delete
    if (expense.paidBy.toString() !== currentUser.userId) {
      return NextResponse.json({ error: 'You can only delete your own expenses' }, { status: 403 });
    }

    await SplitExpense.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}