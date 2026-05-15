const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;
const enableNotifications =
  process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true";

// Initialize Twilio client lazily only if credentials are configured
let twilioClient: any = null;
let twilioInitialized = false;

async function getTwilioClient() {
  if (twilioInitialized) {
    return twilioClient;
  }

  twilioInitialized = true;

  if (!accountSid || !authToken || !enableNotifications) {
    return null;
  }

  try {
    const twilio = await import("twilio");
    twilioClient = twilio.default(accountSid, authToken);
  } catch (error) {
    console.error("Failed to initialize Twilio client:", error);
    return null;
  }

  return twilioClient;
}

export function normalizeWhatsAppPhoneNumber(phoneNumber: string) {
  const trimmedPhoneNumber = phoneNumber.trim();

  if (!trimmedPhoneNumber) {
    return "";
  }

  if (trimmedPhoneNumber.startsWith("whatsapp:")) {
    return trimmedPhoneNumber;
  }

  const digitsOnly = trimmedPhoneNumber.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  const normalizedDigits =
    digitsOnly.length === 10 ? `57${digitsOnly}` : digitsOnly.replace(/^00/, "");

  return `whatsapp:+${normalizedDigits}`;
}

export async function sendWhatsAppNotification(
  toPhoneNumber: string,
  maintenanceTitle: string,
  maintenanceDate: string,
  vehiclePlate: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Check if WhatsApp notifications are enabled
  if (!enableNotifications || !twilioWhatsAppFrom) {
    return { success: true, error: "Notifications disabled" };
  }

  const client = await getTwilioClient();
  if (!client) {
    return { success: true, error: "Twilio not configured" };
  }

  const formattedPhone = normalizeWhatsAppPhoneNumber(toPhoneNumber);

  if (!formattedPhone) {
    return { success: true, error: "Invalid phone number" };
  }

  const messageBody = `Alerta de Mantenimiento 🚗\n\nPlaca: ${vehiclePlate}\nTipo: ${maintenanceTitle}\nFecha: ${maintenanceDate}\n\n¡Por favor, atiende esta mantención a tiempo!`;

  try {
    const message = await client.messages.create({
      from: twilioWhatsAppFrom,
      to: formattedPhone,
      body: messageBody,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Failed to send WhatsApp notification:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function sendWhatsAppNotificationBulk(
  phoneNumbers: string[],
  maintenanceTitle: string,
  maintenanceDate: string,
  vehiclePlate: string
): Promise<{ totalSent: number; failed: number; errors: string[] }> {
  const results = {
    totalSent: 0,
    failed: 0,
    errors: [] as string[],
  };

  if (!enableNotifications) {
    console.log("WhatsApp notifications disabled globally.");
    return results;
  }

  const client = await getTwilioClient();
  if (!client) {
    console.log("Twilio client not available. Skipping bulk notifications.");
    return results;
  }

  for (const phoneNumber of phoneNumbers) {
    const result = await sendWhatsAppNotification(
      phoneNumber,
      maintenanceTitle,
      maintenanceDate,
      vehiclePlate
    );

    if (result.success) {
      results.totalSent++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${phoneNumber}: ${result.error}`);
      }
    }
  }

  return results;
}
