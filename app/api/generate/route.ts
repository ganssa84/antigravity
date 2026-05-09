import { NextRequest, NextResponse } from "next/server";
import { generateProposal } from "@/lib/openrouter";
import { saveProposal } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { url, scrapedContent, customPrompt } = await req.json();

  if (!scrapedContent || !url) {
    return NextResponse.json({ error: "스크래핑 데이터가 필요합니다." }, { status: 400 });
  }

  try {
    const proposal = await generateProposal(scrapedContent, customPrompt);

    // Save to Supabase (non-blocking — don't fail if DB save fails)
    saveProposal({
      url,
      title: scrapedContent.title || url,
      content: proposal,
      prompt_used: customPrompt,
    }).catch(console.error);

    return NextResponse.json({ proposal });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
