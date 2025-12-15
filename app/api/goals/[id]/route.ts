import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Goal } from '@/lib/mongodb/models/Goal';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Type as Promise
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params; // Await params here
    const { amountToAdd } = await request.json();
    
    await connectDB();

    const goal = await Goal.findOne({ _id: id, userId: user.userId });
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    goal.currentAmount += Number(amountToAdd);
    await goal.save();

    return NextResponse.json(goal);
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Type as Promise
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params; // Await params here
    
    await connectDB();
    await Goal.findOneAndDelete({ _id: id, userId: user.userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}