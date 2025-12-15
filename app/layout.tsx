import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider";
import { Chatbot } from "@/components/ai/Chatbot";


const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinTrack - Personal Finance Tracker",
  description: "Manage your personal finances with ease. Track expenses, income, and budgets.",
  icons: {
    icon: [
      {
        url: "/Logo.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/Logo.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/Logo.png",
        type: "image/svg+xml",
      },
    ],
    apple: "/Logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Chatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}