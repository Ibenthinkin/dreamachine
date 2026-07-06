import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dreamachine",
  description:
    "Full-screen light strobe phase-locked to an isochronic tone. Eyes closed. 18+, not for anyone with a history of epilepsy or seizures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-black text-neutral-100">{children}</body>
    </html>
  );
}
