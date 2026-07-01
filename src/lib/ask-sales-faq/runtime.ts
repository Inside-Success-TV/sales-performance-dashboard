import type {
  AskSalesFaqChatMessage,
  AskSalesFaqOutcome,
  AskSalesFaqResponse,
  AskSalesFaqStructuredAnswer,
} from "@/lib/ask-sales-faq/types";
import {
  APPROVED_FAQ_ARTICLES,
  ASK_SALES_FAQ_POLICY_RULES,
  type ApprovedFaqArticle,
  type AskSalesFaqRule,
} from "@/lib/ask-sales-faq/generated/approved-faq-bundle";
import ragIndex from "@/lib/ask-sales-faq/generated/policy-aware-rag-index.json";

type RagChunk = {
  id: string;
  source_type: "approved_article" | "curated_kb_article" | "curated_slack_evidence" | "governance_log" | "training_transcript";
  source_path: string;
  source_title: string;
  heading: string;
  article_id: string | null;
  article_status: string;
  category: string;
  risk_level: "low" | "medium" | "high" | string;
  authority: number;
  trust_label: string;
  last_reviewed: string;
  text: string;
};

type IndexedChunk = RagChunk & {
  normalized: string;
  tokens: string[];
  tokenSet: Set<string>;
};

type RetrievedChunk = RagChunk & {
  score: number;
  matchedTokens: string[];
};

type RuntimeDecision = {
  outcome: AskSalesFaqOutcome;
  sourceMode: "approved" | "evidence" | "mixed" | "fallback";
  confidenceLabel: "High" | "Medium" | "Low";
  confidenceScore: number;
  reason: string;
  routeReason: string | null;
  safeToGenerate: boolean;
  matchedRuleId: string;
  matchedArticleId: string | null;
  primaryArticle: ApprovedFaqArticle | null;
  retrieved: RetrievedChunk[];
};

type ModelOutput = {
  answer: string;
  summary?: string;
  sections?: Array<{ title?: string; body?: string; items?: string[]; tone?: string }>;
  needs_route: boolean;
  route_reason: string;
  confidence_label?: "High" | "Medium" | "Low";
  confidence_score?: number;
};

type ProviderResult = {
  provider: "deepseek" | "anthropic";
  model: string;
  output: ModelOutput;
};

export type AskSalesFaqRuntimeResult = AskSalesFaqResponse & {
  sanitizedQuestion: string;
  contextualQuestion: string;
  matchedArticleId: string | null;
  errorClass: string | null;
};

const STOPWORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "before",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "give",
  "had",
  "has",
  "have",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "should",
  "that",
  "the",
  "their",
  "them",
  "this",
  "to",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "with",
  "you",
  "your",
]);

const CONCEPT_EXPANSIONS: Array<{ triggers: string[]; add: string[] }> = [
  { triggers: ["discount", "discounts", "2000", "$2000", "$2,000"], add: ["same", "day", "call", "2", "pricing", "offer"] },
  { triggers: ["price", "pricing", "cost", "package", "packages"], add: ["istv", "payment", "plans", "lite", "standard", "premium"] },
  { triggers: ["show", "shows", "tv"], add: ["current", "active", "list"] },
  { triggers: ["refund", "refunds"], add: ["next", "level", "ceo", "daymond", "istv"] },
  { triggers: ["apple", "amazon", "tubi", "tier", "guaranteed"], add: ["platform", "placement", "proof", "claims"] },
  { triggers: ["recording", "recordings"], add: ["zoom", "stored", "access"] },
  { triggers: ["contract", "signature", "addendum"], add: ["payment", "legal", "route"] },
  { triggers: ["stop", "opt", "dnc"], add: ["compliance", "security", "privacy"] },
];

const DEFAULT_ROUTE_RESPONSE =
  "I found related internal FAQ material, but not enough to give a final answer confidently. Route this to the current owner before replying.";

const ADMIN_ONLY_RESPONSE =
  "This is an admin or maintenance question, not a normal sales-rep answer. Keep it in the admin workflow.";

const APPROVED_SHOW_LIST = [
  "Legacy Makers",
  "Women in Power",
  "Operation CEO",
  "America's Top Lawyers",
  "America's Best Doctors",
  "America's Top Trainers",
  "America's Top Agents",
  "Kingdom Creators",
  "Mompreneurs",
  "Couples of America",
  "Builders of America",
  "Legal Titans",
  "Life Changers",
  "Project Beauty",
  "Mindset Masters",
  "Love Experts",
  "Live Longer",
  "Americas Top Contractors",
  "Blue Collar America",
  "America's Authors",
  "America's Top Physicians",
  "Doctors of America",
  "Rise of Her",
  "Made It In America",
  "Wealth Makers",
  "Beyond Success",
  "American Founders",
  "Leading with Purpose",
  "Impact Makers TV",
  "Masters of Innovation",
];

