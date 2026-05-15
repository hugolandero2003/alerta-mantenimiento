import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { clearAdminSession, getAdminSession } from "@/lib/auth";
import { VehicleEditForm, VehicleRegisterForm } from "../home-auth-forms";

export const dynamic = "force-dynamic";

const vehicleAdminSelect = {
  id: true,
  plate: true,
  driverCc: true,
  model: true,
  company: true,
  commercialLine: true,
  cargoBodyType: true,
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
} as const;

const maintenanceAdminSelect = {
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
} as const;

type VehicleAdminRow = {
  id: string;
  plate: string;
  driverCc: string;
  model: string;
  company: string | null;
  commercialLine: string | null;
  cargoBodyType: string | null;
  createdAt: Date;
  _count: {
    maintenances: number;
  };
  maintenances: Array<{
    title: string;
    dueDate: Date;
  }>;
};

type MaintenanceAdminRow = {
  id: string;
  title: string;
  dueDate: Date;
  dueKm: number | null;
  description: string | null;
  status: "PENDING" | "SENT" | "DONE";
  vehicleId: string;
  vehicle: {
    plate: string;
  };
};

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

const HEAVY_TRUCK_LINES = [
  "Camion rigido",
  "Tractocamion",
  "Furgon seco",
  "Furgon refrigerado",
  "Estacado",
  "Sencillo 2 ejes",
  "Doble troque",
  "Volqueta",
  "Cisterna",
];

const MEDIUM_TRUCK_LINES = [
  "Turbo",
  "Camion liviano",
  "Furgon seco",
  "Furgon refrigerado",
  "Estacado",
  "Cava",
  "Reparto urbano",
];

const PICKUP_CARGO_LINES = [
  "Pickup de carga",
  "Chasis cabina",
  "Estacas liviano",
  "Furgon liviano",
  "Refrigerado liviano",
];

const CARGO_BODY_TYPES_BY_BRAND: Record<string, string[]> = {
  "Ashok Leyland": HEAVY_TRUCK_LINES,
  BharatBenz: HEAVY_TRUCK_LINES,
  Chevrolet: [...MEDIUM_TRUCK_LINES, ...PICKUP_CARGO_LINES],
  DAF: HEAVY_TRUCK_LINES,
  Dongfeng: [...MEDIUM_TRUCK_LINES, ...HEAVY_TRUCK_LINES],
  Eicher: MEDIUM_TRUCK_LINES,
  Faw: HEAVY_TRUCK_LINES,
  Fiat: PICKUP_CARGO_LINES,
  Ford: [...MEDIUM_TRUCK_LINES, ...PICKUP_CARGO_LINES],
  Foton: [...MEDIUM_TRUCK_LINES, ...HEAVY_TRUCK_LINES],
  Freightliner: HEAVY_TRUCK_LINES,
  GMC: [...MEDIUM_TRUCK_LINES, ...PICKUP_CARGO_LINES],
  Hino: [...MEDIUM_TRUCK_LINES, ...HEAVY_TRUCK_LINES],
  Hyundai: [...MEDIUM_TRUCK_LINES, ...PICKUP_CARGO_LINES],
  International: HEAVY_TRUCK_LINES,
  Isuzu: MEDIUM_TRUCK_LINES,
  Iveco: [...MEDIUM_TRUCK_LINES, ...HEAVY_TRUCK_LINES],
  JAC: MEDIUM_TRUCK_LINES,
  Kenworth: HEAVY_TRUCK_LINES,
  Mack: HEAVY_TRUCK_LINES,
  MAN: HEAVY_TRUCK_LINES,
  Maxus: MEDIUM_TRUCK_LINES,
  Mazda: PICKUP_CARGO_LINES,
  "Mercedes-Benz": [...MEDIUM_TRUCK_LINES, ...HEAVY_TRUCK_LINES],
  "Mitsubishi Fuso": MEDIUM_TRUCK_LINES,
  Nissan: [...MEDIUM_TRUCK_LINES, ...PICKUP_CARGO_LINES],
  Peterbilt: HEAVY_TRUCK_LINES,
  Ram: PICKUP_CARGO_LINES,
  "Renault Trucks": HEAVY_TRUCK_LINES,
  Scania: HEAVY_TRUCK_LINES,
  Shacman: HEAVY_TRUCK_LINES,
  Sinotruk: HEAVY_TRUCK_LINES,
  Toyota: PICKUP_CARGO_LINES,
  "UD Trucks": HEAVY_TRUCK_LINES,
  Volkswagen: [...MEDIUM_TRUCK_LINES, ...HEAVY_TRUCK_LINES],
  Volvo: HEAVY_TRUCK_LINES,
  "Western Star": HEAVY_TRUCK_LINES,
  Otro: [
    "Turbo",
    "Camion rigido",
    "Tractocamion",
    "Furgon seco",
    "Furgon refrigerado",
    "Estacado",
    "Volqueta",
    "Cisterna",
  ],
};

