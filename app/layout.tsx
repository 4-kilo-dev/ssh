import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DemoProvider } from "@/lib/store";
import { SessionProvider } from "@/components/SessionProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Addis Gathering | Find your place in Addis Ababa",
  description: "Explore event venues and trusted services across Addis Ababa.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DemoProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </DemoProvider>
      </body>
    </html>
  );
}