const rawChunks = (ragIndex as { chunks?: RagChunk[] }).chunks || [];
const INDEXED_CHUNKS: IndexedChunk[] = rawChunks.map((chunk) => {
  const normalized = normalizeText(`${chunk.source_title} ${chunk.heading} ${chunk.category} ${chunk.text}`);
  const tokens = tokenize(normalized, { expand: false });
  return {
    ...chunk,
    normalized,
    tokens,
    tokenSet: new Set(tokens),
  };
});

export async function runAskSalesFaq(
  question: string,
  conversationMessages: AskSalesFaqChatMessage[] = [],
): Promise<AskSalesFaqRuntimeResult> {
  const startedAt = Date.now();
  const { text: sanitizedQuestion, redactions } = redactSensitiveText(question);
  const contextualQuestion = buildContextualQuestion(sanitizedQuestion, conversationMessages);
  const decision = decideQuestion(contextualQuestion);

  if (decision.outcome === "admin_only") {
    return buildHandledResponse({
      startedAt,
      sanitizedQuestion,
      contextualQuestion,
      redactions,
      decision,
      answer: ADMIN_ONLY_RESPONSE,
      structuredAnswer: structured({
        summary: ADMIN_ONLY_RESPONSE,
        sections: [{ title: "Where this belongs", items: ["Keep this in the admin workflow."], tone: "route" }],
        decision,
      }),
      source: null,
      errorClass: null,
    });
  }

  const deterministicAnswer = buildDeterministicAnswer({
    startedAt,
    sanitizedQuestion,
    contextualQuestion,
    redactions,
    decision,
  });
  if (deterministicAnswer) return deterministicAnswer;

  if (!decision.safeToGenerate) {
    const evidenceAnswer = buildExtractiveEvidenceAnswer(decision);
    return buildHandledResponse({
      startedAt,
      sanitizedQuestion,
      contextualQuestion,
      redactions,
      decision,
      answer: evidenceAnswer.answer,
      structuredAnswer: evidenceAnswer.structuredAnswer,
      source: sourceSummaryFromDecision(decision),
      errorClass: decision.outcome === "low_confidence_route" ? "low_confidence_retrieval" : null,
    });
  }

  try {
    const providerResult = await generateProviderAnswer({
      question: contextualQuestion,
      displayQuestion: sanitizedQuestion,
      decision,
    });
    const answer = sanitizeModelAnswer(providerResult.output.answer);
    if (!answer || containsHiddenTerms(answer)) {
      throw new Error("Model output was empty or exposed hidden terms");
    }

    const structuredAnswer = normalizeModelStructuredAnswer(providerResult.output, answer, decision);
    return buildHandledResponse({
      startedAt,
      sanitizedQuestion,
      contextualQuestion,
      redactions,
      decision,
      answer,
      structuredAnswer,
      source: sourceSummaryFromDecision(decision),
      provider: providerResult.provider,
      model: providerResult.model,
      errorClass: null,
    });
  } catch (error) {
    console.error("Ask Sales FAQ provider failed", error);
    const fallback = buildExtractiveEvidenceAnswer(decision);
    return buildHandledResponse({
      startedAt,
      sanitizedQuestion,
      contextualQuestion,
      redactions,
      decision,
      answer: fallback.answer,
      structuredAnswer: fallback.structuredAnswer,
      source: sourceSummaryFromDecision(decision),
      errorClass: "provider_fallback_to_evidence",
    });
  }
}

function buildHandledResponse(input: {
  startedAt: number;
  sanitizedQuestion: string;
  contextualQuestion: string;
  redactions: string[];
  decision: RuntimeDecision;
  answer: string;
  structuredAnswer: AskSalesFaqStructuredAnswer;
  source: AskSalesFaqRuntimeResult["source"];
  provider?: "deepseek" | "anthropic" | null;
  model?: string | null;
  errorClass: string | null;
}): AskSalesFaqRuntimeResult {
  return {
    ok: true,
    conversationId: "",
    messageId: "",
    answer: input.answer,
    structuredAnswer: input.structuredAnswer,
    outcome: input.decision.outcome,
    source: input.source,
    model: input.model || null,
    provider: input.provider || null,
    needsRoute:
      input.decision.outcome === "route_from_approved_article" ||
      input.decision.outcome === "route_from_evidence" ||
      input.decision.outcome === "low_confidence_route" ||
      input.decision.outcome === "abstain_unapproved",
    routeReason: input.decision.routeReason,
    redactions: input.redactions,
    latencyMs: Date.now() - input.startedAt,
    sanitizedQuestion: input.sanitizedQuestion,
    contextualQuestion: input.contextualQuestion,
    matchedArticleId: input.decision.matchedArticleId,
    errorClass: input.errorClass,
  };
}

