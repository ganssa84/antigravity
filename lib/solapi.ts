import crypto from "crypto";

const SOLAPI_SEND_URL      = "https://api.solapi.com/messages/v4/send";
const SOLAPI_SEND_MANY_URL = "https://api.solapi.com/messages/v4/send-many";

function authHeader(): string {
  const apiKey    = process.env.SOLAPI_API_KEY!;
  const apiSecret = process.env.SOLAPI_API_SECRET!;
  const date      = new Date().toISOString();
  const salt      = crypto.randomBytes(16).toString("hex");
  const sig       = crypto.createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${sig}`;
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function messageType(text: string): "SMS" | "LMS" {
  // Korean characters: ~2-3 bytes in EUC-KR. Use LMS when text is long.
  return Buffer.byteLength(text, "utf8") > 90 ? "LMS" : "SMS";
}

function isConfigured(): boolean {
  return !!(
    process.env.SOLAPI_API_KEY &&
    process.env.SOLAPI_API_SECRET &&
    process.env.SOLAPI_SENDER
  );
}

export async function sendSMS(to: string, text: string): Promise<void> {
  if (!isConfigured()) {
    console.warn("[솔라피] 환경변수 미설정 — 메시지 스킵:", { to, text });
    return;
  }

  const res = await fetch(SOLAPI_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      message: {
        to: cleanPhone(to),
        from: cleanPhone(process.env.SOLAPI_SENDER!),
        text,
        type: messageType(text),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`솔라피 발송 실패 (${res.status}): ${body}`);
  }
}

export async function sendBulkSMS(
  messages: { to: string; text: string }[]
): Promise<void> {
  if (!isConfigured()) {
    console.warn("[솔라피] 환경변수 미설정 — 일괄 발송 스킵");
    return;
  }

  const from = cleanPhone(process.env.SOLAPI_SENDER!);
  const res = await fetch(SOLAPI_SEND_MANY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      messages: messages.map(({ to, text }) => ({
        to: cleanPhone(to),
        from,
        text,
        type: messageType(text),
      })),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`솔라피 일괄 발송 실패 (${res.status}): ${body}`);
  }
}

// ────────────────────────────────────────
// 메시지 템플릿
// ────────────────────────────────────────

export function buildAttendanceMessage(
  name: string,
  sessionNumber: number,
  totalSessions: number
): string {
  return `[버터플레이스] ${name}이(가) 오늘 ${sessionNumber}/${totalSessions}회차 수업에 출석했습니다. 감사합니다! 🎹`;
}

export function buildLastSessionMessage(
  name: string,
  totalSessions: number
): string {
  return `[버터플레이스] ${name}이(가) 오늘 ${totalSessions}/${totalSessions}회차 (마지막) 수업에 출석했습니다.\n다음 수업 시 수강료 결제를 부탁드립니다. 감사합니다! 🎹`;
}
