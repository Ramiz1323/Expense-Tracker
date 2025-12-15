import { connectDB } from '@/lib/mongodb/db';
import { Otp } from '@/lib/mongodb/models/Otp';
import { User } from '@/lib/mongodb/models/User';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Check if phone is already registered
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete old OTPs for this phone
    await Otp.deleteMany({ phone });

    // Save new OTP
    await Otp.create({ phone, code: otpCode });

    // --- MOCK SMS ---
    console.log(`\n🔑 [MOCK SMS] OTP for ${phone}: ${otpCode}\n`);
    // ----------------

    return NextResponse.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}