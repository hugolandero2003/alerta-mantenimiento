import { cookies } from "next/headers";

const SESSION_COOKIE = "vehicle_session";
const ADMIN_SESSION_COOKIE = "admin_session";

type VehicleSession = {
  vehicleId: string;
  plate: string;
};

type AdminSession = {
  username: string;
};

function encodeSession(session: VehicleSession) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodeSession(raw: string): VehicleSession | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));

    if (!parsed || typeof parsed.vehicleId !== "string" || typeof parsed.plate !== "string") {
      return null;
    }

    return {
      vehicleId: parsed.vehicleId,
      plate: parsed.plate,
    };
  } catch {
    return null;
  }
}

function encodeAdminSession(session: AdminSession) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodeAdminSession(raw: string): AdminSession | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));

    if (!parsed || typeof parsed.username !== "string") {
      return null;
    }

    return {
      username: parsed.username,
    };
  } catch {
    return null;
  }
}

export async function getVehicleSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  return decodeSession(raw);
}

export async function createVehicleSession(session: VehicleSession) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearVehicleSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  return decodeAdminSession(raw);
}

export async function createAdminSession(session: AdminSession) {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, encodeAdminSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
