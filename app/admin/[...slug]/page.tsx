"use client";

import { usePathname } from "next/navigation";
import { AdminWorkspace } from "@/components/AdminTools";
import { AdminGate } from "@/components/AuthGate";

export default function AdminSubroutePage() {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <AdminWorkspace pathname={pathname} />;
  }

  return (
    <AdminGate>
      <AdminWorkspace pathname={pathname} />
    </AdminGate>
  );
}
