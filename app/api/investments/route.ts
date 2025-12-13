import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Investment } from '@/lib/mongodb/models/Investment';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const investments = await Investment.find({ userId: currentUser.userId })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json(investments);
  } catch (error) {
    console.error('Get investments error:', error);
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

    const data = await request.json();
    
    const {
      category,
      description,
      amount,
      type,
      date,
      startDate,
      expectedReturnRate,
      expectedEndDate,
      targetYears
    } = data;

    if (!category || !amount || !type) {
      return NextResponse.json(
        { error: 'Category, amount, and type are required' },
        { status: 400 }
      );
    }

    const investment = await Investment.create({
      userId: currentUser.userId,
      category,
      description,
      amount,
      type,
      date: date ? new Date(date) : new Date(),
      startDate: startDate ? new Date(startDate) : new Date(),
      expectedReturnRate: expectedReturnRate ?? 0,
      expectedEndDate: expectedEndDate ?? null,
      targetYears: targetYears ?? 1,
    });

    return NextResponse.json(investment, { status: 201 });
  } catch (error) {
    console.error('Create investment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}