function buildDeterministicAnswer(input: {
  startedAt: number;
  sanitizedQuestion: string;
  contextualQuestion: string;
  redactions: string[];
  decision: RuntimeDecision;
}): AskSalesFaqRuntimeResult | null {
  const articleId = input.decision.matchedArticleId;
  const question = normalizeText(input.contextualQuestion);

  if (!articleId) return null;

  if (articleId === "current-show-source") {
    const showList = APPROVED_SHOW_LIST.join(", ");
    const routeRequired = input.decision.outcome === "route_from_approved_article";
    const namedShow = APPROVED_SHOW_LIST.find((show) => phrasePresent(show, question));
    let summary = `The latest approved show list I have is: ${showList}.`;
    const sections: AskSalesFaqStructuredAnswer["sections"] = [
      {
        title: "Current approved shows",
        items: APPROVED_SHOW_LIST,
        tone: "default",
      },
    ];
    if (routeRequired) {
      summary = namedShow
        ? `${namedShow} is on the latest approved show list I have. Confirm same-day active/paused status with the current sales/ops owner before giving a final prospect answer.`
        : "Confirm same-day active/paused or missing-dropdown show status with the current sales/ops owner before giving a final prospect answer.";
      sections.push({
        title: "Route note",
        items: ["Show status can change. Confirm newly added, paused, disputed, or missing-form shows before telling a prospect."],
        tone: "route",
      });
    }
    return buildHandledResponse({
      ...input,
      answer: summary,
      structuredAnswer: structured({ summary, sections, decision: input.decision }),
      source: sourceSummaryFromDecision(input.decision),
      errorClass: null,
    });
  }

  if (articleId === "istv-nlceo-pricing-and-same-day-discount") {
    const discountQuestion =
      phrasePresent("discount", question) ||
      phrasePresent("2000", question) ||
      phrasePresent("$2000", question) ||
      phrasePresent("$2,000", question);
    const nlceoQuestion = phrasePresent("next level ceo", question) || phrasePresent("daymond john", question);
    let summary =
      "Main ISTV: Lite $12K, Standard $20K, VIP/Premium $30K. Next Level CEO: Lite $10K, Standard $15K, Premium VIP $20K, CEO Day upgrade +$5K.";
    if (discountQuestion && nlceoQuestion) {
      summary = "The $2,000 same-day discount does not apply to Next Level CEO / Daymond John.";
    } else if (discountQuestion) {
      summary =
        "The approved discount I have is the $2,000 same-day discount for the main ISTV program only. It applies on Call 2 when the client closes and pays the initial deposit on that same Call-2 closing call.";
    } else if (nlceoQuestion) {
      summary = "Next Level CEO / Daymond John pricing: Lite $10K, Standard $15K, Premium VIP $20K, CEO Day upgrade +$5K.";
    }

    const sections = [
      {
        title: "Main ISTV pricing",
        items: [
          "Lite: $12,000. Plans: 4 x $3,000, 3 x $4,000, or 2 x $6,000.",
          "Standard: $20,000. Plans: 4 x $5,000 or 2 x $10,000.",
          "VIP/Premium: $30,000. Plans: 4 x $7,500, 3 x $10,000, or 2 x $15,000.",
        ],
      },
      {
        title: "Next Level CEO / Daymond John",
        items: ["Lite: $10,000.", "Standard: $15,000.", "Premium VIP: $20,000.", "CEO Day upgrade: +$5,000."],
      },
      {
        title: "Discount rule",
        items: [
          "$2,000 off main ISTV only.",
          "Only on Call 2 when the client closes and pays the initial deposit on that same call.",
          "Not for Next Level CEO / Daymond John.",
          "Do not promise second-show, crossover, VIP-to-VIP, custom, or special discounts unless a current owner approves that exact case.",
        ],
        tone: "warning" as const,
      },
    ];

    return buildHandledResponse({
      ...input,
      answer: summary,
      structuredAnswer: structured({ summary, sections, decision: input.decision }),
      source: sourceSummaryFromDecision(input.decision),
      errorClass: null,
    });
  }

  if (articleId === "refund-rules-by-product") {
    const summary = "Next Level CEO / Daymond John has a 3-day refund window. Main ISTV and other shows have no refund offer and no refunds.";
    return buildHandledResponse({
      ...input,
      answer: summary,
      structuredAnswer: structured({
        summary,
        sections: [
          { title: "Current refund rule", items: ["Next Level CEO / Daymond John: 3-day refund window.", "Main ISTV and other shows: no refund offer and no refunds."] },
          { title: "Route exceptions", items: ["Refund exceptions, duplicate charges, payment pauses, paid-but-not-signed, and legal/contract interpretation must route."], tone: "route" },
        ],
        decision: input.decision,
      }),
      source: sourceSummaryFromDecision(input.decision),
      errorClass: null,
    });
  }

  if (articleId === "payment-plan-and-link-boundaries") {
    const summary = "Use only current official payment links and listed payment plans. Custom amounts, custom payment plans, custom links, wire/ACH, invoices, and payment exceptions must route.";
    return buildHandledResponse({
      ...input,
      answer: summary,
      structuredAnswer: structured({
        summary,
        sections: [
          { title: "What reps can say", items: ["Use the current official payment link and listed payment plan for that package."] },
          { title: "Must route", items: ["Custom amounts or splits.", "Wire/ACH or invoice requests.", "Broken links or failed payments.", "Any payment exception."], tone: "route" },
          { title: "Never do this", items: ["Do not collect or paste raw card numbers, bank details, payment details, passwords, tokens, or secrets."], tone: "warning" },
        ],
        decision: input.decision,
      }),
      source: sourceSummaryFromDecision(input.decision),
      errorClass: null,
    });
  }

  if (articleId === "platform-proof-and-claims-boundaries") {
    const summary = "All tiers air on the Inside Success Network app. VIP/Premium is submitted to one Tier-1 platform, but placement is not guaranteed.";
    return buildHandledResponse({
      ...input,
      answer: summary,
      structuredAnswer: structured({
        summary,
        sections: [
          { title: "Approved platform wording", items: ["All tiers air on the Inside Success Network app.", "VIP/Premium is submitted to one Tier-1 platform: Amazon Prime Video, Apple TV streaming app, or Tubi.", "Tier-1 placement is a platform decision and is not guaranteed."] },
          { title: "Do not promise", items: ["Do not guarantee Amazon, Apple TV streaming app, Tubi, ROI, leads, revenue, fundraising, PR outcomes, views, or business results."], tone: "warning" },
        ],
        decision: input.decision,
      }),
      source: sourceSummaryFromDecision(input.decision),
      errorClass: null,
    });
  }

  if (articleId === "internal-material-sharing-boundaries") {
    const summary = "Do not externally share internal materials unless explicitly approved.";
    return buildHandledResponse({
      ...input,
      answer: summary,
      structuredAnswer: structured({
        summary,
        sections: [
          { title: "Do not share externally", items: ["Internal Slack content.", "Payment details.", "Dashboards/source docs.", "Confidential notes.", "Call recordings.", "Stats decks.", "Training videos."] },
          { title: "If unsure", items: ["Route to the source owner or compliance owner before sharing."], tone: "route" },
        ],
        decision: input.decision,
      }),
      source: sourceSummaryFromDecision(input.decision),
      errorClass: null,
    });
  }

  if (articleId === "platform-hosting-and-client-license-duration") {
    const summary = "ISTV platform hosting is 5 years. The client has lifetime license rights to their own episode/content.";
    return buildHandledResponse({
      ...input,
      answer: summary,
      structuredAnswer: structured({
        summary,
        sections: [
          { title: "Use this wording", items: ["The episode is hosted on the ISTV platform for 5 years.", "The client has lifetime license rights to their own episode/content."] },
          { title: "Do not merge these", items: ["Do not say ISTV platform hosting is lifetime or permanent."], tone: "warning" },
        ],
        decision: input.decision,
      }),
      source: sourceSummaryFromDecision(input.decision),
      errorClass: null,
    });
  }

  if (articleId === "call-recording-storage-and-access") {
    const summary = "Calls are automatically recorded by Zoom and stored on Zoom servers. Access is through the Zoom recording link for that recording.";
    return buildHandledResponse({
      ...input,
      answer: summary,
      structuredAnswer: structured({
        summary,
        sections: [
          { title: "Recording storage", items: ["Calls are automatically recorded by Zoom.", "Recordings are stored on Zoom servers."] },
          { title: "Access", items: ["Use the Zoom recording link for that recording.", "If the link is missing or access is denied, route to the current sales-tech/recording owner."], tone: "route" },
        ],
        decision: input.decision,
      }),
      source: sourceSummaryFromDecision(input.decision),
      errorClass: null,
    });
  }

  return null;
}

