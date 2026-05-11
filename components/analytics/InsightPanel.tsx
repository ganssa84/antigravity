"use client";

import { useMemo } from "react";
import { MARKETPLACE_NAMES } from "./BRNPieChart";

type YearlyStat = { year: number; amount: number; compareAmount?: number };
type GrowthItem = { material: string; changePct: number; currentAmount: number };
type PartnerRow = { partner_name: string; amount: number };

export type InsightInputs = {
  tabType: "overview" | "team" | "marketplace";
  tabName: string;
  kpi: { total_amount: number; total_qty: number; num_partners: number; num_products: number } | null;
  yearly: YearlyStat[];
  topProducts: { material: string; amount: number }[];
  partnersAll: PartnerRow[];
  growthRate: number | null;
  topGrowing: GrowthItem[];
  topDeclining: GrowthItem[];
  brnTotals?: { brn: string; amount: number }[];
  teams?: { home_team: string; amount: number }[];
  growthTargetYear?: number;
  growthPrevYear?: number;
};

function fmtKRW(v: number) {
  if (v >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}조`;
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만`;
  return v.toLocaleString();
}
function pct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`; }

// ── 팀별 산업·제품 컨텍스트 ──────────────────────────────────────────────
const TEAM_CONTEXT: Record<string, {
  desc: string;
  trends: string[];
  opportunities: string[];
}> = {
  AAD: {
    desc: "자동차 애프터마켓(세차·보호·광택·방청 등) 제품",
    trends: [
      "국내 자동차 등록 대수 2,600만 대 돌파로 유지보수 수요 안정적 성장 지속 — 애프터마켓 시장은 경기 변동에 비교적 둔감한 방어적 성격",
      "전기차(EV) 보급 가속화(정부 2030년 450만 대 목표)로 기존 소모품 수요 구조 변화 — EV 전용 세차·실링·외장 보호 제품 신규 수요 빠르게 발생",
      "유튜브·SNS 기반 DIY 자동차 관리 문화 확산으로 개인 소비자의 온라인 직구 구매 증가, B2C 채널 중요도 상승",
      "중소 카센터·세차장 프랜차이즈가 MRO 비용 절감을 위해 온라인 플랫폼(네이버, 쿠팡) 구매로 전환하는 추세 가속",
      "3M Scotchgard™ 계열 차량용 보호 필름·코팅제 등 고부가가치 프리미엄 라인 글로벌 수요 증가",
    ],
    opportunities: [
      "전기차 특화 외장 보호·방청·무음 실란트 제품 라인업 조기 확보 — EV 정비소·딜러망 선점 전략",
      "카센터·세차장 체인 대상 연간 계약(Annual Contract) 전환으로 매출 예측 가능성 제고",
      "네이버 스마트스토어 DIY 채널 강화 및 인플루언서 마케팅으로 B2C 매출 비중 확대",
      "고가 PPF(Paint Protection Film) 제품 전문 시공점 파트너십 개발로 B2B·B2C 이중 수익원 구축",
    ],
  },
  ASD: {
    desc: "연마재(절단석·연삭석·공업용 수세미·샌딩 페이퍼 등) 제품",
    trends: [
      "국내 제조업(금속 가공·자동차 부품·조선·플랜트) 수주 회복세로 연마재 수요 증가 — 연마재 시장은 제조업 가동률과 높은 상관관계",
      "반도체·이차전지 공장 연속 증설로 정밀 연마·클린룸용 연마재 수요 급성장, 고부가 제품군으로 포지셔닝 기회",
      "환경부 VOC 규제 강화로 친환경 연마재(세라믹 그레인, 비석면 계열) 전환 요구 증가 — 기존 구형 제품 대체 수요 발생",
      "중소 제조업체들이 MRO 비용 절감을 위해 오프라인 공업사 대신 온라인 플랫폼으로 전환 — 소량·다품종 구매 증가",
      "3M™ Cubitron™ II 세라믹 연마재 계열이 작업 속도와 내구성에서 글로벌 표준으로 자리매김",
    ],
    opportunities: [
      "친환경·고성능 프리미엄 연마재 비중 확대 — 세라믹 계열 제품으로 포트폴리오 고도화",
      "반도체·디스플레이 공장 대상 정밀 연마 솔루션 TF 운영 및 기술 영업 강화",
      "온라인 B2B MRO 플랫폼(아마존 비즈니스, 쿠팡 B2B, 네이버 비즈니스) 입점 확대로 신규 소형 고객사 유입",
      "제조업체 생산라인별 연마재 사용 패턴 분석 후 소모품 정기 구독·납품 계약 전환 추진",
    ],
  },
  ISD: {
    desc: "장갑류(절단방지·여름/겨울 작업 장갑·쿨토시·넥쿨러·넥워머) 및 포장재(박스테이프·종이박스테이프·캐리핸들) 제품",
    trends: [
      "산업안전보건법 개정으로 절단방지장갑 착용 의무 사업장 확대 — 식품가공·유리·금속 절삭 등 고위험 공정에서 EN388 규격 인증 제품 수요 급증",
      "국내 이커머스 물류센터 급성장(쿠팡·네이버·SSG 등 풀필먼트 투자 확대)으로 포장 테이프·박스재 소모품 수요 지속 증가",
      "기후변화로 여름 체감온도 상승·겨울 한파 빈번 — 쿨토시·넥쿨러(여름)와 넥워머·겨울장갑(겨울) 계절성 피크 수요 연간 2회 명확화",
      "중소 제조·포장·물류 업체가 소량씩 온라인으로 구매하는 패턴 증가 — 소용량 번들 기획 제품 수요 확대",
      "3M Scotch® 산업용 테이프·패키징 솔루션이 글로벌 물류 자동화 시장에서 핵심 소모품으로 자리매김",
    ],
    opportunities: [
      "EN388 절단방지 1·2·3등급별 라인업 세분화 후 산업별(식품/금속/유리) 맞춤 기술영업 강화",
      "이커머스 풀필먼트 센터 대상 포장 소모품(박스테이프+캐리핸들+종이테이프) 패키지 공급 계약 확대",
      "쿨토시+여름장갑, 넥워머+겨울장갑 계절 번들 세트 온라인 선판매 전략 — 시즌 전 2~3개월 선제 재고 확보",
      "제조·물류·건설 현장 대상 작업보호장구 정기 구독 납품(월정액 계약) 모델 도입 검토",
    ],
  },
  PSD: {
    desc: "안전용품(방진마스크·방독마스크·추락방지·죔줄·귀마개·귀덮개 등) 제품",
    trends: [
      "중대재해처벌법(2022년 시행) 이후 5인 이상 사업장 안전 의무 강화로 PPE 수요 구조적 상승 — 위반 시 경영진 형사처벌 가능성으로 안전 지출 우선순위 상향",
      "반도체·이차전지·디스플레이 공장 연속 증설로 클린룸용 방진마스크·정전기 방지 제품 수요 고성장",
      "건설 현장 추락방지 안전망·죔줄 법적 의무화 적용 범위 확대 — 소규모 현장(20억 이하)까지 단계적 확산",
      "소규모 사업장(10인 미만)이 온라인 플랫폼에서 소량 안전용품 구매 비중 빠르게 증가 — 기존 오프라인 안전용품점 대체",
      "3M™ Aura™ 시리즈 호흡보호구가 글로벌 품질 기준 충족으로 프리미엄 수요 지속 견인",
    ],
    opportunities: [
      "중대재해처벌법 대응 안전관리 컨설팅 + 안전용품 패키지 번들 제공 — 법적 리스크 감소 솔루션으로 포지셔닝",
      "반도체·배터리 클린룸 환경 전용 PPE 솔루션 TF 운영 및 공장 맞춤 규격 납품 계약",
      "소규모 사업장 대상 안전용품 정기 구독·배송 서비스 도입 — 매월/분기 자동 보충 모델",
      "귀마개·귀덮개 등 소모품 교체 주기 분석 후 소모품 정기 공급 계약 전환 추진",
    ],
  },
  EMD: {
    desc: "전기절연테이프·전기접속재·전선보호재 등 전기·전자 시장 특화 제품",
    trends: [
      "전기차 충전 인프라 급속 확대(정부 2030년 공공 충전기 123만 기 보급 목표)로 전기절연·접속재 시공 수요 구조적 증가",
      "태양광·풍력 등 신재생에너지 설비 확대 — 전력계통 접속재·전선 보호재 소모품 연간 15% 이상 성장 전망",
      "스마트팩토리·산업용 IoT 도입 확대로 전기배선 소모품 수요 지속 — 기존 설비 리트로핏 수요도 증가",
      "소규모 전기공사 업체·전기 기술자가 온라인 플랫폼에서 소량 자재 구매 증가 — 오프라인 전기자재 도매상 대체",
      "3M™ Scotch® 전기절연테이프 시리즈가 안전인증(UL/CSA) 및 내열·내약품성으로 글로벌 표준 포지션 유지",
    ],
    opportunities: [
      "전기차 충전소 시공 전문 업체 대상 전용 자재 패키지 공급 제안 — EV 인프라 붐 선점",
      "태양광·ESS 설치 업체와 연계한 전선 보호재·접속재 연간 공급 MOU 체결",
      "전기자재 전문 온라인 쇼핑몰(전기공사 전용몰, 쿠팡 B2B) 입점 및 기술 영업 자료 온라인화",
      "중소 전기공사 업체 대상 소모품 정기 구독 납품 전환 추진 — 현장 자재 관리 편의성 제공",
    ],
  },
  IATD: {
    desc: "산업용 특수테이프(필라멘트·듀얼락·방수·알루미늄·폼양면·얇은 양면)·스프레이 접착제·윤활방청제·접착제 클리너 등",
    trends: [
      "글로벌 특수 테이프 시장 연 6~8% 성장 예상 — 자동화 설비 증가와 경량화 트렌드가 나사·볼트 대체 접착 솔루션 수요를 견인",
      "이커머스 물류 자동화(자동 테이핑 설비 확산)로 필라멘트 테이프·고강도 OPP 테이프 산업 수요 급증",
      "자동차·항공·전자제품 경량화 트렌드에서 3M VHB™ 폼양면테이프·듀얼락™ 등이 기계적 체결(나사) 대체 접합재로 확산",
      "친환경 포장 규제(EU·국내 탄소중립 법안) 강화로 용제형 접착제 → 수성·핫멜트 대체 수요 증가, 규제 선점 기회",
      "중소 제조·포장·건설 업체가 온라인 MRO 플랫폼(네이버, 쿠팡)에서 소량 산업용 테이프·접착제를 구매하는 비중 빠르게 증가",
    ],
    opportunities: [
      "자동화 설비·로봇 제조사 대상 필라멘트 테이프·폼테이프 기술 영업 강화 — 단순 가격 경쟁 대신 솔루션 엔지니어링 제안",
      "온라인 채널에서 소용량 샘플 번들 키트(산업용 테이프 샘플 세트) 기획으로 신규 고객 유입 및 제품 경험 제공",
      "친환경 수성·저VOC 접착제·클리너 라인업 조기 확보 — 규제 강화 전 선제 포트폴리오 전환",
      "윤활방청제·접착제 클리너 정기 구독 납품(월정액 계약) 모델 도입으로 소규모 고객 반복 구매 확보",
    ],
  },
};

const MARKETPLACE_CONTEXT: Record<string, { name: string; traits: string[]; opportunities: string[] }> = {
  "2208162517": {
    name: "네이버 스마트스토어",
    traits: [
      "월 사용자 4,500만+ 국내 최대 쇼핑 검색 플랫폼 — 공업용·산업용 소모품 키워드 검색 구매 비중 높음",
      "네이버 페이 포인트 적립·쇼핑 라이브·단골고객 기능으로 재구매 유도 용이",
      "리뷰 수·별점이 노출 알고리즘에 직접 영향 — 초기 리뷰 확보가 핵심",
    ],
    opportunities: [
      "산업용 제품 전문 키워드 SEO 최적화(예: '절단방지장갑 EN388', '3M 전기절연테이프 등급') 집중 강화",
      "네이버 쇼핑 라이브를 활용한 제품 사용법 시연으로 전환율 제고",
      "단골고객·구독 기능으로 B2B 소규모 고객의 정기 재구매 유도",
    ],
  },
  "1208800767": {
    name: "쿠팡",
    traits: [
      "로켓배송 익일배달 경쟁력 — 긴급 소모품 필요 현장 고객의 선호도 높음",
      "쿠팡 비즈니스(B2B) 채널을 통한 중소기업 대량 구매 증가 추세",
      "가격 비교 민감도 높은 플랫폼 — 경쟁력 있는 가격 포지셔닝 필요",
    ],
    opportunities: [
      "로켓배송 등록 제품 확대로 긴급 소모품 구매 고객 선점",
      "쿠팡 비즈니스 채널 전용 대용량·다수량 패키지 기획으로 B2B 고객 확보",
      "할인 쿠폰·번개 특가 행사를 활용한 신규 고객 유입 후 재구매 유도",
    ],
  },
  "1198666372": {
    name: "나비엠알오",
    traits: [
      "MRO(Maintenance, Repair, Operations) 전문 플랫폼 — 구매 담당자의 목적 구매 비중 높음",
      "기업 계정 관리·세금계산서 자동 발행 등 B2B 편의 기능 강점",
      "경쟁 제품 비교가 용이한 환경 — 기술 스펙·인증 정보 상세 등록이 중요",
    ],
    opportunities: [
      "제품 기술 스펙·국제 인증(UL·CE·EN388 등) 정보를 상세히 등록해 구매 담당자 신뢰 확보",
      "대기업·공공기관 MRO 카탈로그 등록 확대로 정기 발주 물량 확보",
      "MRO 플랫폼 전용 대용량·기업용 패키지 SKU 신설로 경쟁력 강화",
    ],
  },
  "2208183676": {
    name: "지마켓·옥션",
    traits: [
      "가격 민감 소비자 비중 높은 오픈마켓 — 묶음 할인·쿠폰 행사 효과 큼",
      "스마일클럽 회원 대상 추가 혜택 제공으로 재구매 유도 가능",
      "소규모 구매자(개인 사업자·소상공인) 비중 높음",
    ],
    opportunities: [
      "묶음 구매·소용량 번들 기획으로 객단가 제고",
      "스마일클럽 타임딜·슈퍼딜 노출 통한 신규 고객 유입",
      "소상공인 대상 구매 리뷰 이벤트로 리뷰 수 확보 후 자연 노출 증대",
    ],
  },
  "8158101244": {
    name: "11번가",
    traits: [
      "SK텔레콤 연계 T멤버십 포인트 할인으로 고객 충성도 형성 가능",
      "십일절(11.11) 등 대형 세일 행사 시 트래픽 집중",
      "가전·디지털 편중 플랫폼이나 산업용 소모품 판매 증가 추세",
    ],
    opportunities: [
      "십일절·블랙프라이데이 등 대형 세일 기간 선제 재고 확보 및 프로모션 기획",
      "T멤버십 할인 연계 산업용 소모품 정기 구매 유도 캠페인 운영",
      "11번가 전용 묶음 번들 구성으로 타 플랫폼 대비 차별화된 제품 구성 제공",
    ],
  },
};

// Korean particle: "이" after consonant-ending syllable, "가" after vowel-ending
function josaIGA(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 === 0 ? "가" : "이";
  return "이";
}

function generateInsights(inputs: InsightInputs) {
  const { tabType, tabName, kpi, yearly, topProducts, partnersAll, growthRate, topGrowing, topDeclining, brnTotals, teams, growthTargetYear, growthPrevYear } = inputs;

  const summary: string[] = [];
  const insights: string[] = [];
  const recommendations: string[] = [];

  const teamCtx = tabType === "team" ? TEAM_CONTEXT[tabName] : null;
  const mpCtx = tabType === "marketplace" ? MARKETPLACE_CONTEXT[Object.entries(MARKETPLACE_NAMES).find(([, v]) => v === tabName)?.[0] ?? ""] : null;

  // ── 전체 요약 ──────────────────────────────────────────────────────────
  if (yearly.length >= 2 && kpi) {
    const last = yearly.at(-1)!;
    const prev = yearly.at(-2)!;
    const base = last.compareAmount ?? prev.amount;
    const lastYoy = base > 0 ? (last.amount - base) / base * 100 : null;

    if (lastYoy !== null) {
      const trendWord = lastYoy >= 50 ? "급성장" : lastYoy >= 15 ? "성장" : lastYoy >= -15 ? "보합" : lastYoy >= -50 ? "감소" : "급감";
      const scopeNote = last.compareAmount != null ? `${prev.year}년 동기 대비` : `전년(${prev.year}년) 대비`;
      summary.push(`${last.year}년 ${tabType === "team" ? tabName + " 팀" : tabName} 매출은 ${fmtKRW(last.amount)}원으로, ${scopeNote} ${pct(lastYoy)} ${trendWord}했습니다.`);
    }
    if (kpi.num_partners > 0) {
      summary.push(`총 ${kpi.num_partners.toLocaleString()}개 거래처, ${kpi.num_products.toLocaleString()}개 제품을 운영 중이며 총 수량은 ${kpi.total_qty.toLocaleString()}개입니다.`);
    }
  }
  if (growthRate !== null && yearly.length >= 3) {
    const trend = growthRate >= 30 ? "고성장 기조를 유지" : growthRate >= 0 ? "안정적 성장세를 유지" : "매출 감소 추세를 보이고 있으며 원인 분석이 필요";
    summary.push(`연평균 성장률 ${pct(growthRate)}로 ${trend}하고 있습니다.`);
  }

  // ── 산업 트렌드 인사이트 (팀별 특화) ─────────────────────────────────
  if (teamCtx) {
    insights.push(`[${tabName} 취급 제품] ${teamCtx.desc}`);
    teamCtx.trends.slice(0, 3).forEach(t => insights.push(t));
  } else if (mpCtx) {
    insights.push(`[${mpCtx.name} 채널 특성]`);
    mpCtx.traits.forEach(t => insights.push(t));
  } else if (tabType === "overview") {
    insights.push("국내 온라인 B2B MRO 시장은 2024년 기준 약 12조 원 규모로 연 8~10% 성장 중 — 중소 제조·물류업체가 오프라인 도매상 대신 온라인으로 소모품을 구매하는 추세 가속화");
    insights.push("3M이 영위하는 산업안전·접착·연마·전기 분야는 제조업 부흥 정책(K-Manufacturing)과 스마트팩토리 확산의 직접 수혜 시장");
    insights.push("중소기업(SMB) 구매 담당자의 70% 이상이 온라인 검색·비교 후 구매 결정 — 상세 페이지 기술 스펙 등록과 리뷰 관리가 전환율 핵심");
  }

  // ── YoY 추이 분석 ───────────────────────────────────────────────────
  if (yearly.length >= 3) {
    const rates: number[] = [];
    for (let i = 1; i < yearly.length; i++) {
      const base = yearly[i].compareAmount ?? yearly[i - 1].amount;
      if (base > 0) rates.push((yearly[i].amount - base) / base * 100);
    }
    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const recentRate = rates.at(-1);

    if (recentRate !== undefined && avgRate !== 0) {
      if (recentRate < avgRate * 0.5 && recentRate < avgRate - 20) {
        insights.push(`최근 성장률(${pct(recentRate)})이 과거 연평균(${pct(avgRate)}) 대비 크게 둔화 — 시장 포화, 경쟁 심화, 또는 주요 거래처 이탈 가능성 점검 필요`);
      } else if (recentRate > 0 && recentRate > avgRate + 25) {
        insights.push(`최근 성장(${pct(recentRate)})이 과거 평균(${pct(avgRate)}) 대비 급가속 — 일회성 대형 수주 또는 신규 채널 효과인지 지속성 여부 모니터링 필요`);
      } else if (recentRate > 0) {
        insights.push(`${pct(recentRate)} 성장률은 평균(${pct(avgRate)})과 유사한 안정적 궤도 — 현재 전략의 유효성 확인`);
      }
    }
  }

  // ── 제품 성장/감소 ───────────────────────────────────────────────────
  if (topGrowing.length > 0 && growthTargetYear && growthPrevYear) {
    const top3 = topGrowing.slice(0, 3).map(g => `${g.material.slice(0, 18)}(${pct(g.changePct)})`).join(", ");
    insights.push(`${growthPrevYear}→${growthTargetYear} 급성장 제품: ${top3}`);
    const bigWinner = topGrowing[0];
    if (bigWinner.changePct > 80) {
      insights.push(`"${bigWinner.material.slice(0, 20)}"${josaIGA(bigWinner.material.slice(0, 20))} ${pct(bigWinner.changePct)} 급성장 중 — 수요 급증 배경(신규 고객사 유입 또는 시장 확대 여부) 확인 후 재고·공급망 확대 선제 준비 필요`);
    }
  }
  if (topDeclining.length > 0 && growthTargetYear && growthPrevYear) {
    const top3 = topDeclining.slice(0, 3).map(g => `${g.material.slice(0, 18)}(${pct(g.changePct)})`).join(", ");
    insights.push(`${growthPrevYear}→${growthTargetYear} 매출 감소 제품: ${top3} — 가격 경쟁력 저하 또는 대체재 등장 여부 확인 필요`);
  }

  // ── Top 제품 집중도 ─────────────────────────────────────────────────
  if (topProducts.length >= 5 && kpi && kpi.total_amount > 0) {
    const top5Amt = topProducts.slice(0, 5).reduce((s, p) => s + p.amount, 0);
    const top5Pct = (top5Amt / kpi.total_amount * 100).toFixed(0);
    if (Number(top5Pct) > 35) {
      insights.push(`Top 5 제품이 전체 매출의 ${top5Pct}%를 차지 — 상위 제품 단종·가격 인상 시 전체 매출에 즉각적 영향 발생`);
    }
  }

  // ── 마켓플레이스 분포 (Overview) ─────────────────────────────────────
  if (tabType === "overview" && brnTotals && brnTotals.length > 0) {
    const total = brnTotals.reduce((s, b) => s + b.amount, 0);
    const sorted = [...brnTotals].sort((a, b) => b.amount - a.amount);
    const top1 = sorted[0];
    const top1Pct = total > 0 ? (top1.amount / total * 100).toFixed(0) : "0";
    const mpName = MARKETPLACE_NAMES[top1.brn] || top1.brn;
    insights.push(`${mpName}${josaIGA(mpName)} 전체 매출의 ${top1Pct}%로 최대 채널 — 타 채널 대비 수요 집중도가 높아 해당 플랫폼 정책 변화 시 민감도 모니터링 필요`);
    if (sorted.length >= 2) {
      const top2 = sorted[1];
      const top2Pct = total > 0 ? (top2.amount / total * 100).toFixed(0) : "0";
      insights.push(`2위 채널 ${MARKETPLACE_NAMES[top2.brn] || top2.brn}(${top2Pct}%)와의 격차 분석을 통해 채널별 강점 제품 차별화 전략 수립 가능`);
    }
  }

  // ── 팀 분포 (Overview) ─────────────────────────────────────────────
  if (tabType === "overview" && teams && teams.length > 0 && kpi && kpi.total_amount > 0) {
    const sorted = [...teams].sort((a, b) => b.amount - a.amount);
    const top1 = sorted[0];
    const top1Pct = (top1.amount / kpi.total_amount * 100).toFixed(0);
    insights.push(`${top1.home_team} 팀이 전체 매출의 ${top1Pct}%로 최고 기여 팀`);
    if (sorted.length >= 2) {
      const last1 = sorted.at(-1)!;
      const lastPct = (last1.amount / kpi.total_amount * 100).toFixed(0);
      insights.push(`${last1.home_team} 팀(${lastPct}%)은 성장 여력이 상대적으로 높은 구간 — 집중 투자 시 전체 매출 상승 여력 존재`);
    }
  }

  // ── 개선 방향 및 제안 (팀별 특화 + 데이터 기반) ──────────────────────
  if (teamCtx) {
    teamCtx.opportunities.forEach(o => recommendations.push(o));
  } else if (mpCtx) {
    mpCtx.opportunities.forEach(o => recommendations.push(o));
  } else if (tabType === "overview") {
    recommendations.push("채널별 강점 제품 차별화 전략 — 네이버는 SEO 기반 전문 키워드 제품, 쿠팡은 긴급 소모품 로켓배송, 나비엠알오는 대기업 카탈로그 등록에 집중");
    recommendations.push("온라인 B2B MRO 구매자(SMB 구매 담당자) 대상 기술 스펙·인증 정보 콘텐츠 강화 — 단순 가격 경쟁 탈피, 솔루션 신뢰도 중심 포지셔닝");
    recommendations.push("성장률 상위 팀의 성공 영업 방식을 분석해 전사 베스트 프랙티스로 공유·적용");
  }

  // 데이터 기반 제안 추가
  if (topGrowing.length > 0 && growthTargetYear) {
    const bigWinner = topGrowing[0];
    if (bigWinner.changePct > 80) {
      recommendations.push(`급성장 제품 "${bigWinner.material.slice(0, 18)}" — 안정적 수급 확보를 위해 공급사와 우선 공급 협약 및 재고 버퍼 확대 검토`);
    }
  }
  if (topDeclining.length > 0) {
    recommendations.push(`감소 제품군에 대해 가격 조정·프로모션·번들 구성을 통한 매출 회복 시도 후, 개선되지 않는 제품은 포트폴리오 정리 검토`);
  }
  if (yearly.length >= 2) {
    const last = yearly.at(-1)!;
    const prev = yearly.at(-2)!;
    const base = last.compareAmount ?? prev.amount;
    const lastYoy = base > 0 ? (last.amount - base) / base * 100 : null;
    if (lastYoy !== null && lastYoy < -20) {
      recommendations.push(`전년 대비 ${pct(lastYoy)} 감소 — 월별 데이터를 기반으로 감소 시작 시점의 외부 요인(계절성, 경쟁사 프로모션, 규제 변화 등)을 정밀 분석한 후 대응책 마련 필요`);
    }
  }
  if (kpi && kpi.num_partners > 0) {
    const avgPerPartner = kpi.total_amount / kpi.num_partners;
    if (avgPerPartner < 5_000_000) {
      recommendations.push(`거래처당 평균 매출이 ${fmtKRW(avgPerPartner)}원으로 낮습니다 — 핵심 거래처 집중 관리를 통한 단가·물량 업셀링으로 거래처당 매출 향상에 집중하세요`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("현재 성장 궤도를 유지하면서 신규 채널 개척과 제품 포트폴리오 다각화를 병행 추진하세요.");
  }

  return { summary, insights, recommendations };
}

export default function InsightPanel(inputs: InsightInputs) {
  const { summary, insights, recommendations } = useMemo(() => generateInsights(inputs), [
    inputs.tabType, inputs.tabName, inputs.kpi, inputs.yearly, inputs.topProducts,
    inputs.partnersAll, inputs.growthRate, inputs.topGrowing, inputs.topDeclining,
    inputs.brnTotals, inputs.teams, inputs.growthTargetYear, inputs.growthPrevYear,
  ]);

  if (!inputs.kpi) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">데이터 인사이트 요약</h3>
        <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full font-medium">{inputs.tabName}</span>
      </div>

      {/* Summary */}
      {summary.length > 0 && (
        <div className="mb-5 p-4 bg-white/70 rounded-xl border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-700 mb-2">전체 요약</p>
          {summary.map((s, i) => (
            <p key={i} className="text-xs text-gray-700 leading-relaxed mb-1 last:mb-0">{s}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Insights */}
        {insights.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              주요 인사이트
            </p>
            <ul className="space-y-2">
              {insights.map((ins, i) => (
                <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-2">
                  <span className="text-indigo-400 shrink-0 mt-0.5 font-bold">·</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              개선 방향 및 제안
            </p>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-2">
                  <span className="text-emerald-500 shrink-0 mt-0.5 font-bold">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
