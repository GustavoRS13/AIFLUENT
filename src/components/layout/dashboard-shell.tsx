"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PERMISSIONS, hasPermission, type Permission } from "@/lib/rbac";
import type { UserRole } from "@/lib/auth";

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const role = user.role as UserRole | undefined;

  // Guard: bloqueia acesso direto (por URL) a páginas sem permissão do papel.
  useEffect(() => {
    if (!role) return;
    const seg = pathname?.split("/").filter(Boolean)[0];
    if (!seg) return;
    const permKey = `page:${seg}` as Permission;
    if (permKey in PERMISSIONS && !hasPermission(role, permKey)) {
      router.replace(role === "admin" ? "/dashboard" : "/leads");
    }
  }, [pathname, role, router]);

  return (
    <div className="flex h-dvh overflow-hidden" data-user-role={user.role}>
      <Sidebar />
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