function decideQuestion(question: string): RuntimeDecision {
  const retrieved = retrieveKnowledge(question, 10);
  const rule = findMatchingRule(question);

  if (rule?.decision === "admin_only") {
    return {
      outcome: "admin_only",
      sourceMode: "fallback",
      confidenceLabel: "Low",
      confidenceScore: 0,
      reason: rule.reason,
      routeReason: null,
      safeToGenerate: false,
      matchedRuleId: rule.id,
      matchedArticleId: rule.article_id || null,
      primaryArticle: null,
      retrieved,
    };
  }

  const ruleArticle = rule?.article_id ? APPROVED_FAQ_ARTICLES.find((article) => article.id === rule.article_id) || null : null;
  const topApproved = firstApprovedRetrieved(retrieved);
  const top = retrieved[0] || null;
  const primaryArticle = ruleArticle || articleFromRetrieved(topApproved || top);

  if (ruleArticle) {
    const matchedRule = rule as AskSalesFaqRule;
    const outcome =
      matchedRule.decision === "route_from_approved_article" ? "route_from_approved_article" : "answer_from_approved_article";
    return {
      outcome,
      sourceMode: "approved",
      confidenceLabel: "High",
      confidenceScore: 92,
      reason: matchedRule.reason,
      routeReason: outcome === "route_from_approved_article" ? matchedRule.reason : null,
      safeToGenerate: true,
      matchedRuleId: matchedRule.id,
      matchedArticleId: ruleArticle.id,
      primaryArticle: ruleArticle,
      retrieved,
    };
  }

  if (topApproved && topApproved.score >= 4.2) {
    const article = articleFromRetrieved(topApproved);
    return {
      outcome: "answer_from_approved_article",
      sourceMode: "approved",
      confidenceLabel: topApproved.score >= 7 ? "High" : "Medium",
      confidenceScore: Math.min(90, Math.round(58 + topApproved.score * 5)),
      reason: "Semantic retrieval matched an approved FAQ article.",
      routeReason: null,
      safeToGenerate: true,
      matchedRuleId: "semantic-approved-retrieval",
      matchedArticleId: article?.id || topApproved.article_id,
      primaryArticle: article,
      retrieved,
    };
  }

  if (top && top.score >= 4.8) {
    const route = top.article_status === "in_conflict" || top.risk_level === "high" || top.authority < 58;
    return {
      outcome: route ? "route_from_evidence" : "answer_from_evidence",
      sourceMode: top.source_type === "approved_article" ? "approved" : "evidence",
      confidenceLabel: top.score >= 8 && top.authority >= 58 ? "Medium" : "Low",
      confidenceScore: Math.min(78, Math.round(35 + top.score * 4 + top.authority / 5)),
      reason: "Retrieved relevant internal evidence from the FAQ source corpus.",
      routeReason: route ? "This answer is based on internal evidence and should be confirmed before giving a final high-risk answer." : null,
      safeToGenerate: true,
      matchedRuleId: "semantic-evidence-retrieval",
      matchedArticleId: top.article_id,
      primaryArticle,
      retrieved,
    };
  }

  if (rule?.decision === "abstain_unapproved") {
    return {
      outcome: "low_confidence_route",
      sourceMode: "fallback",
      confidenceLabel: "Low",
      confidenceScore: 15,
      reason: rule.reason,
      routeReason: rule.reason,
      safeToGenerate: false,
      matchedRuleId: rule.id,
      matchedArticleId: null,
      primaryArticle: null,
      retrieved,
    };
  }

  return {
    outcome: "low_confidence_route",
    sourceMode: "fallback",
    confidenceLabel: "Low",
    confidenceScore: 10,
    reason: ASK_SALES_FAQ_POLICY_RULES.defaultDecision.reason,
    routeReason: ASK_SALES_FAQ_POLICY_RULES.defaultDecision.reason,
    safeToGenerate: false,
    matchedRuleId: "default-low-confidence-route",
    matchedArticleId: null,
    primaryArticle: null,
    retrieved,
  };
}

