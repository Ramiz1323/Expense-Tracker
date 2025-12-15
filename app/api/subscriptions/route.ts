import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Subscription } from '@/lib/mongodb/models/Subscription';
import { Transaction } from '@/lib/mongodb/models/Transaction'; //
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const subscriptions = await Subscription.find({ userId: currentUser.userId })
      .sort({ nextPaymentDate: 1 }); // Show upcoming payments first

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, amount, billingCycle, startDate, category } = body;

    if (!name || !amount || !billingCycle || !startDate) {
      return NextResponse.json(
        { error: 'Name, amount, billing cycle, and start date are required' },
        { status: 400 }
      );
    }

    // Calculate next payment date
    const start = new Date(startDate);
    const nextPayment = new Date(start);
    if (billingCycle === 'monthly') {
      nextPayment.setMonth(nextPayment.getMonth() + 1);
    } else {
      nextPayment.setFullYear(nextPayment.getFullYear() + 1);
    }

    // 1. Create the Subscription entry
    const subscription = await Subscription.create({
      userId: currentUser.userId,
      name,
      amount,
      billingCycle,
      startDate: start,
      nextPaymentDate: nextPayment,
      category: category || 'General',
    });

    // 2. Automatically create a corresponding Transaction for the first payment
    await Transaction.create({
      userId: currentUser.userId,
      category: category || 'Subscription',
      description: `${name} (${billingCycle} subscription)`,
      amount: amount,
      type: 'expense', // Subscriptions are spending
      date: start, // The transaction happens on the start date
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}