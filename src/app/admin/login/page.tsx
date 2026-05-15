import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { timingSafeEqual } from "crypto";
import { createAdminSession, getAdminSession } from "@/lib/auth";
import { AdminLoginForm } from "./login-form";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 5 * 60 * 1000;
const ADMIN_USER_MAX_LENGTH = 64;
const ADMIN_PASSWORD_MAX_LENGTH = 128;

type AttemptRecord = {
  failures: number;
  firstFailureAt: number;
  lockUntil: number;
};

const attemptStore = new Map<string, AttemptRecord>();

function sanitizeErrorMessage(message: string) {
  return encodeURIComponent(message);
}

function normalizeForCompare(value: string) {
  return value.normalize("NFKC");
}

function safeEquals(a: string, b: string) {
  const left = Buffer.from(normalizeForCompare(a), "utf8");
  const right = Buffer.from(normalizeForCompare(b), "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

async function getAttemptKey(username: string) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown-ip";
  return `${ip}:${normalizeForCompare(username)}`;
}

function cleanupAttemptStore(now: number) {
  for (const [key, record] of attemptStore.entries()) {
    if (record.lockUntil > 0 && now > record.lockUntil + LOCK_WINDOW_MS) {
      attemptStore.delete(key);
      continue;
    }

    if (record.lockUntil === 0 && now > record.firstFailureAt + LOCK_WINDOW_MS) {
      attemptStore.delete(key);
    }
  }
}

function isLocked(attemptKey: string, now: number) {
  const record = attemptStore.get(attemptKey);

  if (!record) {
    return false;
  }

  if (record.lockUntil > now) {
    return true;
  }

  if (record.lockUntil > 0 && now >= record.lockUntil) {
    attemptStore.delete(attemptKey);
  }

  return false;
}

function registerFailure(attemptKey: string, now: number) {
  const current = attemptStore.get(attemptKey);

  if (!current || now > current.firstFailureAt + LOCK_WINDOW_MS) {
    attemptStore.set(attemptKey, {
      failures: 1,
      firstFailureAt: now,
      lockUntil: 0,
    });
    return;
  }

  const nextFailures = current.failures + 1;
  const lockUntil = nextFailures >= MAX_LOGIN_ATTEMPTS ? now + LOCK_WINDOW_MS : 0;

  attemptStore.set(attemptKey, {
    failures: nextFailures,
    firstFailureAt: current.firstFailureAt,
    lockUntil,
  });
}

function clearFailures(attemptKey: string) {
  attemptStore.delete(attemptKey);
}

async function delayInvalidAttempt() {
  await new Promise((resolve) => setTimeout(resolve, 400));
}

async function adminLogin(formData: FormData) {
  "use server";

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const now = Date.now();
  cleanupAttemptStore(now);

  const attemptKey = await getAttemptKey(username || "empty-user");

  if (isLocked(attemptKey, now)) {
    redirect(`/admin/login?error=${sanitizeErrorMessage("Demasiados intentos. Espera 5 minutos e intenta de nuevo")}`);
  }

  if (!username || !password) {
    redirect(`/admin/login?error=${sanitizeErrorMessage("Ingresa usuario y contrasena")}`);
  }

  if (username.length > ADMIN_USER_MAX_LENGTH || password.length > ADMIN_PASSWORD_MAX_LENGTH) {
    redirect(`/admin/login?error=${sanitizeErrorMessage("Formato de credenciales no valido")}`);
  }

  const expectedUser =
    process.env.ADMIN_USER ??
    process.env.ADMIN_USERNAME ??
    process.env.VERCEL_ADMIN_USER;
  const expectedPassword =
    process.env.ADMIN_PASSWORD ??
    process.env.ADMIN_PASS ??
    process.env.VERCEL_ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    redirect(`/admin/login?error=${sanitizeErrorMessage("Faltan credenciales admin en variables de entorno")}`);
  }

  if (!safeEquals(username, expectedUser) || !safeEquals(password, expectedPassword)) {
    registerFailure(attemptKey, now);
    await delayInvalidAttempt();
    redirect(`/admin/login?error=${sanitizeErrorMessage("Credenciales admin invalidas")}`);
  }

  clearFailures(attemptKey);
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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-12">
      <section className="grid overflow-hidden rounded-3xl border border-line bg-panel shadow-sm lg:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden bg-slate-900 p-8 text-slate-100 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(31,122,140,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(15,95,115,0.6),transparent_50%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Flota Segura</p>
            <h1 className="mt-3 max-w-sm text-3xl font-semibold leading-tight">
              Acceso administrativo seguro para operaciones criticas
            </h1>
            <p className="mt-4 max-w-sm text-sm text-slate-200/85">
              Usa este acceso solo para tareas de control: reportes, configuracion y gestion del sistema.
            </p>
            <ul className="mt-8 grid gap-3 text-sm text-slate-100/90">
              <li className="rounded-xl border border-white/20 bg-white/10 p-3">Acceso restringido para personal autorizado</li>
              <li className="rounded-xl border border-white/20 bg-white/10 p-3">Bloqueo temporal ante intentos fallidos repetidos</li>
              <li className="rounded-xl border border-white/20 bg-white/10 p-3">Sesion privada para proteger la informacion</li>
            </ul>
          </div>
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
          <p className="relative text-sm uppercase tracking-[0.16em] text-accent-strong">
            Panel Privado
          </p>
          <h2 className="relative mt-2 text-3xl font-bold tracking-tight">Acceso admin</h2>
          <p className="relative mt-2 text-sm text-slate-700">
            Ingresa tus credenciales para continuar al panel de administracion.
          </p>

          <AdminLoginForm action={adminLogin} error={params.error} />

          <Link
            href="/"
            className="btn-glass btn-glass-neutral mt-4 px-4 py-2 text-sm font-semibold"
          >
            Volver al login de conductores
          </Link>
        </div>
      </section>
    </main>
  );
}