function findMatchingRule(question: string): AskSalesFaqRule | null {
  for (const rules of [
    ASK_SALES_FAQ_POLICY_RULES.adminOnlyRules,
    ASK_SALES_FAQ_POLICY_RULES.routeRules,
    ASK_SALES_FAQ_POLICY_RULES.answerRules,
    ASK_SALES_FAQ_POLICY_RULES.abstainRules,
  ]) {
    for (const rule of rules) {
      if (ruleMatches(question, rule)) return rule;
    }
  }
  return null;
}

function ruleMatches(question: string, rule: AskSalesFaqRule) {
  const normalizedQuestion = normalizeText(question);

  if (rule.match_all?.length && !rule.match_all.every((phrase) => phrasePresent(phrase, normalizedQuestion))) {
    return false;
  }

  if (rule.match_any?.length && rule.match_any.some((phrase) => phrasePresent(phrase, normalizedQuestion))) {
    return true;
  }

  for (const group of rule.match_any_groups || []) {
    if (!group.some((phrase) => phrasePresent(phrase, normalizedQuestion))) {
      return false;
    }
  }

  return Boolean(rule.match_all?.length || rule.match_any_groups?.length);
}

function retrieveKnowledge(question: string, topK: number): RetrievedChunk[] {
  const queryTokens = tokenize(question, { expand: true });
  const queryTokenSet = new Set(queryTokens);
  const normalizedQuestion = normalizeText(question);

  const scored: RetrievedChunk[] = [];
  for (const chunk of INDEXED_CHUNKS) {
    const matchedTokens = Array.from(queryTokenSet).filter((token) => chunk.tokenSet.has(token));
    if (!matchedTokens.length) continue;

    let score = 0;
    for (const token of matchedTokens) {
      const frequency = chunk.tokens.filter((candidate) => candidate === token).length;
      score += 1 + Math.log(Math.max(1, frequency));
    }

    if (phrasePresent(chunk.source_title, normalizedQuestion)) score += 3;
    if (phrasePresent(chunk.heading, normalizedQuestion)) score += 2;
    if (chunk.source_type === "approved_article") score += 1.5;
    score += Math.min(2.2, chunk.authority / 55);
    score += matchedTokens.length / Math.max(2, queryTokenSet.size);

    scored.push({
      ...chunk,
      score: Number(score.toFixed(3)),
      matchedTokens,
    });
  }

  return scored
    .sort((left, right) => right.score - left.score || right.authority - left.authority || left.id.localeCompare(right.id))
    .slice(0, topK);
}

