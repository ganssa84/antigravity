const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Verify the exact model ID at https://openrouter.ai/models
const MODEL = "anthropic/claude-sonnet-4-6";

interface ScrapedContent {
  title: string;
  description: string;
  keywords: string;
  bodyText: string;
  url: string;
}

export async function generateProposal(
  scrapedContent: ScrapedContent,
  systemPrompt: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY가 설정되지 않았습니다.");

  const userMessage = `다음 기업의 웹사이트 정보를 바탕으로 제안서를 작성해주세요:

**URL:** ${scrapedContent.url}
**사이트 제목:** ${scrapedContent.title}
**사이트 설명:** ${scrapedContent.description}
**키워드:** ${scrapedContent.keywords}
**주요 내용:**
${scrapedContent.bodyText}`;

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://antigravity.vercel.app",
      "X-Title": "AI Proposal Generator",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `OpenRouter API 오류 (${res.status})`
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 응답이 비어있습니다.");
  return content;
}
