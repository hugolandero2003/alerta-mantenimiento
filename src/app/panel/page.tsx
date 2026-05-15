import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { clearVehicleSession, getVehicleSession } from "@/lib/auth";

const WARNING_WINDOW_DAYS = 30;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(date);
}

async function logout() {
  "use server";

  await clearVehicleSession();
  redirect("/");
}

async function createMaintenance(formData: FormData) {
  "use server";

  const session = await getVehicleSession();

  if (!session) {
    redirect("/");
  }

  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueKmRaw = String(formData.get("dueKm") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !dueDateRaw) {
    redirect("/panel?error=Completa+titulo+y+fecha");
  }

  try {
    await prisma.maintenance.create({
      data: {
        vehicleId: session.vehicleId,
        title,
        dueDate: new Date(dueDateRaw),
        dueKm: dueKmRaw ? Number(dueKmRaw) : null,
        description: description || null,
      },
    });
  } catch {
    redirect("/panel?error=No+fue+posible+guardar+en+base+de+datos");
  }

  revalidatePath("/panel");
  redirect("/panel?ok=Mantenimiento+programado");
}

async function markDone(formData: FormData) {
  "use server";

  const session = await getVehicleSession();

  if (!session) {
    redirect("/");
  }

  const maintenanceId = String(formData.get("maintenanceId") ?? "").trim();

  if (!maintenanceId) {
    redirect("/panel?error=Registro+invalido");
  }

  await prisma.maintenance.updateMany({
    where: {
      id: maintenanceId,
      vehicleId: session.vehicleId,
    },
    data: {
      status: "DONE",
      completedAt: new Date(),
    },
  });

  revalidatePath("/panel");
  redirect("/panel?ok=Mantenimiento+marcado+como+atendido");
}

type PanelProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
  }>;
};

type PanelMaintenance = {
  id: string;
  title: string;
  dueDate: Date;
};

export default async function PanelPage({ searchParams }: PanelProps) {
  const session = await getVehicleSession();

  if (!session) {
    redirect("/");
  }

  const now = new Date();
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + WARNING_WINDOW_DAYS);

  let dbUnavailable = false;
  let vehicle: Awaited<ReturnType<typeof prisma.vehicle.findUnique>> = null;
  let dueSoon: PanelMaintenance[] = [];
  let overdue: PanelMaintenance[] = [];

  try {
    [vehicle, dueSoon, overdue] = await Promise.all([
      prisma.vehicle.findUnique({
        where: { id: session.vehicleId },
      }),
      prisma.maintenance.findMany({
        where: {
          vehicleId: session.vehicleId,
          status: { not: "DONE" },
          dueDate: {
            gte: now,
            lte: warningDate,
          },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.maintenance.findMany({
        where: {
          vehicleId: session.vehicleId,
          status: { not: "DONE" },
          dueDate: { lt: now },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);
  } catch {
    dbUnavailable = true;
  }

  if (!dbUnavailable && !vehicle) {
    await clearVehicleSession();
    redirect("/?error=Vehiculo+no+encontrado.+Registra+nuevamente");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-accent/15 blur-2xl" />
        <p className="text-sm uppercase tracking-[0.16em] text-accent-strong">
          Panel de Mantenimiento
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {vehicle?.plate ?? session.plate}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
          Programa mantenimientos por fecha y controla alertas vencidas y
          proximas para este vehiculo.
        </p>

        <form action={logout} className="mt-4">
          <button className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Cerrar sesion
          </button>
        </form>
      </section>

      {params.error && (
        <section className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          {params.error}
        </section>
      )}

      {params.ok && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          {params.ok}
        </section>
      )}

      {dbUnavailable && (
        <section className="rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-800">
          No se pudo conectar a PostgreSQL. Verifica credenciales y servicio.
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-sm text-slate-600">Vehiculo</p>
          <p className="mt-2 text-2xl font-semibold">{vehicle?.model ?? "-"}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">Alertas proximas</p>
          <p className="mt-2 text-3xl font-semibold text-amber-900">
            {dueSoon.length}
          </p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm text-rose-700">Vencidas</p>
          <p className="mt-2 text-3xl font-semibold text-rose-900">
            {overdue.length}
          </p>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <form
          action={createMaintenance}
          className="rounded-2xl border border-line bg-panel p-5"
        >
          <h2 className="text-lg font-semibold">Programar mantenimiento</h2>
          <div className="mt-4 grid gap-3">
            <input
              required
              name="title"
              placeholder="Tipo de mantenimiento"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                type="date"
                name="dueDate"
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                type="number"
                name="dueKm"
                min="0"
                placeholder="Km objetivo"
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <textarea
              name="description"
              rows={3}
              placeholder="Notas de mantenimiento"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
          >
            Guardar mantenimiento
          </button>
        </form>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-900">
            Proximos {WARNING_WINDOW_DAYS} dias
          </h2>
          <ul className="mt-3 space-y-3">
            {dueSoon.length === 0 && (
              <li className="text-sm text-amber-700">
                No hay mantenimientos en ventana de alerta.
              </li>
            )}
            {dueSoon.map((maintenance: PanelMaintenance) => (
              <li
                key={maintenance.id}
                className="rounded-xl border border-amber-200 bg-white/70 p-3"
              >
                <p className="font-medium text-slate-900">{maintenance.title}</p>
                <p className="text-sm text-slate-700">
                  {formatDate(maintenance.dueDate)}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <h2 className="text-lg font-semibold text-rose-900">Vencidos</h2>
        <ul className="mt-3 space-y-3">
          {overdue.length === 0 && (
            <li className="text-sm text-rose-700">Sin mantenimientos vencidos.</li>
          )}
          {overdue.map((maintenance: PanelMaintenance) => (
            <li
              key={maintenance.id}
              className="rounded-xl border border-rose-200 bg-white/70 p-3"
            >
              <p className="font-medium text-slate-900">{maintenance.title}</p>
              <p className="text-sm text-slate-700">{formatDate(maintenance.dueDate)}</p>
              <form action={markDone} className="mt-2">
                <input type="hidden" name="maintenanceId" value={maintenance.id} />
                <button className="text-sm font-semibold text-rose-700 hover:text-rose-900">
                  Marcar como atendido
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
