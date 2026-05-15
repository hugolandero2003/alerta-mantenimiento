import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { clearVehicleSession, getVehicleSession } from "@/lib/auth";
import { processDueSmsAlarms } from "@/lib/alarms";
import { normalizeColombianPhoneNumber } from "@/lib/sms";
import FlashMessage from "./flash-message";
import AlarmPoller from "./alarm-poller";
import FuelCostCard from "./fuel-cost-card";

const WARNING_WINDOW_DAYS = 30;

const PESV_MAINTENANCE_TYPES = [
  "Inspeccion preoperacional",
  "Cambio de aceite y filtros",
  "Sistema de frenos",
  "Sistema de direccion",
  "Suspension",
  "Llantas y alineacion",
  "Sistema electrico y bateria",
  "Sistema de luces y senalizacion",
  "Motor y refrigeracion",
  "Transmision y embrague",
  "Sistema de escape",
  "Carroceria y puntos de anclaje",
  "Sistema neumatico",
  "Revision tecnicomecanica",
  "Elementos de seguridad (botiquin, extintor, conos)",
];

const PESV_SYSTEMS = [
  "Frenos",
  "Direccion",
  "Suspension",
  "Llantas",
  "Motor",
  "Sistema electrico",
  "Luces y senalizacion",
  "Transmision",
  "Carroceria y carga",
  "Seguridad activa y pasiva",
];

const SERVICE_MODALITIES = ["Preventivo", "Predictivo", "Correctivo", "Inspeccion reglamentaria"];

const OIL_CHANGE_INTERVAL_BY_BRAND: Record<string, number> = {
  Chevrolet: 8000,
  Ford: 7500,
  Foton: 10000,
  Freightliner: 12000,
  Hino: 10000,
  Hyundai: 10000,
  Isuzu: 10000,
  Iveco: 12000,
  JAC: 8000,
  "Mercedes-Benz": 10000,
  Nissan: 8000,
  Renault: 10000,
  Scania: 15000,
  Toyota: 10000,
  Volkswagen: 10000,
  Volvo: 15000,
};

type PanelMaintenance = {
  id: string;
  title: string;
  dueDate: Date;
};

type OilChangePlan = {
  brand: string;
  intervalKm: number;
  currentKm: number | null;
  nextKm: number | null;
  remainingKm: number | null;
};

type PanelProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(date);
}

function extractVehicleBrand(model: string) {
  const cleanModel = model.trim();

  if (!cleanModel) {
    return "";
  }

  return cleanModel.split(" ")[0] ?? "";
}

function getOilChangeInterval(brand: string) {
  return OIL_CHANGE_INTERVAL_BY_BRAND[brand] ?? 10000;
}

function buildOilChangePlan(vehicle: NonNullable<Awaited<ReturnType<typeof prisma.vehicle.findUnique>>>) {
  const brand = extractVehicleBrand(vehicle.model);
  const intervalKm = getOilChangeInterval(brand);
  const currentKm = vehicle.currentKm ?? null;

  if (currentKm === null) {
    return {
      brand,
      intervalKm,
      currentKm,
      nextKm: null,
      remainingKm: null,
    } satisfies OilChangePlan;
  }

  const nextKm = Math.ceil(currentKm / intervalKm) * intervalKm;
  const remainingKm = Math.max(nextKm - currentKm, 0);

  return {
    brand,
    intervalKm,
    currentKm,
    nextKm,
    remainingKm,
  } satisfies OilChangePlan;
}

