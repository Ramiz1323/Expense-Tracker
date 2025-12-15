import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Investment } from '@/lib/mongodb/models/Investment';
import { Transaction } from '@/lib/mongodb/models/Transaction'; // Imported Transaction model
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const investment = await Investment.findOne({ _id: id, userId: currentUser.userId });

    if (!investment) return NextResponse.json({ error: 'Investment not found' }, { status: 404 });

    return NextResponse.json(investment);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const body = await request.json();

    // 1. Find the existing investment first to get its current details
    const oldInvestment = await Investment.findOne({ _id: id, userId: currentUser.userId });

    if (!oldInvestment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    // 2. Update the corresponding Transaction
    // We try to find the transaction matching the *old* investment details before changing them
    try {
      await Transaction.findOneAndUpdate(
        {
          userId: currentUser.userId,
          amount: oldInvestment.amount,
          date: oldInvestment.date,
          type: 'expense',
          category: oldInvestment.category
        },
        {
          // Update with new values from body, or keep old ones if not provided
          amount: body.amount ?? oldInvestment.amount,
          date: body.date ? new Date(body.date) : oldInvestment.date,
          category: body.category ?? oldInvestment.category,
          description: body.description ?? `Investment in ${body.category ?? oldInvestment.category}`,
        }
      );
    } catch (err) {
      console.error("Failed to sync investment update to transactions:", err);
    }

    // 3. Update the Investment
    const investment = await Investment.findOneAndUpdate(
      { _id: id, userId: currentUser.userId },
      { ...body },
      { new: true }
    );

    return NextResponse.json(investment);
  } catch (error) {
    console.error('Update investment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    
    // 1. Delete the Investment
    const investment = await Investment.findOneAndDelete({ _id: id, userId: currentUser.userId });

    if (!investment) return NextResponse.json({ error: 'Investment not found' }, { status: 404 });

    // 2. Delete the corresponding Transaction
    try {
      await Transaction.findOneAndDelete({
        userId: currentUser.userId,
        amount: investment.amount,
        date: investment.date,
        type: 'expense',
        category: investment.category,
      });
    } catch (err) {
      console.error("Failed to sync investment delete to transactions:", err);
    }

    return NextResponse.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    console.error('Delete investment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}