import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, PieChart, Lock } from 'lucide-react';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  if (token) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">FinTrack</h1>
          <div className="flex gap-4">
            <Link href="/auth/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-5xl font-bold tracking-tight mb-6">
          Take Control of Your <span className="text-blue-600 dark:text-blue-400">Finances</span>
        </h2>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
          FinTrack helps you track expenses, manage income, and achieve your financial goals with ease.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/sign-up">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Why Choose FinTrack?</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-lg border border-slate-200 dark:border-slate-800">
            <TrendingUp className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Track Everything</h4>
            <p className="text-slate-600 dark:text-slate-400">
              Record all your income and expenses in one place. Categorize transactions for better insights.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-lg border border-slate-200 dark:border-slate-800">
            <PieChart className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Visual Analytics</h4>
            <p className="text-slate-600 dark:text-slate-400">
              Get detailed charts and reports to understand your spending patterns.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-lg border border-slate-200 dark:border-slate-800">
            <Lock className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Secure & Private</h4>
            <p className="text-slate-600 dark:text-slate-400">
              Your financial data is encrypted and protected with enterprise-grade security.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600 dark:text-slate-400">
          <p>&copy; 2025 FinTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