const DEFAULT_COMMERCIAL_LINES = ["No especificada"];

const COMMERCIAL_LINES_BY_BRAND: Record<string, string[]> = {
  "Ashok Leyland": ["Partner", "Ecomet", "Captain"],
  BharatBenz: ["814", "1017", "1217", "2823"],
  Chevrolet: ["NHR", "NKR", "FRR"],
  DAF: ["CF", "XF", "XG"],
  Dongfeng: ["Captain", "KR", "KC"],
  Eicher: ["Pro 1049", "Pro 1075", "Pro 3015"],
  Faw: ["Tiger V", "J6P"],
  Fiat: ["Ducato", "Fiorino"],
  Ford: ["F-350", "F-4000", "Cargo 1723"],
  Foton: ["Aumark", "Ollin", "Auman"],
  Freightliner: ["M2 106", "M2 112", "Cascadia"],
  GMC: ["W3500", "W4500", "W5500"],
  Hino: ["Serie 300", "Serie 500", "Serie 700"],
  Hyundai: ["HD65", "HD78", "HD120"],
  International: ["4300", "4400", "LT"],
  Isuzu: ["NHR", "NKR", "NPR", "NQR", "FRR", "FVR"],
  Iveco: ["Daily", "Tector", "Hi-Way"],
  JAC: ["X200", "N120", "N200"],
  Kenworth: ["T370", "T800", "T680"],
  Mack: ["MD", "Pinnacle", "Granite"],
  MAN: ["TGL", "TGM", "TGX"],
  Maxus: ["T60", "Deliver 9"],
  Mazda: ["BT-50", "Titan"],
  "Mercedes-Benz": ["Accelo", "Atego", "Actros"],
  "Mitsubishi Fuso": ["Canter", "Fighter"],
  Nissan: ["Frontier NP300", "Cabstar", "UD Croner"],
  Peterbilt: ["337", "389", "579"],
  Ram: ["700", "1500", "4000"],
  "Renault Trucks": ["D", "C", "T"],
  Scania: ["P", "G", "R"],
  Shacman: ["F3000", "X3000"],
  Sinotruk: ["HOWO 4x2", "HOWO 6x4"],
  Toyota: ["Hilux", "Dyna"],
  "UD Trucks": ["Croner", "Quester"],
  Volkswagen: ["Delivery", "Constellation"],
  Volvo: ["VM", "FM", "FH"],
  "Western Star": ["4700", "4900", "57X"],
  Otro: ["NHR/NPR equivalente", "Mediano", "Pesado"],
};

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

const SERVICE_MODALITIES = [
  "Preventivo",
  "Predictivo",
  "Correctivo",
  "Inspeccion reglamentaria",
];

