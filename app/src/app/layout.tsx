import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Fraunces } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteNav } from "@/components/site-nav";
import { WalletProviders } from "@/components/wallet-providers";
import { LenisProvider } from "@/components/lenis-provider";
import { EthereumErrorGuard } from "@/components/ethereum-error-guard";
import "./globals.css";

const sans = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "LP Arena",
  description: "LPing is a sport now.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <EthereumErrorGuard />
        <LenisProvider />
        <WalletProviders>
          <TooltipProvider>
            <SiteNav />
            {children}
          </TooltipProvider>
        </WalletProviders>
      </body>
    </html>
  );
}
