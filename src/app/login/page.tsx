import { UtensilsCrossed } from "lucide-react";

import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Comedores Hospitalarios
            </h1>
            <p className="text-sm text-muted-foreground">
              Control de alimentos servidos
            </p>
          </div>
        </div>

        <LoginForm next={next} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso de demostración: <span className="font-medium">demo</span> /{" "}
          <span className="font-medium">demo123</span>
        </p>
      </div>
    </main>
  );
}
