import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/mongodb/db";
import User from "@/lib/mongodb/models/User";

export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    await User.findByIdAndUpdate(user.userId, {
      isPro: false,
      $unset: {
        "payment.razorpayOrderId": "",
        "payment.razorpayPaymentId": "",
        "payment.razorpaySignature": "",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
