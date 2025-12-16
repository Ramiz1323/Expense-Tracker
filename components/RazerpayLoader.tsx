"use client";

import Script from "next/script";
import { useEffect } from "react";

export default function RazorpayLoader() {
  return (
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
  )
}