function firstApprovedRetrieved(retrieved: RetrievedChunk[]) {
  return retrieved.find((chunk) => chunk.source_type === "approved_article" && chunk.article_id);
}

function articleFromRetrieved(chunk: RetrievedChunk | null | undefined) {
  if (!chunk?.article_id) return null;
  return APPROVED_FAQ_ARTICLES.find((article) => article.id === chunk.article_id) || null;
}

function buildExtractiveEvidenceAnswer(decision: RuntimeDecision): {
  answer: string;
  structuredAnswer: AskSalesFaqStructuredAnswer;
} {
  const topChunks = decision.retrieved.slice(0, 3);
  if (!topChunks.length) {
    return {
      answer: DEFAULT_ROUTE_RESPONSE,
      structuredAnswer: structured({
        summary: DEFAULT_ROUTE_RESPONSE,
        sections: [{ title: "Route this", items: ["No strong source match was found in the FAQ corpus."], tone: "route" }],
        decision,
      }),
    };
  }

  const summary = extractBestSentence(topChunks[0].text) || DEFAULT_ROUTE_RESPONSE;
  const evidenceItems = topChunks
    .map((chunk) => extractBestSentence(chunk.text))
    .filter((item): item is string => Boolean(item))
    .slice(0, 4);

  const routeItem = decision.routeReason || "Confirm with the current owner before using this as a final high-risk answer.";
  const sections: AskSalesFaqStructuredAnswer["sections"] = [
    { title: "Best current guidance found", items: evidenceItems.length ? evidenceItems : [summary] },
    { title: "Source strength", items: [`${decision.confidenceLabel} confidence from ${topChunks[0].trust_label.toLowerCase()}.`] },
  ];
  if (
    decision.outcome === "route_from_approved_article" ||
    decision.outcome === "route_from_evidence" ||
    decision.outcome === "low_confidence_route" ||
    decision.outcome === "abstain_unapproved"
  ) {
    sections.push({ title: "Route note", items: [routeItem], tone: "route" as const });
  }

  return {
    answer: summary,
    structuredAnswer: structured({ summary, sections, decision }),
  };
}

function sourceSummaryFromDecision(decision: RuntimeDecision): AskSalesFaqRuntimeResult["source"] {
  const primary = decision.primaryArticle;
  const top = decision.retrieved[0];
  if (primary) {
    return {
      label: primary.title,
      lastReviewed: primary.lastReviewed,
      approved: true,
      sourceMode: decision.sourceMode,
      confidenceLabel: decision.confidenceLabel,
      confidenceScore: decision.confidenceScore,
      expandableDetails: `Approved by ${primary.approvedBy} on ${primary.approvedAt}.`,
    };
  }
  if (top) {
    return {
      label: `${top.trust_label}: ${top.source_title}`,
      lastReviewed: top.last_reviewed || "2026-07-01",
      approved: top.source_type === "approved_article",
      sourceMode: decision.sourceMode,
      confidenceLabel: decision.confidenceLabel,
      confidenceScore: decision.confidenceScore,
      expandableDetails: `Source category: ${top.category}. Source strength: ${top.trust_label}.`,
    };
  }
  return null;
}

function structured(input: {
  summary: string;
  sections: AskSalesFaqStructuredAnswer["sections"];
  decision: RuntimeDecision;
}): AskSalesFaqStructuredAnswer {
  return {
    summary: input.summary,
    sections: input.sections.filter((section) => section.body || section.items?.length),
    confidenceLabel: input.decision.confidenceLabel,
    confidenceScore: input.decision.confidenceScore,
    sourceMode: input.decision.sourceMode,
  };
}

