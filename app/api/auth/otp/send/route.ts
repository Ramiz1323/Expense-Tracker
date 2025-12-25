import { connectDB } from '@/lib/mongodb/db';
import { Otp } from '@/lib/mongodb/models/Otp';
import { User } from '@/lib/mongodb/models/User';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create the email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete old OTPs for this email
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Save new OTP to MongoDB
    await Otp.create({ email: email.toLowerCase(), code: otpCode });

    // --- SEND REAL EMAIL ---
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your FinTrack Confirmation Code",
      text: `Your confirmation code is: ${otpCode}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333;">Welcome to FinTrack!</h2>
          <p>Please use the following code to confirm your email address and complete your registration:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p style="color: #666; font-size: 12px;">This code will expire in 5 minutes.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: 'Confirmation code sent to your email' });
  } catch (error) {
    console.error('Send Email Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}