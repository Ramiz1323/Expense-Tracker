import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { VaultItem } from '@/lib/mongodb/models/VaultItem';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Log the incoming data to debug
    const body = await request.json();
    console.log("Vault POST Data:", body); // <--- CHECK YOUR TERMINAL FOR THIS

    const { name, targetAmount, category, description } = body;

    // 2. Validate manually
    if (!name || !targetAmount) {
      return NextResponse.json({ error: 'Name and Target Amount are required' }, { status: 400 });
    }

    await connectDB();

    // 3. Create Item
    const newItem = await VaultItem.create({
      userId: user.userId,
      name,
      targetAmount: Number(targetAmount), // Force conversion to Number
      currentAmount: 0,
      category: category || 'Shopping',
      description: description || '',
      status: 'active'
    });

    return NextResponse.json(newItem, { status: 201 });

  } catch (error: any) {
    console.error("Vault Creation Error:", error); // <--- THIS WILL SHOW THE REAL ERROR
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    await connectDB();
    
    const items = await VaultItem.find({ userId: user.userId })
      .sort({ status: 1, createdAt: -1 });
      
    return NextResponse.json(items);
  } catch (error) {
    console.error("Vault GET Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}