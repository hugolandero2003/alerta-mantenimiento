import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { VehicleRegisterForm } from "../home-auth-forms";

const TRUCK_BRANDS = [
  "Ashok Leyland","BharatBenz","Chevrolet","DAF","Dongfeng","Eicher","Faw","Fiat","Ford","Foton","Freightliner","GMC","Hino","Hyundai","International","Isuzu","Iveco","JAC","Kenworth","Mack","MAN","Maxus","Mazda","Mercedes-Benz","Mitsubishi Fuso","Nissan","Peterbilt","Ram","Renault Trucks","Scania","Shacman","Sinotruk","Toyota","UD Trucks","Volkswagen","Volvo","Western Star","Otro"
];

// Copiar los mismos objetos de page.tsx
const HEAVY_TRUCK_LINES = [
  "Camion rigido","Tractocamion","Furgon seco","Furgon refrigerado","Estacado","Sencillo 2 ejes","Doble troque","Volqueta","Cisterna"
];
const MEDIUM_TRUCK_LINES = [
  "Turbo","Camion liviano","Furgon seco","Furgon refrigerado","Estacado","Cava","Reparto urbano"
];
const PICKUP_CARGO_LINES = [
  "Pickup de carga","Chasis cabina","Estacas liviano","Furgon liviano","Refrigerado liviano"
];
const CARGO_BODY_TYPES_BY_BRAND = {
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
  Otro: ["Turbo","Camion rigido","Tractocamion","Furgon seco","Furgon refrigerado","Estacado","Volqueta","Cisterna"],
};
const DEFAULT_COMMERCIAL_LINES = ["No especificada"];
const COMMERCIAL_LINES_BY_BRAND = {
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

const PLATE_REGEX = /^[A-Z0-9-]{5,8}$/;
const DRIVER_CC_REGEX = /^\d{6,12}$/;
const DRIVER_NAME_MAX_LENGTH = 80;

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function normalizePlate(plate: string) {
  return plate.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeDriverName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function registerVehicle(formData: FormData) {
  "use server";

  const plate = normalizePlate(String(formData.get("plate") ?? ""));
  const driverCc = String(formData.get("driverCc") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const commercialLine = String(formData.get("commercialLine") ?? "").trim();
  const cargoBodyType = String(formData.get("cargoBodyType") ?? "").trim();
  const driverName = normalizeDriverName(String(formData.get("driverName") ?? ""));

  if (!plate || !driverCc || !model || !commercialLine || !cargoBodyType || !driverName) {
    redirect(`/register?error=${encodeMessage("Completa todos los campos para crear el acceso")}`);
  }

  if (!PLATE_REGEX.test(plate)) {
    redirect(`/register?error=${encodeMessage("La placa debe tener entre 5 y 8 caracteres (letras y numeros)")}`);
  }

  if (!DRIVER_CC_REGEX.test(driverCc)) {
    redirect(`/register?error=${encodeMessage("La cedula debe contener solo numeros (6 a 12 digitos)")}`);
  }

  if (driverName.length > DRIVER_NAME_MAX_LENGTH) {
    redirect(`/register?error=${encodeMessage("El nombre del conductor es demasiado largo")}`);
  }

  if (!TRUCK_BRANDS.includes(model)) {
    redirect(`/register?error=${encodeMessage("Selecciona una marca valida")}`);
  }

  const validCommercialLines = COMMERCIAL_LINES_BY_BRAND[model as keyof typeof COMMERCIAL_LINES_BY_BRAND] ?? DEFAULT_COMMERCIAL_LINES;

  if (!validCommercialLines.includes(commercialLine)) {
    redirect(`/register?error=${encodeMessage("Selecciona una linea comercial valida para la marca elegida")}`);
  }

  const validCargoBodyTypes = CARGO_BODY_TYPES_BY_BRAND[model as keyof typeof CARGO_BODY_TYPES_BY_BRAND] ?? [];

  if (!validCargoBodyTypes.includes(cargoBodyType)) {
    redirect(`/register?error=${encodeMessage("Selecciona un tipo de carroceria valida para la marca elegida")}`);
  }

  const vehicleModel = `${model} ${commercialLine} - ${cargoBodyType}`;

  try {
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
  } catch (e) {
    console.error("[registerVehicle] DB error:", e);
    redirect(`/register?error=${encodeMessage("No fue posible conectar con la base de datos")}`);
  }

  redirect(`/register?ok=${encodeMessage("Usuario creado correctamente. Ahora inicia sesion")}`);
}

type RegisterProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-4 flex justify-end">
        <Link
          href="/"
          className="btn-glass btn-glass-primary px-4 py-2 text-sm font-semibold"
        >
          Iniciar sesion
        </Link>
      </div>
      <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold">Crear usuario</h2>
        <p className="mt-1 text-sm text-slate-600">Registra conductor, marca, línea y tipo de carrocería para habilitar su acceso al panel.</p>
        <VehicleRegisterForm
          action={registerVehicle}
          brands={TRUCK_BRANDS}
          commercialLinesByBrand={COMMERCIAL_LINES_BY_BRAND}
          cargoBodyTypesByBrand={CARGO_BODY_TYPES_BY_BRAND}
        />

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
    </main>
  );
}