function toInputDate(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function parseMaintenanceMeta(description: string | null, key: "Sistema PESV" | "Modalidad") {
  if (!description) {
    return "-";
  }

  const parts = description.split("|").map((item) => item.trim());
  const target = parts.find((part) => part.startsWith(`${key}:`));
  return target ? target.replace(`${key}:`, "").trim() : "-";
}

function parseVehicleModel(model: string) {
  const cleanModel = model.trim();
  const brand =
    TRUCK_BRANDS.find((item) => cleanModel === item || cleanModel.startsWith(`${item} `)) ?? "";

  const [leftPart, cargoPart] = cleanModel.split(" - ");
  const commercialLine = brand ? leftPart.replace(brand, "").trim() : "";

  return {
    brand,
    commercialLine,
    cargoBodyType: cargoPart?.trim() ?? "",
  };
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
  const commercialLine = String(formData.get("commercialLine") ?? "").trim();
  const cargoBodyType = String(formData.get("cargoBodyType") ?? "").trim();

  if (!plate || !driverCc || !model || !driverName || !commercialLine || !cargoBodyType) {
    redirect("/admin?error=Completa+todos+los+campos+del+formulario");
  }

  if (!TRUCK_BRANDS.includes(model)) {
    redirect("/admin?error=Selecciona+una+marca+valida");
  }

  const validCommercialLines = COMMERCIAL_LINES_BY_BRAND[model] ?? DEFAULT_COMMERCIAL_LINES;
  const validCargoBodyTypes = CARGO_BODY_TYPES_BY_BRAND[model] ?? [];

  if (!validCommercialLines.includes(commercialLine)) {
    redirect("/admin?error=Selecciona+una+linea+comercial+valida");
  }

  if (!validCargoBodyTypes.includes(cargoBodyType)) {
    redirect("/admin?error=Selecciona+una+carroceria+valida");
  }

  const vehicleModel = `${model} ${commercialLine} - ${cargoBodyType}`;

  await prisma.vehicle.upsert({
    where: { plate },
    create: {
      plate,
      driverCc,
      model: vehicleModel,
      company: driverName,
      driverName,
      commercialLine,
      cargoBodyType,
    },
    update: {
      driverCc,
      model: vehicleModel,
      company: driverName,
      driverName,
      commercialLine,
      cargoBodyType,
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
  const commercialLine = String(formData.get("commercialLine") ?? "").trim();
  const cargoBodyType = String(formData.get("cargoBodyType") ?? "").trim();
  const driverName = String(formData.get("driverName") ?? "").trim();

  if (!vehicleId || !plate || !driverCc || !model || !commercialLine || !cargoBodyType || !driverName) {
    redirect("/admin?error=Datos+invalidos+para+actualizar+usuario");
  }

  if (!TRUCK_BRANDS.includes(model)) {
    redirect("/admin?error=Selecciona+una+marca+valida");
  }

  const validCommercialLines = COMMERCIAL_LINES_BY_BRAND[model] ?? DEFAULT_COMMERCIAL_LINES;
  const validCargoBodyTypes = CARGO_BODY_TYPES_BY_BRAND[model] ?? [];

  if (!validCommercialLines.includes(commercialLine)) {
    redirect("/admin?error=Selecciona+una+linea+comercial+valida");
  }

  if (!validCargoBodyTypes.includes(cargoBodyType)) {
    redirect("/admin?error=Selecciona+una+carroceria+valida");
  }

  const vehicleModel = `${model} ${commercialLine} - ${cargoBodyType}`;

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      plate,
      driverCc,
      model: vehicleModel,
      company: driverName,
      driverName,
      commercialLine,
      cargoBodyType,
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
  const maintenanceType = String(formData.get("maintenanceType") ?? "").trim();
  const pesvSystem = String(formData.get("pesvSystem") ?? "").trim();
  const serviceModality = String(formData.get("serviceModality") ?? "").trim();
  const titleNote = String(formData.get("titleNote") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const currentKmRaw = String(formData.get("currentKm") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!vehicleId || !maintenanceType || !pesvSystem || !serviceModality || !dueDateRaw) {
    redirect("/admin?error=Completa+vehiculo%2C+tipo+PESV%2C+sistema%2C+modalidad+y+fecha");
  }

  const finalTitle = titleNote ? `${maintenanceType} - ${titleNote}` : maintenanceType;

  const finalDescription = [
    `Sistema PESV: ${pesvSystem}`,
    `Modalidad: ${serviceModality}`,
    description,
  ]
    .filter(Boolean)
    .join(" | ");

  await prisma.maintenance.create({
    data: {
      vehicleId,
      title: finalTitle,
      dueDate: new Date(dueDateRaw),
      dueKm: currentKmRaw ? Number(currentKmRaw) : null,
      description: finalDescription || null,
    },
  });

  revalidatePath("/admin");
  redirect("/admin?ok=Mantenimiento+creado");
}

async function updateMaintenanceFromAdmin(formData: FormData) {
  "use server";

  const maintenanceId = String(formData.get("maintenanceId") ?? "").trim();
  const maintenanceType = String(formData.get("maintenanceType") ?? "").trim();
  const serviceModality = String(formData.get("serviceModality") ?? "").trim();
  const pesvSystem = String(formData.get("pesvSystem") ?? "").trim();
  const titleNote = String(formData.get("titleNote") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const currentKmRaw = String(formData.get("currentKm") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!maintenanceId || !maintenanceType || !serviceModality || !pesvSystem || !dueDateRaw) {
    redirect("/admin?error=Datos+invalidos+para+actualizar+mantenimiento");
  }

  const finalTitle = titleNote ? `${maintenanceType} - ${titleNote}` : maintenanceType;
  const finalDescription = [
    `Sistema PESV: ${pesvSystem}`,
    `Modalidad: ${serviceModality}`,
    description,
  ]
    .filter(Boolean)
    .join(" | ");

  const normalizedStatus =
    status === "SENT" || status === "DONE" ? status : "PENDING";

  await prisma.maintenance.update({
    where: { id: maintenanceId },
    data: {
      title: finalTitle,
      dueDate: new Date(dueDateRaw),
      dueKm: currentKmRaw ? Number(currentKmRaw) : null,
      status: normalizedStatus,
      description: finalDescription || null,
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

  let vehicles: VehicleAdminRow[] = [];
  let maintenances: MaintenanceAdminRow[] = [];
  let dbUnavailable = false;

  try {
    [vehicles, maintenances] = await Promise.all([
      prisma.vehicle.findMany({
        orderBy: { createdAt: "desc" },
        select: vehicleAdminSelect,
      }),
      prisma.maintenance.findMany({
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        select: maintenanceAdminSelect,
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
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Sesion admin: {adminSession.username}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="admin-water-button admin-water-button-neutral"
            >
              Ir al login principal
            </Link>
            <a
              href="/api/admin/report"
              className="admin-water-button admin-water-button-success"
            >
              Descargar reporte CSV
            </a>
            <form action={adminLogout}>
              <button
                type="submit"
                className="admin-water-button admin-water-button-danger"
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
        <details open className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <summary className="admin-section-summary cursor-pointer text-lg font-semibold text-slate-800">
            Registrar usuario
          </summary>
          <VehicleRegisterForm
            action={createVehicleFromAdmin}
            brands={TRUCK_BRANDS}
            commercialLinesByBrand={COMMERCIAL_LINES_BY_BRAND}
            cargoBodyTypesByBrand={CARGO_BODY_TYPES_BY_BRAND}
          />
        </details>
      )}

      {!dbUnavailable && (
        <details open className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
          <summary className="admin-section-summary cursor-pointer border-b border-line px-4 py-3 text-lg font-semibold text-slate-800">
            Usuarios y estado de mantenimiento
          </summary>
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vehiculo</th>
                  <th className="px-4 py-3 font-semibold">Conductor</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Proximo mantenimiento</th>
                  <th className="px-4 py-3 font-semibold">Registro</th>
                  <th className="px-4 py-3 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-600">
                      Aun no hay usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle, index) => {
                    const parsedModel = parseVehicleModel(vehicle.model);
                    const selectedBrand = parsedModel.brand;
                    const selectedCommercialLine = vehicle.commercialLine ?? parsedModel.commercialLine;
                    const selectedCargoBodyType = vehicle.cargoBodyType ?? parsedModel.cargoBodyType;

                    return (
                    <tr key={vehicle.id} className="border-t border-line align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{vehicle.plate}</p>
                        <p className="text-xs text-slate-500">{selectedBrand || vehicle.model}</p>
                        <p className="text-xs text-slate-500">
                          {selectedCommercialLine || "-"} / {selectedCargoBodyType || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{vehicle.company || "-"}</p>
                        <p className="text-xs text-slate-500">CC: {vehicle.driverCc}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                          {vehicle._count.maintenances} programados
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {vehicle.maintenances[0]
                          ? `${vehicle.maintenances[0].title} - ${formatDateTime(vehicle.maintenances[0].dueDate)}`
                          : "Sin pendientes"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-500">Creado</p>
                        <p className="text-sm text-slate-700">{vehicle.createdAt.toLocaleString("es-CO")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[170px] flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <details className="action-details" name="admin-action-modal">
                              <summary className="action-icon flex cursor-pointer list-none items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700 transition hover:bg-amber-100">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </summary>
                              <VehicleEditForm
                                action={updateVehicleFromAdmin}
                                vehicleId={vehicle.id}
                                brands={TRUCK_BRANDS}
                                commercialLinesByBrand={COMMERCIAL_LINES_BY_BRAND}
                                cargoBodyTypesByBrand={CARGO_BODY_TYPES_BY_BRAND}
                                initialPlate={vehicle.plate}
                                initialDriverCc={vehicle.driverCc}
                                initialDriverName={vehicle.company || ""}
                                initialBrand={selectedBrand}
                                initialCommercialLine={selectedCommercialLine}
                                initialCargoBodyType={selectedCargoBodyType}
                              />
                            </details>

                            <details className="action-details" name="admin-action-modal">
                              <summary className="action-icon flex cursor-pointer list-none items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 transition hover:bg-rose-100">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="m19 6-1 14H6L5 6" />
                                </svg>
                              </summary>
                              <form action={deleteVehicleFromAdmin} className="inline-action-panel action-modal-panel action-modal-danger">
                                <input type="hidden" name="vehicleId" value={vehicle.id} />
                                <div className="mb-3 flex items-center justify-end">
                                  <a href="/admin" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                                    Cerrar
                                  </a>
                                </div>
                                <div className="mb-3 border-b border-rose-100 pb-3">
                                  <p className="text-sm font-semibold text-rose-800">Eliminar usuario</p>
                                  <p className="text-xs text-slate-600">Esta accion no se puede deshacer.</p>
                                </div>
                                <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50/60 p-3 text-xs text-slate-700">
                                  <p>
                                    <span className="font-semibold">Placa:</span> {vehicle.plate}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Conductor:</span> {vehicle.company || "-"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">CC:</span> {vehicle.driverCc}
                                  </p>
                                </div>
                                <button className="w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                                  Confirmar eliminar
                                </button>
                              </form>
                            </details>
                          </div>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {!dbUnavailable && (
        <details open className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <summary className="admin-section-summary cursor-pointer text-lg font-semibold text-slate-800">
            Programar y administrar mantenimientos
          </summary>

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
            <select
              required
              name="maintenanceType"
              defaultValue=""
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent lg:col-span-2"
            >
              <option value="" disabled>
                Tipo de mantenimiento (PESV)
              </option>
              {PESV_MAINTENANCE_TYPES.map((item) => (
                <option key={`type-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              required
              name="pesvSystem"
              defaultValue=""
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="" disabled>
                Sistema PESV
              </option>
              {PESV_SYSTEMS.map((item) => (
                <option key={`system-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              required
              type="date"
              name="dueDate"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <select
              required
              name="serviceModality"
              defaultValue=""
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="" disabled>
                Modalidad
              </option>
              {SERVICE_MODALITIES.map((item) => (
                <option key={`mode-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              name="currentKm"
              placeholder="Km actual"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              name="titleNote"
              placeholder="Observacion corta (opcional)"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent lg:col-span-3"
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
                  <th className="px-4 py-3 font-semibold">Tipo PESV</th>
                  <th className="px-4 py-3 font-semibold">Sistema PESV</th>
                  <th className="px-4 py-3 font-semibold">Modalidad</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Km actual</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Descripcion</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {maintenances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-600">
                      No hay mantenimientos registrados.
                    </td>
                  </tr>
                ) : (
                  maintenances.map((maintenance) => (
                    <tr key={maintenance.id} className="border-t border-line">
                      <td className="px-4 py-3 font-semibold">{maintenance.vehicle.plate}</td>
                      <td className="px-4 py-3">{maintenance.title}</td>
                      <td className="px-4 py-3">{parseMaintenanceMeta(maintenance.description, "Sistema PESV")}</td>
                      <td className="px-4 py-3">{parseMaintenanceMeta(maintenance.description, "Modalidad")}</td>
                      <td className="px-4 py-3">{formatDateTime(maintenance.dueDate)}</td>
                      <td className="px-4 py-3">{maintenance.dueKm ?? "-"}</td>
                      <td className="px-4 py-3">{maintenance.status}</td>
                      <td className="px-4 py-3">{maintenance.description || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[170px] flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <details className="action-details" name="admin-action-modal">
                              <summary className="action-icon flex cursor-pointer list-none items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700 transition hover:bg-amber-100">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </summary>
                              <form action={updateMaintenanceFromAdmin} className="inline-action-panel action-modal-panel">
                              <input type="hidden" name="maintenanceId" value={maintenance.id} />
                              <div className="mb-3 flex items-center justify-end">
                                <a href="/admin" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                                  Cerrar
                                </a>
                              </div>
                              <div className="mb-3 border-b border-line pb-3">
                                <p className="text-sm font-semibold text-slate-900">Editar mantenimiento</p>
                                <p className="text-xs text-slate-500">Vehiculo {maintenance.vehicle.plate}</p>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                                  Tipo PESV
                                  <select
                                    required
                                    name="maintenanceType"
                                    defaultValue={maintenance.title.split(" - ")[0] || maintenance.title}
                                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                                  >
                                    {PESV_MAINTENANCE_TYPES.map((item) => (
                                      <option key={`edit-type-${maintenance.id}-${item}`} value={item}>
                                        {item}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="text-xs font-semibold text-slate-700">
                                  Sistema PESV
                                  <select
                                    required
                                    name="pesvSystem"
                                    defaultValue={parseMaintenanceMeta(maintenance.description, "Sistema PESV") !== "-" ? parseMaintenanceMeta(maintenance.description, "Sistema PESV") : PESV_SYSTEMS[0]}
                                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                                  >
                                    {PESV_SYSTEMS.map((item) => (
                                      <option key={`edit-system-${maintenance.id}-${item}`} value={item}>
                                        {item}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="text-xs font-semibold text-slate-700">
                                  Modalidad
                                  <select
                                    required
                                    name="serviceModality"
                                    defaultValue={parseMaintenanceMeta(maintenance.description, "Modalidad") !== "-" ? parseMaintenanceMeta(maintenance.description, "Modalidad") : SERVICE_MODALITIES[0]}
                                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                                  >
                                    {SERVICE_MODALITIES.map((item) => (
                                      <option key={`edit-mode-${maintenance.id}-${item}`} value={item}>
                                        {item}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="text-xs font-semibold text-slate-700">
                                  Fecha programada
                                  <input
                                    required
                                    type="date"
                                    name="dueDate"
                                    defaultValue={toInputDate(maintenance.dueDate)}
                                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                                  />
                                </label>
                                <label className="text-xs font-semibold text-slate-700">
                                  Km actual
                                  <input
                                    type="number"
                                    min="0"
                                    name="currentKm"
                                    defaultValue={maintenance.dueKm ?? ""}
                                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                                  />
                                </label>
                                <label className="text-xs font-semibold text-slate-700">
                                  Estado
                                  <select
                                    name="status"
                                    defaultValue={maintenance.status}
                                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                                  >
                                    <option value="PENDING">PENDING</option>
                                    <option value="SENT">SENT</option>
                                    <option value="DONE">DONE</option>
                                  </select>
                                </label>
                                <label className="text-xs font-semibold text-slate-700">
                                  Observacion corta
                                  <input
                                    name="titleNote"
                                    defaultValue={maintenance.title.includes(" - ") ? maintenance.title.split(" - ").slice(1).join(" - ") : ""}
                                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                                  />
                                </label>
                                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                                  Descripcion
                                  <textarea
                                    name="description"
                                    defaultValue={maintenance.description || ""}
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                                  />
                                </label>
                              </div>
                              <button className="mt-4 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100">
                                Guardar cambios
                              </button>
                            </form>
                            </details>

                            <details className="action-details" name="admin-action-modal">
                              <summary className="action-icon flex cursor-pointer list-none items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 transition hover:bg-rose-100">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="m19 6-1 14H6L5 6" />
                                </svg>
                              </summary>
                              <form action={deleteMaintenanceFromAdmin} className="inline-action-panel action-modal-panel action-modal-danger">
                              <input type="hidden" name="maintenanceId" value={maintenance.id} />
                              <div className="mb-3 flex items-center justify-end">
                                <a href="/admin" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                                  Cerrar
                                </a>
                              </div>
                              <div className="mb-3 border-b border-rose-100 pb-3">
                                <p className="text-sm font-semibold text-rose-800">Eliminar mantenimiento</p>
                                <p className="text-xs text-slate-600">Vehiculo {maintenance.vehicle.plate}</p>
                              </div>
                              <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50/60 p-3 text-xs text-slate-700">
                                <p>
                                  <span className="font-semibold">Tipo:</span> {maintenance.title}
                                </p>
                                <p>
                                  <span className="font-semibold">Fecha:</span> {formatDateTime(maintenance.dueDate)}
                                </p>
                                <p>
                                  <span className="font-semibold">Estado:</span> {maintenance.status}
                                </p>
                              </div>
                              <button className="w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                                Confirmar eliminar
                              </button>
                            </form>
                            </details>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </main>
  );
}
