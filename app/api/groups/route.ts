import { connectDB } from '@/lib/mongodb/db';
import { getCurrentUser } from '@/lib/auth/session';
import { Group } from '@/lib/mongodb/models/Group';
import { User } from '@/lib/mongodb/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    // Find groups where the user is a member
    const groups = await Group.find({ members: currentUser.userId })
      .populate('members', 'fullName email avatarUrl')
      .sort({ updatedAt: -1 });

    return NextResponse.json(groups);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, memberEmails } = await request.json();
    if (!name) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });

    await connectDB();

    // Find users by email to add them
    const members = [currentUser.userId]; // Always include creator
    
    if (memberEmails && Array.isArray(memberEmails)) {
      const foundUsers = await User.find({ email: { $in: memberEmails } });
      foundUsers.forEach((u: any) => {
        if (u._id.toString() !== currentUser.userId) {
          members.push(u._id);
        }
      });
    }

    const group = await Group.create({
      name,
      members,
      createdBy: currentUser.userId
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}