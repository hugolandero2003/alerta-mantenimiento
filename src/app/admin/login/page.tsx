import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminSession, getAdminSession } from "@/lib/auth";

async function adminLogin(formData: FormData) {
  "use server";

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!username || !password) {
    redirect("/admin/login?error=Ingresa+usuario+y+contrasena");
  }

  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    redirect("/admin/login?error=Faltan+credenciales+admin+en+.env");
  }

  if (username !== expectedUser || password !== expectedPassword) {
    redirect("/admin/login?error=Credenciales+admin+invalidas");
  }

  await createAdminSession({ username });
  redirect("/admin");
}

type AdminLoginProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginProps) {
  const adminSession = await getAdminSession();

  if (adminSession) {
    redirect("/admin");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-8 sm:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-accent/15 blur-2xl" />
        <p className="text-sm uppercase tracking-[0.16em] text-accent-strong">
          Panel Privado
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Acceso admin</h1>
        <p className="mt-2 text-sm text-slate-700">
          Solo usuarios con credenciales admin pueden entrar al panel privado.
        </p>

        {params.error && (
          <section className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
            {params.error}
          </section>
        )}

        <form action={adminLogin} className="mt-5 grid gap-3">
          <input
            required
            name="username"
            placeholder="Usuario admin"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <input
            required
            name="password"
            type="password"
            placeholder="Contrasena"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="submit"
            className="mt-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Entrar al panel admin
          </button>
        </form>

        <Link
          href="/"
          className="mt-4 inline-flex text-sm font-semibold text-accent-strong transition hover:text-accent"
        >
          Volver al login de conductores
        </Link>
      </section>
    </main>
  );
}
