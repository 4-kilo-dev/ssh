import type { Metadata } from "next";
import "./globals.css";
import { DemoProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Addis Gathering | Find your place in Addis Ababa",
  description: "Explore event venues and trusted services across Addis Ababa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
