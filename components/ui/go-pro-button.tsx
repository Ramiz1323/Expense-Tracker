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
        body: JSON.stringify({ amount: 29900 }), // 299 INR
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
        name: 'Fintrack Pro',
        description: 'Upgrade to Pro for advanced features',

        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });

            if (!verifyRes.ok) {
              throw new Error();
            }

            toast.success('🎉 You are now a Pro user!');
            window.location.reload();
          } catch {
            toast.error('Payment verification failed');
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },

        prefill: {
          name: 'User Name',
          email: 'user@example.com',
        },

        theme: {
          color: '#10b981',
        },
      };

      setTimeout(() => {
        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
      }, 100);

      setTimeout(() => {
        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
      }, 100);

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