function buildContextualQuestion(question: string, messages: AskSalesFaqChatMessage[]) {
  const normalized = normalizeText(question);
  const isFollowUp =
    normalized.split(" ").filter(Boolean).length <= 7 ||
    /^(what about|how about|and |also |for |what if|does that|can they|can we|is it|would that)/i.test(question.trim()) ||
    /\b(it|that|this|they|them|those|same|there)\b/i.test(question);

  if (!isFollowUp) return question;

  const previous = messages
    .slice(0, -1)
    .filter((message) => message.content.trim())
    .slice(-4)
    .map((message) => `${message.role}: ${message.content.trim().slice(0, 700)}`)
    .join("\n");

  if (!previous) return question;
  return `Conversation context:\n${previous}\n\nFollow-up question:\n${question}`;
}

function redactSensitiveText(value: string) {
  const redactions = new Set<string>();
  let text = value;

  text = text.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19) {
      redactions.add("payment_number");
      return "[REDACTED_PAYMENT_NUMBER]";
    }
    return match;
  });

  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
    redactions.add("ssn");
    text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]");
  }

  text = text.replace(/\b(password|passcode|api key|secret|token)\s*[:=]\s*\S+/gi, (match, label: string) => {
    redactions.add("secret");
    return `${label}: [REDACTED_SECRET]`;
  });

  return { text, redactions: Array.from(redactions).sort() };
}

function tokenize(value: string, options: { expand: boolean }) {
  const tokens =
    normalizeText(value)
      .match(/[a-z0-9$]+/g)
      ?.filter((token) => token.length > 1 && !STOPWORDS.has(token)) || [];

  if (!options.expand) return tokens;

  const expanded = new Set(tokens);
  for (const expansion of CONCEPT_EXPANSIONS) {
    if (expansion.triggers.some((trigger) => expanded.has(normalizeText(trigger)))) {
      expansion.add.forEach((token) => expanded.add(normalizeText(token)));
    }
  }
  return Array.from(expanded);
}

function phrasePresent(needle: string, haystack: string) {
  return normalizeText(haystack).includes(normalizeText(needle));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replaceAll("next-level", "next level")
    .replaceAll("same-day", "same day")
    .replaceAll("call-2", "call 2")
    .replaceAll("call-1", "call 1")
    .replaceAll("tier-1", "tier 1")
    .replaceAll("red-carpet", "red carpet")
    .replaceAll("pay-to-play", "pay to play")
    .replace(/\$2\s*,?\s*000/g, " $2000 2000 $2,000 ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBestSentence(text: string) {
  const cleaned = text
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^#+\s+/, "").trim())
    .filter((line) => line && !line.startsWith("|") && !line.includes("http"))
    .join(" ");
  const sentence = cleaned.match(/[^.!?]{35,260}[.!?]/)?.[0] || cleaned.slice(0, 240);
  return sentence.trim();
}

async function generateProviderAnswer(input: {
  question: string;
  displayQuestion: string;
  decision: RuntimeDecision;
}): Promise<ProviderResult> {
  const deepSeekKey = process.env.DEEPSEEK_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const errors: unknown[] = [];

  if (deepSeekKey) {
    try {
      return await callDeepSeek(input, deepSeekKey);
    } catch (error) {
      errors.push(error);
    }
  }

  if (anthropicKey) {
    try {
      return await callAnthropic(input, anthropicKey);
    } catch (error) {
      errors.push(error);
    }
  }

  throw new Error(`No Ask Sales FAQ provider succeeded. Attempts: ${errors.length}`);
}

async function callDeepSeek(
  input: { question: string; displayQuestion: string; decision: RuntimeDecision },
  apiKey: string,
): Promise<ProviderResult> {
  const model = process.env.FAQ_DEEPSEEK_MODEL || "deepseek-v4-pro";
  const response = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 850,
      messages: buildModelMessages(input),
    }),
  });

  const data = (await safeJson(response)) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) throw new Error(data?.error?.message || "DeepSeek request failed");

  const content = data?.choices?.[0]?.message?.content || "";
  return { provider: "deepseek", model, output: parseModelOutput(content) };
}

async function callAnthropic(
  input: { question: string; displayQuestion: string; decision: RuntimeDecision },
  apiKey: string,
): Promise<ProviderResult> {
  const model = process.env.FAQ_CLAUDE_MODEL || "claude-sonnet-4-6";
  const messages = buildModelMessages(input);
  const system = messages.find((message) => message.role === "system")?.content || "";
  const user = messages.find((message) => message.role === "user")?.content || input.question;

  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 850,
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const data = (await safeJson(response)) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) throw new Error(data?.error?.message || "Anthropic request failed");

  const content = data?.content?.find((part) => part.type === "text" && part.text)?.text || "";
  return { provider: "anthropic", model, output: parseModelOutput(content) };
}

