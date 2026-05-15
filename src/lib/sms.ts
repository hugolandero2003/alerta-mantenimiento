const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioSmsFrom = process.env.TWILIO_SMS_FROM;
const smsEnabled = process.env.SMS_NOTIFICATIONS_ENABLED !== "false";

let twilioClient: any = null;
let twilioInitialized = false;

async function getTwilioClient() {
  if (twilioInitialized) {
    return twilioClient;
  }

  twilioInitialized = true;

  if (!accountSid || !authToken || !smsEnabled) {
    return null;
  }

  try {
    const twilio = await import("twilio");
    twilioClient = twilio.default(accountSid, authToken);
  } catch (error) {
    console.error("Failed to initialize Twilio SMS client:", error);
    return null;
  }

  return twilioClient;
}

export function normalizeColombianPhoneNumber(phoneNumber: string) {
  const trimmedPhoneNumber = phoneNumber.trim();

  if (!trimmedPhoneNumber) {
    return "";
  }

  const digitsOnly = trimmedPhoneNumber.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  const normalizedDigits =
    digitsOnly.length === 10 ? `57${digitsOnly}` : digitsOnly.replace(/^00/, "");

  return `+${normalizedDigits}`;
}

export async function sendSmsNotification(
  toPhoneNumber: string,
  messageBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!smsEnabled || !twilioSmsFrom) {
    return { success: true, error: "SMS notifications disabled" };
  }

  const client = await getTwilioClient();
  if (!client) {
    return { success: true, error: "Twilio SMS not configured" };
  }

  const formattedPhone = normalizeColombianPhoneNumber(toPhoneNumber);

  if (!formattedPhone) {
    return { success: true, error: "Invalid phone number" };
  }

  try {
    const message = await client.messages.create({
      from: twilioSmsFrom,
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
    console.error("Failed to send SMS notification:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}