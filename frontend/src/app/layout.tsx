import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";

import "./globals.css";

// latin-ext: Türkçe karakterler (ç, ğ, ı, ö, ş, ü) için.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Finans Paneli",
    template: "%s | Finans Paneli",
  },
  description: "Müşteri, hesap ve finansal işlem yönetim paneli",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" closeButton />
      </body>
    </html>
  );
};

export default RootLayout;