function buildModelMessages(input: { question: string; displayQuestion: string; decision: RuntimeDecision }) {
  const sourceContext = input.decision.retrieved
    .slice(0, 6)
    .map((chunk, index) =>
      [
        `SOURCE ${index + 1}`,
        `Trust: ${chunk.trust_label}`,
        `Category: ${chunk.category}`,
        `Risk: ${chunk.risk_level}`,
        `Last reviewed: ${chunk.last_reviewed || "unknown"}`,
        `Text: ${chunk.text.slice(0, 1700)}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    {
      role: "system" as const,
      content: [
        "You are Ask Sales FAQ, an internal sales FAQ assistant for sales reps.",
        "Answer from the provided FAQ/evidence context only.",
        "Be useful and direct. Reps use this during live calls.",
        "If evidence is weaker or high-risk, give the best safe guidance and add a route note.",
        "Do not expose internal file paths, article statuses, raw Slack links, implementation details, or the phrase unapproved article.",
        "Return only JSON with keys: answer, summary, sections, needs_route, route_reason, confidence_label, confidence_score.",
        "sections must be an array of objects with title, optional body, optional items array, and optional tone: default, good, warning, or route.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        "USER QUESTION:",
        input.displayQuestion,
        "",
        "CONTEXTUAL QUESTION:",
        input.question,
        "",
        "RUNTIME DECISION:",
        input.decision.outcome,
        "",
        "CONFIDENCE:",
        `${input.decision.confidenceLabel} (${input.decision.confidenceScore}/100)`,
        "",
        "SOURCE CONTEXT:",
        sourceContext,
      ].join("\n"),
    },
  ];
}

function parseModelOutput(content: string): ModelOutput {
  const trimmed = content.trim();
  const jsonText = trimmed.match(/```json\s*([\s\S]*?)```/)?.[1] || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
  const parsed = JSON.parse(jsonText) as Partial<ModelOutput>;

  if (!parsed.answer || typeof parsed.needs_route !== "boolean") {
    throw new Error("Model output did not match Ask Sales FAQ schema");
  }

  return {
    answer: parsed.answer,
    summary: parsed.summary,
    sections: parsed.sections,
    needs_route: parsed.needs_route,
    route_reason: parsed.route_reason || "",
    confidence_label: parsed.confidence_label,
    confidence_score: parsed.confidence_score,
  };
}

function normalizeModelStructuredAnswer(
  output: ModelOutput,
  answer: string,
  decision: RuntimeDecision,
): AskSalesFaqStructuredAnswer {
  const sections = Array.isArray(output.sections)
    ? output.sections
        .filter((section) => section && typeof section.title === "string")
        .map((section) => ({
          title: String(section.title),
          body: typeof section.body === "string" ? sanitizeModelAnswer(section.body) : undefined,
          items: Array.isArray(section.items) ? section.items.filter((item): item is string => typeof item === "string").map(sanitizeModelAnswer) : undefined,
          tone: ["default", "good", "warning", "route"].includes(String(section.tone)) ? (section.tone as "default") : undefined,
        }))
    : [];

  return structured({
    summary: sanitizeModelAnswer(output.summary || answer),
    sections: sections.length ? sections : [{ title: "Answer", body: answer }],
    decision: {
      ...decision,
      confidenceLabel: output.confidence_label || decision.confidenceLabel,
      confidenceScore: typeof output.confidence_score === "number" ? output.confidence_score : decision.confidenceScore,
    },
  });
}

async function fetchWithTimeout(input: string, init: RequestInit) {
  const timeoutSeconds = Number(process.env.FAQ_MODEL_TIMEOUT_SECONDS || "20");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(5, timeoutSeconds) * 1000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function sanitizeModelAnswer(value: string) {
  return value
    .replace(/slack\/evidence\/\S+/gi, "internal evidence")
    .replace(/transcription\/transcripts\/\S+/gi, "training evidence")
    .replace(/knowledge-base\/\S+/gi, "FAQ source")
    .replace(/\bin_conflict\b/gi, "needs owner confirmation")
    .replace(/\bdraft article\b/gi, "internal evidence")
    .trim();
}

function containsHiddenTerms(answer: string) {
  return [
    "slack/evidence",
    "transcription/transcripts",
    "knowledge-base/",
    "article_id",
    "matched_rule_id",
    "default-abstain",
    "in_conflict",
  ].some((term) => answer.toLowerCase().includes(term));
}
