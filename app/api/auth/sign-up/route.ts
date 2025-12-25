import { connectDB } from '@/lib/mongodb/db';
import { User } from '@/lib/mongodb/models/User';
import { Otp } from '@/lib/mongodb/models/Otp'; 
import { hashPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { setAuthToken } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password, fullName, phone, otp } = await request.json();

    // 1. Validate Required Fields
    if (!email || !password || !fullName || !phone || !otp) {
      return NextResponse.json(
        { error: 'All fields (including confirmation code) are required' },
        { status: 400 }
      );
    }

    // 2. Server-side Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 3. Verify Email Code (OTP)
    const validOtp = await Otp.findOne({ 
      email: email.toLowerCase().trim(), 
      code: otp 
    });
    
    if (!validOtp) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation code' },
        { status: 400 }
      );
    }
    

    // 4. Check for existing user (Email or Phone)
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase().trim() }, { phone }] 
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or phone already exists' },
        { status: 400 }
      );
    }

    // 5. Create User
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName,
      phone,
      role: 'user',
    });

    // 6. Cleanup used code
    await Otp.deleteOne({ _id: validOtp._id });

    // 7. Generate Session Token and Login
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