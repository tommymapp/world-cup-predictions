import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "World Cup 2026 Predictions",
  description: "Predict the group stage results with your friends",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex gap-6 items-center">
          <span className="font-bold text-yellow-400">⚽ WC2026</span>
          <Link href="/" className="text-gray-300 hover:text-white text-sm">Home</Link>
          <Link href="/predict" className="text-gray-300 hover:text-white text-sm">Predict</Link>
          <Link href="/awards" className="text-gray-300 hover:text-white text-sm">Awards</Link>
          <Link href="/leaderboard" className="text-gray-300 hover:text-white text-sm">Leaderboard</Link>
          <Link href="/admin" className="ml-auto text-gray-600 hover:text-gray-400 text-sm">Admin</Link>
        </nav>
        <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">{children}</main>
      </body>
    </html>
  );
}
