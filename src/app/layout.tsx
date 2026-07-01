import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppFrame from "@/components/AppFrame";

// Inter is the cross-platform stand-in for SF Pro. On Apple devices the CSS
// stack (globals.css --font-sans) puts -apple-system / SF Pro first, so real
// SF Pro is used there; Inter renders everywhere else.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinTrack",
  description: "Personal double-entry accounting — track your day-to-day balance.",
};

// Applies the saved theme before first paint to avoid a flash. Dark is default.
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