async function updatePhoneNumber(formData: FormData) {
  "use server";

  const session = await getVehicleSession();

  if (!session) {
    redirect("/");
  }

  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
  const normalizedPhoneNumber = normalizeColombianPhoneNumber(phoneNumber);

  if (!normalizedPhoneNumber) {
    redirect("/panel?error=Por+favor+ingresa+un+numero+valido");
  }

  try {
    await prisma.vehicle.update({
      where: { id: session.vehicleId },
      data: { phoneNumber: normalizedPhoneNumber },
    });
  } catch {
    redirect("/panel?error=No+fue+posible+guardar+el+numero");
  }

  revalidatePath("/panel");
  redirect("/panel?ok=Numero+SMS+actualizado");
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

  const maintenanceType = String(formData.get("maintenanceType") ?? "").trim();
  const pesvSystem = String(formData.get("pesvSystem") ?? "").trim();
  const serviceModality = String(formData.get("serviceModality") ?? "").trim();
  const titleNote = String(formData.get("titleNote") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const currentKmRaw = String(formData.get("currentKm") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const notificationChannel = String(formData.get("notificationChannel") ?? "SMS").trim();

  if (!maintenanceType || !pesvSystem || !serviceModality || !dueDateRaw) {
    redirect("/panel?error=Completa+tipo+PESV%2C+sistema%2C+modalidad+y+fecha");
  }

  if (notificationChannel !== "SMS") {
    redirect("/panel?error=WhatsApp+esta+deshabilitado+por+ahora.+Usa+SMS");
  }

  const finalTitle = titleNote ? `${maintenanceType} - ${titleNote}` : maintenanceType;
  const finalDescription = [
    `Sistema PESV: ${pesvSystem}`,
    `Modalidad: ${serviceModality}`,
    description,
  ]
    .filter(Boolean)
    .join(" | ");

  const scheduledAt = new Date(dueDateRaw);

  try {
    await prisma.maintenance.create({
      data: {
        vehicleId: session.vehicleId,
        title: finalTitle,
        dueDate: scheduledAt,
        dueKm: currentKmRaw ? Number(currentKmRaw) : null,
        description: finalDescription || null,
        alarmAt: scheduledAt,
        notificationChannel: "SMS",
      },
    });

    if (currentKmRaw) {
      await prisma.vehicle.update({
        where: { id: session.vehicleId },
        data: { currentKm: Number(currentKmRaw) },
      });
    }
  } catch {
    redirect("/panel?error=No+fue+posible+guardar+en+base+de+datos");
  }

  await processDueSmsAlarms();

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

  await processDueSmsAlarms();

  const oilChangePlan = vehicle ? buildOilChangePlan(vehicle) : null;

  const params = await searchParams;

  return (
    <main className="panel-water-shell flex w-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        <section className="panel-water-card rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.16em] text-accent-strong">
                Panel de mantenimiento
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="panel-water-pill w-fit px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-900 sm:text-sm">
                  {vehicle?.plate ?? session.plate}
                </div>
                <span className="inline-flex w-fit rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Operativo
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Conductor</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {vehicle?.driverName ?? vehicle?.company ?? "No registrado"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Cedula</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {vehicle?.driverCc ?? "No registrada"}
                  </p>
                </div>
              </div>
              <div className="max-w-3xl space-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Dashboard de mantenimiento
                </h1>
                <p className="text-sm text-slate-600 sm:text-base">
                  Gestiona programaciones, alertas y notificaciones desde una vista limpia y priorizada.
                </p>
              </div>
            </div>

            <form action={logout} className="shrink-0 self-start lg:self-auto">
              <button className="btn-glass btn-glass-neutral px-4 py-2 text-sm font-medium">
                Cerrar sesion
              </button>
            </form>
          </div>
        </section>

        {params.error && <FlashMessage message={params.error} type="error" />}
        {params.ok && <FlashMessage message={params.ok} type="success" />}

        {dbUnavailable && (
          <section className="panel-water-card panel-water-card-amber rounded-2xl p-4 text-sm text-orange-800">
            No se pudo conectar a PostgreSQL. Verifica credenciales y servicio.
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="panel-water-card panel-water-card-teal rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Vehiculo</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{vehicle?.model ?? "-"}</p>
            <p className="mt-1 text-sm text-slate-600">{vehicle?.plate ?? session.plate}</p>
          </article>

          <article className="panel-water-card panel-water-card-sky rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Alertas proximas</p>
            <p className="panel-water-stat-value mt-2 text-3xl font-semibold text-cyan-900">
              {dueSoon.length}
            </p>
            <p className="mt-1 text-sm text-slate-600">Dentro de los proximos {WARNING_WINDOW_DAYS} dias</p>
          </article>

          <article className="panel-water-card panel-water-card-indigo rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Vencidas</p>
            <p className="panel-water-stat-value mt-2 text-3xl font-semibold text-indigo-900">
              {overdue.length}
            </p>
            <p className="mt-1 text-sm text-slate-600">Pendientes de cierre manual</p>
          </article>

          <article className="panel-water-card panel-water-card-rose rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">SMS activo</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {vehicle?.phoneNumber ? vehicle.phoneNumber : "Sin numero"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {vehicle?.phoneNumber ? "Canal listo para alarmas" : "Registra un numero para recibir avisos"}
            </p>
          </article>
        </section>

        <section className="panel-water-card rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cambio de aceite</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Próximo servicio según manual</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Este cálculo usa el kilometraje actual del vehículo y un intervalo de referencia por marca.
              </p>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              {oilChangePlan?.brand || "Sin marca"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Km actual</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {oilChangePlan && oilChangePlan.currentKm !== null ? oilChangePlan.currentKm.toLocaleString("es-CO") : "Sin dato"}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Intervalo manual</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {oilChangePlan?.intervalKm ? `${oilChangePlan.intervalKm.toLocaleString("es-CO")} km` : "-"}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Próximo cambio</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {oilChangePlan && oilChangePlan.nextKm !== null ? oilChangePlan.nextKm.toLocaleString("es-CO") : "Registra el km"}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Faltan</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {oilChangePlan && oilChangePlan.remainingKm !== null ? `${oilChangePlan.remainingKm.toLocaleString("es-CO")} km` : "-"}
              </p>
            </article>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Referencia estimada: puede variar según el tipo de aceite, ruta y condiciones de operación.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <form action={createMaintenance} className="panel-water-card rounded-3xl p-5 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-white/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Programar mantenimiento</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Captura la alerta una sola vez y el sistema se encarga del seguimiento.
                </p>
              </div>
              <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                Notificacion por SMS
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                type="datetime-local"
                name="dueDate"
                className="field-glass w-full rounded-xl px-3 py-2.5 text-sm"
              />
              <select
                name="notificationChannel"
                defaultValue="SMS"
                className="field-glass w-full rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="SMS">SMS</option>
                <option value="WHATSAPP" disabled>
                  WhatsApp deshabilitado
                </option>
              </select>
              <select
                required
                name="maintenanceType"
                defaultValue=""
                className="field-glass w-full rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Tipo de mantenimiento (PESV)
                </option>
                {PESV_MAINTENANCE_TYPES.map((item) => (
                  <option key={`panel-type-${item}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                required
                name="pesvSystem"
                defaultValue=""
                className="field-glass w-full rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Parte del vehiculo a revisar
                </option>
                {PESV_SYSTEMS.map((item) => (
                  <option key={`panel-system-${item}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                required
                name="serviceModality"
                defaultValue=""
                className="field-glass w-full rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="" disabled>
                  Tipo de servicio
                </option>
                {SERVICE_MODALITIES.map((item) => (
                  <option key={`panel-modality-${item}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <input
                name="titleNote"
                placeholder="Observacion corta (opcional)"
                className="field-glass w-full rounded-xl px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                name="currentKm"
                min="0"
                placeholder="Km actual"
                className="field-glass w-full rounded-xl px-3 py-2.5 text-sm"
              />
              <textarea
                name="description"
                rows={4}
                placeholder="Notas de mantenimiento"
                className="field-glass w-full rounded-xl px-3 py-2.5 text-sm sm:col-span-2"
              />
            </div>

            <button
              type="submit"
              className="btn-glass btn-glass-primary mt-4 w-full px-4 py-2.5 text-sm font-medium sm:w-auto"
            >
              Guardar mantenimiento
            </button>
          </form>

          <div className="grid gap-6">
            <article className="panel-water-card panel-water-card-amber rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-amber-900">Proximos {WARNING_WINDOW_DAYS} dias</h2>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Mantenimientos ya ubicados en ventana de alerta
                  </p>
                </div>
                <span className="rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs font-semibold text-amber-800">
                  {dueSoon.length}
                </span>
              </div>
              <ul className="mt-4 max-h-64 space-y-2 overflow-auto pr-1">
                {dueSoon.length === 0 && (
                  <li className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-sm text-amber-700">
                    No hay mantenimientos en ventana de alerta.
                  </li>
                )}
                {dueSoon.map((maintenance: PanelMaintenance) => (
                  <li key={maintenance.id} className="panel-water-pill panel-water-pill-tight">
                    <p className="font-medium text-slate-900">{maintenance.title}</p>
                    <p className="text-sm text-slate-700">{formatDate(maintenance.dueDate)}</p>
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel-water-card panel-water-card-rose rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-rose-900">Vencidos</h2>
                  <p className="mt-0.5 text-xs text-rose-700">
                    Mantenimientos atrasados que puedes cerrar manualmente
                  </p>
                </div>
                <span className="rounded-full border border-rose-200 bg-white/70 px-3 py-1 text-xs font-semibold text-rose-800">
                  {overdue.length}
                </span>
              </div>
              <ul className="mt-4 max-h-64 space-y-2 overflow-auto pr-1">
                {overdue.length === 0 && (
                  <li className="rounded-xl border border-rose-200 bg-white/70 px-3 py-2 text-sm text-rose-700">
                    Sin mantenimientos vencidos.
                  </li>
                )}
                {overdue.map((maintenance: PanelMaintenance) => (
                  <li key={maintenance.id} className="panel-water-pill panel-water-pill-tight">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{maintenance.title}</p>
                        <p className="text-sm text-slate-700">{formatDate(maintenance.dueDate)}</p>
                      </div>
                      <form action={markDone} className="shrink-0">
                        <input type="hidden" name="maintenanceId" value={maintenance.id} />
                        <button className="btn-glass btn-glass-danger whitespace-nowrap px-2.5 py-1 text-xs font-semibold">
                          Atendido
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <section className="panel-water-card panel-water-card-sky rounded-3xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">Notificaciones por SMS</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    {vehicle?.phoneNumber
                      ? `Numero registrado: ${vehicle.phoneNumber}`
                      : "Ningún numero registrado. Agrega uno para recibir alarmas por SMS."}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    WhatsApp permanece deshabilitado por el momento.
                  </p>
                </div>
                <span className="rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Activo
                </span>
              </div>
              <form action={updatePhoneNumber} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="tel"
                  name="phoneNumber"
                  placeholder="Ej: +57 3156622814"
                  className="field-glass w-full flex-1 rounded-xl px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="btn-glass btn-glass-primary w-full px-4 py-2 text-sm font-medium sm:w-auto"
                >
                  Actualizar
                </button>
              </form>
            </section>
          </div>
        </section>

        <FuelCostCard />

        <AlarmPoller />
      </div>
    </main>
  );
}
