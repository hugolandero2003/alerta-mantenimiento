import prisma from "@/lib/prisma";
import { sendSmsNotification } from "@/lib/sms";

export async function processDueSmsAlarms() {
  const now = new Date();

  const dueAlarms = await prisma.maintenance.findMany({
    where: {
      alarmAt: {
        lte: now,
      },
      notified: false,
      status: { not: "DONE" },
      notificationChannel: "SMS",
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      alarmAt: true,
      vehicle: {
        select: {
          plate: true,
          phoneNumber: true,
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const alarm of dueAlarms) {
    if (!alarm.vehicle.phoneNumber) {
      skipped++;
      continue;
    }

    const messageBody = [
      "Alerta de mantenimiento de flota",
      `Placa: ${alarm.vehicle.plate}`,
      `Mantenimiento: ${alarm.title}`,
      `Vence: ${new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(alarm.dueDate)}`,
      `Alarma programada: ${new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(alarm.alarmAt ?? now)}`,
    ].join("\n");

    const result = await sendSmsNotification(alarm.vehicle.phoneNumber, messageBody);

    if (result.success) {
      await prisma.maintenance.update({
        where: { id: alarm.id },
        data: {
          notified: true,
          status: "SENT",
        },
      });

      sent++;
    } else {
      errors.push(`${alarm.id}: ${result.error ?? "error desconocido"}`);
    }
  }

  return {
    total: dueAlarms.length,
    sent,
    skipped,
    errors,
  };
}