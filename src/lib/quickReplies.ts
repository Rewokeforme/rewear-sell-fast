export const buyerQuickReplies = [
  "Finns plagget kvar?",
  "Kan du skicka fler bilder?",
  "Hur är passformen?",
  "Kan du tänka dig lägre pris?",
  "När kan du skicka?",
];

export const sellerQuickReplies = [
  "Ja, den finns kvar.",
  "Jag kan skicka idag.",
  "Priset är fast.",
  "Jag kan lägga till fler bilder.",
  "Jag kan gå ner lite i pris.",
];

// Patterns that suggest a user is moving the deal off-platform.
const phoneRe = /(?:\+?\d[\s-]?){7,}\d/;
const emailRe = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const urlRe = /\b(?:https?:\/\/|www\.)\S+/i;
const swishRe = /\bswish(?:nummer|a|ar|en)?\b/i;
const offPlatformRe = /(betala\s+utanför|skicka\s+pengar\s+först|utanför\s+(?:appen|rewear)|paypal|venmo|revolut|kontonummer|bankgiro|iban)/i;

export function detectFraudRisk(text: string): { risky: boolean; reason: string | null } {
  if (!text) return { risky: false, reason: null };
  if (phoneRe.test(text)) return { risky: true, reason: "phone_number" };
  if (emailRe.test(text)) return { risky: true, reason: "email" };
  if (urlRe.test(text)) return { risky: true, reason: "external_link" };
  if (swishRe.test(text)) return { risky: true, reason: "swish" };
  if (offPlatformRe.test(text)) return { risky: true, reason: "off_platform" };
  return { risky: false, reason: null };
}
