import { connectDB } from '@/lib/mongodb/db';
import { User } from '@/lib/mongodb/models/User';
import { Otp } from '@/lib/mongodb/models/Otp'; // Import OTP model
import { hashPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { setAuthToken } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password, fullName, phone, otp } = await request.json();

    // 1. Validate Input
    if (!email || !password || !fullName || !phone || !otp) {
      return NextResponse.json(
        { error: 'All fields (including OTP) are required' },
        { status: 400 }
      );
    }

    // 2. Verify OTP
    const validOtp = await Otp.findOne({ phone, code: otp });
    if (!validOtp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // 3. Check existing user
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { phone }] 
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or phone already exists' },
        { status: 400 }
      );
    }

    // 4. Create User
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName,
      phone,
      role: 'user',
    });

    // 5. Cleanup OTP
    await Otp.deleteOne({ _id: validOtp._id });

    // 6. Login User
    const token = generateToken(user._id.toString(), user.email, user.role, user.fullName);
    await setAuthToken(token);

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}