import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { createVehicleSession, getVehicleSession } from "@/lib/auth";

const TRUCK_BRANDS = [
  "Ashok Leyland",
  "BharatBenz",
  "Chevrolet",
  "DAF",
  "Dongfeng",
  "Eicher",
  "Faw",
  "Fiat",
  "Ford",
  "Foton",
  "Freightliner",
  "GMC",
  "Hino",
  "Hyundai",
  "International",
  "Isuzu",
  "Iveco",
  "JAC",
  "Kenworth",
  "Mack",
  "MAN",
  "Maxus",
  "Mazda",
  "Mercedes-Benz",
  "Mitsubishi Fuso",
  "Nissan",
  "Peterbilt",
  "Ram",
  "Renault Trucks",
  "Scania",
  "Shacman",
  "Sinotruk",
  "Toyota",
  "UD Trucks",
  "Volkswagen",
  "Volvo",
  "Western Star",
  "Otro",
];

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase().replace(/\s+/g, "");
}

async function registerVehicle(formData: FormData) {
  "use server";

  const plate = normalizePlate(String(formData.get("plate") ?? ""));
  const driverCc = String(formData.get("driverCc") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const driverName = String(formData.get("driverName") ?? "").trim();

  if (!plate || !driverCc || !model || !driverName) {
    redirect("/?error=Completa+placa%2C+cedula%2C+marca+y+nombre+del+conductor");
  }

  try {
    await prisma.vehicle.upsert({
      where: { plate },
      create: {
        plate,
        driverCc,
        model,
        company: driverName,
      },
      update: {
        driverCc,
        model,
        company: driverName,
      },
    });
  } catch (e) {
    console.error("[registerVehicle] DB error:", e);
    redirect("/?error=No+fue+posible+conectar+con+la+base+de+datos");
  }

  redirect("/?ok=Vehiculo+registrado.+Ahora+inicia+sesion");
}

async function loginWithVehicle(formData: FormData) {
  "use server";

  const plate = normalizePlate(String(formData.get("plate") ?? ""));
  const driverCc = String(formData.get("driverCc") ?? "").trim();

  if (!plate || !driverCc) {
    redirect("/?error=Ingresa+placa+y+cedula");
  }

  let vehicle;

  try {
    vehicle = await prisma.vehicle.findFirst({
      where: {
        plate,
        driverCc,
      },
      select: {
        id: true,
        plate: true,
      },
    });
  } catch (e) {
    console.error("[loginWithVehicle] DB error:", e);
    redirect("/?error=No+fue+posible+conectar+con+la+base+de+datos");
  }

  if (!vehicle) {
    redirect("/?error=Credenciales+invalidas.+Revisa+placa+y+cedula");
  }

  await createVehicleSession({
    vehicleId: vehicle.id,
    plate: vehicle.plate,
  });

  redirect("/panel");
}

type HomeProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const session = await getVehicleSession();

  if (session) {
    redirect("/panel");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-accent/15 blur-2xl" />
        <div className="relative z-10 mb-5 flex justify-end">
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
          >
            Admin
          </Link>
        </div>
        <p className="text-sm uppercase tracking-[0.16em] text-accent-strong">
          Acceso de Conductores
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Prevencion y mantenimiento seguro de flotas
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-700 sm:text-base">
          Ingreso rapido para conductores. Solo validamos placa y cedula para
          entrar al panel de mantenimientos.
        </p>

        <div className="mt-6 max-w-xl">
          <form
            action={loginWithVehicle}
            className="rounded-2xl border border-line bg-white/85 p-5 backdrop-blur"
          >
            <h2 className="text-lg font-semibold">Entrar al panel</h2>
            <p className="mt-1 text-sm text-slate-600">
              Usa la placa y cedula registradas.
            </p>
            <div className="mt-4 grid gap-3">
              <input
                required
                name="plate"
                placeholder="Placa (ej: ABC123)"
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm uppercase outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <input
                required
                name="driverCc"
                placeholder="Cedula del conductor"
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Ingresar ahora
            </button>
          </form>
        </div>

        {params.error && (
          <section className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
            {params.error}
          </section>
        )}

        {params.ok && (
          <section className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
            {params.ok}
          </section>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold">Registro rapido</h2>
        <p className="mt-1 text-sm text-slate-600">
          Deja creado el usuario de prueba o nuevos conductores para login.
        </p>
        <form action={registerVehicle} className="mt-4 grid gap-3">
          <input
            required
            name="plate"
            placeholder="Placa"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm uppercase outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <input
            required
            name="driverCc"
            placeholder="Cedula"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <select
            required
            name="model"
            defaultValue=""
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="" disabled>
              Selecciona marca de vehiculo de carga
            </option>
            {TRUCK_BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <input
            required
            name="driverName"
            placeholder="Nombre del conductor"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="submit"
            className="mt-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Guardar usuario
          </button>
        </form>
      </section>
    </main>
  );
}
