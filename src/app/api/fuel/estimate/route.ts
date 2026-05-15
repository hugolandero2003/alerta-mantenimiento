import { NextResponse } from "next/server";

type EstimateBody = {
  origin?: string;
  destination?: string;
  tankValue?: number;
  fuelType?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Falta configurar GOOGLE_MAPS_API_KEY en el entorno." },
      { status: 503 }
    );
  }

  let body: EstimateBody;

  try {
    body = (await request.json()) as EstimateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud invalida." }, { status: 400 });
  }

  const origin = String(body.origin ?? "").trim();
  const destination = String(body.destination ?? "").trim();
  const tankValue = Number(body.tankValue ?? 0);
  const fuelType = String(body.fuelType ?? "ACPM").trim();

  if (!origin || !destination || !Number.isFinite(tankValue) || tankValue <= 0) {
    return NextResponse.json(
      { ok: false, error: "Completa origen, destino y valor tanqueado." },
      { status: 400 }
    );
  }

  const searchParams = new URLSearchParams({
    origins: origin,
    destinations: destination,
    units: "metric",
    language: "es",
    key: apiKey,
  });

  const googleResponse = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${searchParams.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!googleResponse.ok) {
    return NextResponse.json(
      { ok: false, error: "Google Maps no respondio correctamente." },
      { status: 502 }
    );
  }

  const googleData = (await googleResponse.json()) as {
    rows?: Array<{
      elements?: Array<{
        status?: string;
        distance?: { value?: number; text?: string };
      }>;
    }>;
    status?: string;
    origin_addresses?: string[];
    destination_addresses?: string[];
  };

  const element = googleData.rows?.[0]?.elements?.[0];

  if (!element || element.status !== "OK" || !element.distance?.value) {
    return NextResponse.json(
      { ok: false, error: "Google Maps no pudo calcular la ruta solicitada." },
      { status: 422 }
    );
  }

  const routeKm = element.distance.value / 1000;
  const totalCostCop = tankValue;
  const costPerKmCop = tankValue / routeKm;

  return NextResponse.json(
    {
      ok: true,
      result: {
        routeKm,
        totalCostCop,
        costPerKmCop,
        origin: googleData.origin_addresses?.[0] ?? origin,
        destination: googleData.destination_addresses?.[0] ?? destination,
        providerLabel: `Google Maps · ${fuelType}`,
      },
    },
    { status: 200 }
  );
}