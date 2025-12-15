"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface GoProButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function GoProButton({ className, variant = 'default', size = 'default' }: GoProButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoPro = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: 49900 }), // 499 INR
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const { orderId, amount, currency, key } = await response.json();

      const options = {
        key,
        amount,
        currency,
        order_id: orderId,
        name: 'Fintrack pro',
        description: 'Upgrade to Pro for advanced features',
        handler: function (response: any) {
          toast.success('Payment successful! Welcome to Pro.');
          // Here you can update user status or redirect
          console.log(response);
        },
        prefill: {
          name: 'User Name',
          email: 'user@example.com',
        },
        theme: {
          color: '#10b981', // emerald color
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error('Failed to initiate payment. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGoPro}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Crown className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Processing...' : 'Go Pro'}
    </Button>
  );
}