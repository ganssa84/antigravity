import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL 형식입니다." }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ProposalBot/1.0; +https://antigravity.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `사이트에 접근할 수 없습니다. (HTTP ${res.status})` },
        { status: 400 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $("script, style, noscript, iframe, nav, footer, header").remove();

    const title =
      $("title").text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      "";
    const description =
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";
    const keywords = $("meta[name='keywords']").attr("content") || "";
    const ogImage = $("meta[property='og:image']").attr("content") || "";

    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    return NextResponse.json({ title, description, keywords, ogImage, bodyText, url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    if (msg.includes("timeout") || msg.includes("TimeoutError")) {
      return NextResponse.json(
        { error: "사이트 응답이 너무 느립니다. (20초 초과)" },
        { status: 408 }
      );
    }
    return NextResponse.json({ error: `스크래핑 실패: ${msg}` }, { status: 500 });
  }
}
