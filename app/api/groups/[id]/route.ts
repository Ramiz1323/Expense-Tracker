import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Group } from '@/lib/mongodb/models/Group';
import { SplitExpense } from '@/lib/mongodb/models/SplitExpense';
import { NextRequest, NextResponse } from 'next/server';

// Get Group Details + Expenses
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { id } = await params;

    await connectDB();

    const group = await Group.findById(id).populate('members', 'fullName email avatarUrl');
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // Check membership
    const isMember = group.members.some((m: any) => m._id.toString() === currentUser.userId);
    if (!isMember) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const expenses = await SplitExpense.find({ groupId: id })
      .populate('paidBy', 'fullName email')
      .sort({ date: -1 });

    return NextResponse.json({ group, expenses, currentUserId: currentUser.userId });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add Expense to Group
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { id } = await params;
    const { description, amount, date } = await request.json();

    await connectDB();

    const expense = await SplitExpense.create({
      groupId: id,
      description,
      amount,
      paidBy: currentUser.userId,
      date: date || new Date()
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE Group
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    const group = await Group.findById(id);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // Only the creator can delete the group
    if (group.createdBy.toString() !== currentUser.userId) {
      return NextResponse.json({ error: 'Only the admin can delete this group' }, { status: 403 });
    }

    // Delete all expenses associated with this group
    await SplitExpense.deleteMany({ groupId: id });
    
    // Delete the group itself
    await Group.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}