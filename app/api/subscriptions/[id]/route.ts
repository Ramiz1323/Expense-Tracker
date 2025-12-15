import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Subscription } from '@/lib/mongodb/models/Subscription';
import { Transaction } from '@/lib/mongodb/models/Transaction';
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
    const subscription = await Subscription.findOne({ _id: id, userId: currentUser.userId });

    if (!subscription) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
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

    // 1. Find the existing subscription to get details for the transaction lookup
    const oldSubscription = await Subscription.findOne({ _id: id, userId: currentUser.userId });

    if (!oldSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // 2. Sync: Update the corresponding Transaction
    // We attempt to find the transaction created when this subscription was first added.
    try {
      // Reconstruct the description used during creation to find the match
      const oldDescription = `${oldSubscription.name} (${oldSubscription.billingCycle} subscription)`;
      
      await Transaction.findOneAndUpdate(
        {
          userId: currentUser.userId,
          amount: oldSubscription.amount,
          date: oldSubscription.startDate, // The transaction is logged on the start date
          type: 'expense',
          // Optional: match description or category to be more precise
          // description: oldDescription 
        },
        {
          amount: body.amount ?? oldSubscription.amount,
          date: body.startDate ? new Date(body.startDate) : oldSubscription.startDate,
          category: body.category ?? oldSubscription.category,
          description: `${body.name ?? oldSubscription.name} (${body.billingCycle ?? oldSubscription.billingCycle} subscription)`,
        }
      );
    } catch (err) {
      console.error("Failed to sync subscription update to transactions:", err);
    }

    // 3. Update the Subscription
    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, userId: currentUser.userId },
      { ...body },
      { new: true }
    );

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    
    // 1. Delete the Subscription
    const subscription = await Subscription.findOneAndDelete({ _id: id, userId: currentUser.userId });

    if (!subscription) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

    // 2. Sync: Delete the corresponding Transaction
    try {
      await Transaction.findOneAndDelete({
        userId: currentUser.userId,
        amount: subscription.amount,
        date: subscription.startDate,
        type: 'expense',
        // We look for a transaction that matches the subscription's category/description pattern
        description: `${subscription.name} (${subscription.billingCycle} subscription)`
      });
    } catch (err) {
      console.error("Failed to sync subscription delete to transactions:", err);
    }

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Delete subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}