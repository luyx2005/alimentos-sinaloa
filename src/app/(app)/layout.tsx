import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { ROLE_LABELS, destroySession, requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  async function logout() {
    "use server";
    await destroySession();
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav
        userName={session.name}
        roleLabel={ROLE_LABELS[session.role]}
        isAdmin={session.role === "admin"}
        logout={logout}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8">
        {children}
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Alimentos Sinaloa · Control de alimentos servidos en comedores hospitalarios
      </footer>
    </div>
  );
}
