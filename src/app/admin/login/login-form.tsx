"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type AdminLoginFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-glass btn-glass-primary mt-2 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Verificando acceso..." : "Entrar al panel admin"}
    </button>
  );
}

export function AdminLoginForm({ action, error }: AdminLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="relative mt-6 grid gap-4" noValidate>
      {error && (
        <section className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          {error}
        </section>
      )}

      <div className="grid gap-1.5">
        <label htmlFor="admin-username" className="text-sm font-medium text-slate-800">
          Usuario administrativo
        </label>
        <input
          id="admin-username"
          required
          name="username"
          autoComplete="username"
          maxLength={64}
          placeholder="Ingresa tu usuario"
          className="field-glass rounded-xl px-3 py-2.5 text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="admin-password" className="text-sm font-medium text-slate-800">
          Contrasena
        </label>
        <div className="field-glass-group flex rounded-xl">
          <input
            id="admin-password"
            required
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            maxLength={128}
            placeholder="Ingresa tu contrasena"
            className="w-full rounded-l-xl px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="btn-glass btn-glass-neutral rounded-r-xl rounded-l-none px-3 text-xs font-semibold"
            aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600">
        Si hay varios intentos fallidos consecutivos, el acceso se bloquea temporalmente por seguridad.
      </p>

      <SubmitButton />
    </form>
  );
}
