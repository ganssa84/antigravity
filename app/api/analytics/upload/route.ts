import { NextRequest, NextResponse } from "next/server";
import { saveAnalyticsCache } from "@/lib/analytics-supabase";

type AnalyticsPayload = {
  summary: unknown;
  monthly: unknown;
  products: unknown;
  partners: unknown;
  brn: unknown;
  commodity: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AnalyticsPayload;

    const required = ["summary", "monthly", "products", "partners", "brn", "commodity"] as const;
    for (const key of required) {
      if (!payload[key]) {
        return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
      }
    }

    await saveAnalyticsCache("summary", payload.summary);
    await saveAnalyticsCache("monthly", payload.monthly);
    await saveAnalyticsCache("products", payload.products);
    await saveAnalyticsCache("partners", payload.partners);
    await saveAnalyticsCache("brn", payload.brn);
    await saveAnalyticsCache("commodity", payload.commodity);

    return NextResponse.json({ ok: true, message: "데이터가 성공적으로 업데이트되었습니다." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[upload] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
