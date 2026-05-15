import { NextResponse } from "next/server";
import { processDueSmsAlarms } from "@/lib/alarms";

export async function GET() {
  const result = await processDueSmsAlarms();

  return NextResponse.json(result, { status: 200 });
}