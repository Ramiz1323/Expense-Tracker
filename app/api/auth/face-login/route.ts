import { connectDB } from '@/lib/mongodb/db';
import User from '@/lib/mongodb/models/User';
import { generateToken } from '@/lib/auth/jwt';
import { setAuthToken } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';

function euclideanDistance(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

export async function POST(req: NextRequest) {
  const { descriptor } = await req.json();

  await connectDB();
  const users = await User.find({ 'faceAuth.enabled': true });

  for (const user of users) {
    const distance = euclideanDistance(
      user.faceAuth.descriptor,
      descriptor
    );

    if (distance < 0.55) {
      // Pass user.fullName as the 4th argument
      const token = generateToken(
        user._id.toString(),
        user.email,
        user.role,
        user.fullName
      );

      await setAuthToken(token);
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: 'No match' }, { status: 401 });
}
