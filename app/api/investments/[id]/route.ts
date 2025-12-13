import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Investment } from '@/lib/mongodb/models/Investment';
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

    const investment = await Investment.findOneAndUpdate(
      { _id: id, userId: currentUser.userId },
      { ...body },
      { new: true }
    );

    if (!investment) return NextResponse.json({ error: 'Investment not found' }, { status: 404 });

    return NextResponse.json(investment);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const investment = await Investment.findOneAndDelete({ _id: id, userId: currentUser.userId });

    if (!investment) return NextResponse.json({ error: 'Investment not found' }, { status: 404 });

    return NextResponse.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}