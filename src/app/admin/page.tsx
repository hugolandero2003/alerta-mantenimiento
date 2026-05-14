import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { clearAdminSession, getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function toInputDate(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function adminLogout() {
  "use server";

  await clearAdminSession();
  redirect("/admin/login");
}

async function createVehicleFromAdmin(formData: FormData) {
  "use server";

  const plate = String(formData.get("plate") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const driverCc = String(formData.get("driverCc") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const driverName = String(formData.get("driverName") ?? "").trim();

  if (!plate || !driverCc || !model || !driverName) {
    redirect("/admin?error=Completa+placa%2C+cedula%2C+marca+y+conductor");
  }

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

  revalidatePath("/admin");
  redirect("/admin?ok=Usuario+guardado");
}

async function updateVehicleFromAdmin(formData: FormData) {
  "use server";

  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const plate = String(formData.get("plate") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const driverCc = String(formData.get("driverCc") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const driverName = String(formData.get("driverName") ?? "").trim();

  if (!vehicleId || !plate || !driverCc || !model || !driverName) {
    redirect("/admin?error=Datos+invalidos+para+actualizar+usuario");
  }

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      plate,
      driverCc,
      model,
      company: driverName,
    },
  });

  revalidatePath("/admin");
  redirect("/admin?ok=Usuario+actualizado");
}

async function deleteVehicleFromAdmin(formData: FormData) {
  "use server";

  const vehicleId = String(formData.get("vehicleId") ?? "").trim();

  if (!vehicleId) {
    redirect("/admin?error=Usuario+invalido");
  }

  await prisma.vehicle.delete({
    where: { id: vehicleId },
  });

  revalidatePath("/admin");
  redirect("/admin?ok=Usuario+eliminado");
}

async function createMaintenanceFromAdmin(formData: FormData) {
  "use server";

  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueKmRaw = String(formData.get("dueKm") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!vehicleId || !title || !dueDateRaw) {
    redirect("/admin?error=Completa+vehiculo%2C+titulo+y+fecha+del+mantenimiento");
  }

  await prisma.maintenance.create({
    data: {
      vehicleId,
      title,
      dueDate: new Date(dueDateRaw),
      dueKm: dueKmRaw ? Number(dueKmRaw) : null,
      description: description || null,
    },
  });

  revalidatePath("/admin");
  redirect("/admin?ok=Mantenimiento+creado");
}

async function updateMaintenanceFromAdmin(formData: FormData) {
  "use server";

  const maintenanceId = String(formData.get("maintenanceId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const dueKmRaw = String(formData.get("dueKm") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!maintenanceId || !title || !dueDateRaw) {
    redirect("/admin?error=Datos+invalidos+para+actualizar+mantenimiento");
  }

  const normalizedStatus =
    status === "SENT" || status === "DONE" ? status : "PENDING";

  await prisma.maintenance.update({
    where: { id: maintenanceId },
    data: {
      title,
      dueDate: new Date(dueDateRaw),
      dueKm: dueKmRaw ? Number(dueKmRaw) : null,
      status: normalizedStatus,
      description: description || null,
      completedAt: normalizedStatus === "DONE" ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  redirect("/admin?ok=Mantenimiento+actualizado");
}

async function deleteMaintenanceFromAdmin(formData: FormData) {
  "use server";

  const maintenanceId = String(formData.get("maintenanceId") ?? "").trim();

  if (!maintenanceId) {
    redirect("/admin?error=Mantenimiento+invalido");
  }

  await prisma.maintenance.delete({
    where: { id: maintenanceId },
  });

  revalidatePath("/admin");
  redirect("/admin?ok=Mantenimiento+eliminado");
}

type AdminProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminProps) {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect("/admin/login");
  }

  const params = await searchParams;

  let vehicles: Awaited<
    ReturnType<typeof prisma.vehicle.findMany>
  > = [];
  let maintenances: Awaited<
    ReturnType<typeof prisma.maintenance.findMany>
  > = [];
  let dbUnavailable = false;

  try {
    [vehicles, maintenances] = await Promise.all([
      prisma.vehicle.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          plate: true,
          driverCc: true,
          model: true,
          company: true,
          createdAt: true,
          _count: {
            select: {
              maintenances: true,
            },
          },
          maintenances: {
            where: {
              status: { not: "DONE" },
            },
            orderBy: {
              dueDate: "asc",
            },
            take: 1,
            select: {
              title: true,
              dueDate: true,
            },
          },
        },
      }),
      prisma.maintenance.findMany({
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          dueDate: true,
          dueKm: true,
          description: true,
          status: true,
          vehicleId: true,
          vehicle: {
            select: {
              plate: true,
            },
          },
        },
      }),
    ]);
  } catch {
    dbUnavailable = true;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-accent-strong">
              Administracion
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Usuarios registrados
            </h1>
            <p className="mt-2 text-sm text-slate-700 sm:text-base">
              Gestiona usuarios, mantenimientos, y descarga reportes desde este
              panel privado.
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Sesion admin: {adminSession.username}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ir al login principal
            </Link>
            <a
              href="/api/admin/report"
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Descargar reporte CSV
            </a>
            <form action={adminLogout}>
              <button
                type="submit"
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Cerrar sesion admin
              </button>
            </form>
          </div>
        </div>
      </section>

      {dbUnavailable && (
        <section className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          No fue posible conectar con la base de datos.
        </section>
      )}

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

      {!dbUnavailable && (
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Crear o actualizar usuario</h2>
          <p className="mt-1 text-sm text-slate-600">
            Crea usuarios nuevos para login o actualiza por placa existente.
          </p>
          <form action={createVehicleFromAdmin} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              required
              name="plate"
              placeholder="Placa"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm uppercase outline-none focus:border-accent"
            />
            <input
              required
              name="driverCc"
              placeholder="Cedula"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              required
              name="model"
              placeholder="Marca"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              required
              name="driverName"
              placeholder="Conductor"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong sm:col-span-2 lg:col-span-4"
            >
              Guardar usuario
            </button>
          </form>
        </section>
      )}

      {!dbUnavailable && (
        <section className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">Usuarios y estado de mantenimiento</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Placa</th>
                  <th className="px-4 py-3 font-semibold">Cedula</th>
                  <th className="px-4 py-3 font-semibold">Modelo</th>
                  <th className="px-4 py-3 font-semibold">Conductor</th>
                  <th className="px-4 py-3 font-semibold">Programados</th>
                  <th className="px-4 py-3 font-semibold">Proximo mantenimiento</th>
                  <th className="px-4 py-3 font-semibold">Creado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-600">
                      Aun no hay usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-t border-line">
                      <td className="px-4 py-3 font-semibold">{vehicle.plate}</td>
                      <td className="px-4 py-3">{vehicle.driverCc}</td>
                      <td className="px-4 py-3">{vehicle.model}</td>
                      <td className="px-4 py-3">{vehicle.company || "-"}</td>
                      <td className="px-4 py-3">{vehicle._count.maintenances}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {vehicle.maintenances[0]
                          ? `${vehicle.maintenances[0].title} - ${formatDateTime(vehicle.maintenances[0].dueDate)}`
                          : "Sin pendientes"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {vehicle.createdAt.toLocaleString("es-CO")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[220px] flex-wrap gap-2">
                          <form action={updateVehicleFromAdmin} className="flex w-full flex-wrap gap-2">
                            <input type="hidden" name="vehicleId" value={vehicle.id} />
                            <input
                              required
                              name="plate"
                              defaultValue={vehicle.plate}
                              className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs uppercase outline-none focus:border-accent"
                            />
                            <input
                              required
                              name="driverCc"
                              defaultValue={vehicle.driverCc}
                              className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                            />
                            <input
                              required
                              name="model"
                              defaultValue={vehicle.model}
                              className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                            />
                            <input
                              required
                              name="driverName"
                              defaultValue={vehicle.company || ""}
                              className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                            />
                            <button className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100">
                              Actualizar
                            </button>
                          </form>
                          <form action={deleteVehicleFromAdmin}>
                            <input type="hidden" name="vehicleId" value={vehicle.id} />
                            <button className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!dbUnavailable && (
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold">CRUD de mantenimientos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Crea, actualiza estado y elimina mantenimientos desde administracion.
          </p>

          <form action={createMaintenanceFromAdmin} className="mt-4 grid gap-3 lg:grid-cols-6">
            <select
              required
              name="vehicleId"
              defaultValue=""
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent lg:col-span-2"
            >
              <option value="" disabled>
                Selecciona vehiculo
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.company || "Conductor"}
                </option>
              ))}
            </select>
            <input
              required
              name="title"
              placeholder="Titulo"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent lg:col-span-2"
            />
            <input
              required
              type="date"
              name="dueDate"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              type="number"
              min="0"
              name="dueKm"
              placeholder="Km objetivo"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <textarea
              name="description"
              rows={2}
              placeholder="Descripcion (opcional)"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent lg:col-span-5"
            />
            <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong lg:col-span-1">
              Crear
            </button>
          </form>

          <div className="mt-5 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vehiculo</th>
                  <th className="px-4 py-3 font-semibold">Titulo</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Km</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Descripcion</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {maintenances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-600">
                      No hay mantenimientos registrados.
                    </td>
                  </tr>
                ) : (
                  maintenances.map((maintenance) => (
                    <tr key={maintenance.id} className="border-t border-line">
                      <td className="px-4 py-3 font-semibold">{maintenance.vehicle.plate}</td>
                      <td className="px-4 py-3">{maintenance.title}</td>
                      <td className="px-4 py-3">{formatDateTime(maintenance.dueDate)}</td>
                      <td className="px-4 py-3">{maintenance.dueKm ?? "-"}</td>
                      <td className="px-4 py-3">{maintenance.status}</td>
                      <td className="px-4 py-3">{maintenance.description || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[260px] flex-wrap gap-2">
                          <form action={updateMaintenanceFromAdmin} className="flex w-full flex-wrap gap-2">
                            <input type="hidden" name="maintenanceId" value={maintenance.id} />
                            <input
                              required
                              name="title"
                              defaultValue={maintenance.title}
                              className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                            />
                            <input
                              required
                              type="date"
                              name="dueDate"
                              defaultValue={toInputDate(maintenance.dueDate)}
                              className="rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                            />
                            <input
                              type="number"
                              min="0"
                              name="dueKm"
                              defaultValue={maintenance.dueKm ?? ""}
                              className="w-[90px] rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                            />
                            <select
                              name="status"
                              defaultValue={maintenance.status}
                              className="rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="SENT">SENT</option>
                              <option value="DONE">DONE</option>
                            </select>
                            <input
                              name="description"
                              defaultValue={maintenance.description || ""}
                              placeholder="Descripcion"
                              className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                            />
                            <button className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100">
                              Actualizar
                            </button>
                          </form>
                          <form action={deleteMaintenanceFromAdmin}>
                            <input type="hidden" name="maintenanceId" value={maintenance.id} />
                            <button className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
