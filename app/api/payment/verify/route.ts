import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/mongodb/db";
import crypto from "crypto";

import User from "@/lib/mongodb/models/User";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[user]`, user);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET!).update(body).digest("hex");

    if (razorpay_signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[razorpay_order_id]`, razorpay_order_id);
    console.log(`[razorpay_payment_id]`, razorpay_payment_id);
    console.log(`[razorpay_signature]`, razorpay_signature);
    console.log(`[expectedSignature]`, expectedSignature);
    

    await connectDB();

    await User.findByIdAndUpdate(user.userId, {
      isPro: true,
      $set: {
        "payment.razorpayOrderId": razorpay_order_id,
        "payment.razorpayPaymentId": razorpay_payment_id,
        "payment.razorpaySignature": razorpay_signature,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Payment verify error:", err);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}