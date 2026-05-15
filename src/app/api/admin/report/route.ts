import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ReportMaintenance = {
  id: string;
  title: string;
  dueDate: Date;
  dueKm: number | null;
  status: "PENDING" | "SENT" | "DONE";
  description: string | null;
  createdAt: Date;
  vehicle: {
    plate: string;
    driverCc: string;
    model: string;
    company: string | null;
  };
};

function csvEscape(value: unknown) {
  const raw = value == null ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET() {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const maintenances = await prisma.maintenance.findMany({
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      dueDate: true,
      dueKm: true,
      status: true,
      description: true,
      createdAt: true,
      vehicle: {
        select: {
          plate: true,
          driverCc: true,
          model: true,
          company: true,
        },
      },
    },
  });

  const headers = [
    "placa",
    "cedula",
    "marca",
    "conductor",
    "mantenimiento_id",
    "titulo",
    "fecha_programada",
    "km_objetivo",
    "estado",
    "descripcion",
    "creado_en",
  ];

  const rows = (maintenances as ReportMaintenance[]).map((item) => [
    item.vehicle.plate,
    item.vehicle.driverCc,
    item.vehicle.model,
    item.vehicle.company || "",
    item.id,
    item.title,
    item.dueDate.toISOString(),
    item.dueKm ?? "",
    item.status,
    item.description || "",
    item.createdAt.toISOString(),
  ]);

  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");

  const fileName = `reporte_mantenimientos_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${fileName}`,
      "Cache-Control": "no-store",
    },
  });
}
