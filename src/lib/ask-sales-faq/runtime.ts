import type { AskSalesFaqOutcome, AskSalesFaqResponse } from "@/lib/ask-sales-faq/types";
import {
  APPROVED_FAQ_ARTICLES,
  ASK_SALES_FAQ_POLICY_RULES,
  type ApprovedFaqArticle,
  type AskSalesFaqRule,
} from "@/lib/ask-sales-faq/generated/approved-faq-bundle";

const ANSWER_BEHAVIORS = new Set<AskSalesFaqOutcome>([
  "answer_from_approved_article",
  "route_from_approved_article",
]);

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
  "no",
  "not",
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

const SAFE_FAILURE_RESPONSE =
  "I could not generate a reliable answer from the approved FAQ context right now. Please check the approved FAQ/source or route the question instead of guessing.";

const DEFAULT_ABSTAIN_RESPONSE =
  "I don't have a confirmed answer for that yet. Do not guess or use old Slack/docs. Route it to the right sales owner or current help channel before replying.";

const ADMIN_ONLY_RESPONSE =
  "This is an admin or maintenance question, not a normal sales-rep answer. Keep it in the admin workflow. Slack can signal updates, but it cannot change FAQ answers until an approved update is made.";

const BLOCKED_TOPIC_RESPONSES: Record<string, string> = {
  "call-1-flow":
    "This Call 1 pricing or investment wording is not confirmed yet. Do not quote a rule from memory. Route this to Rich or sales leadership before telling the prospect.",
  "call-2-close-and-license-flow":
    "The post-payment or signature handoff steps are not confirmed yet. Route this to the current sales/ops owner before telling the client what happens next.",
  "contracts-edits-and-signature-process":
    "Contract edits, addenda, attorney review, or full-contract-before-payment wording is not approved yet. Do not edit or promise contract handling from memory; route this to Rich, contracts, or legal.",
  "twenty-percent-dial-out-sop":
    "The 20 percent lead-ownership rule is not confirmed yet. Do not claim a specific limit, ownership window, or commenting rule from memory. Route this to the current owner.",
  "greenlight-pdf-and-cohort-deadlines":
    "The greenlight, cohort-deadline, no-show, or reapply rule is not confirmed yet. Do not quote caps or timelines from old messages. Route this to the greenlight owner.",
  "qualification-and-show-fit-rubric":
    "This is a sensitive qualification/show-fit question. Do not give a yes/no answer from memory. Route it to sales leadership or compliance for the current decision.",
  "sales-tech-routing-and-support-requests":
    "The sales-tech routing rule is not confirmed yet. Do not tell the rep to use Slack or the ticket desk as a final answer until that route is confirmed. Route this to the current owner.",
  "calendars-recordings-and-zoom-phone":
    "Calendar, rebooking, or Zoom Phone troubleshooting steps are not confirmed yet. Route this to the current sales-tech owner instead of giving exact steps.",
  "opt-out-dnc-and-security-escalation":
    "This needs compliance, security, or privacy handling. Do not continue from memory or leave sensitive details in the chat. Route it to the appropriate owner right away.",
  "events-mastermind-red-carpet":
    "The current event source for Mastermind/red-carpet fees, refundability, dates, or access terms is not confirmed yet. Do not quote old messages. Route this to the current event/source owner.",
  "new-rep-onboarding-and-final-mock":
    "The new-rep onboarding or final mock checklist is not approved yet. Route this to the current training owner instead of giving a final checklist.",
};

type GuardDecision = {
  decision: AskSalesFaqOutcome;
  safeToGenerate: boolean;
  matchedRuleId: string;
  reason: string;
  articleId: string | null;
  blockedTopic: string | null;
  retrieved: Array<{ articleId: string; title: string; score: number }>;
};

type ModelOutput = {
  outcome: "answered" | "answered_with_route";
  answer: string;
  needs_route: boolean;
  route_reason: string;
  source_label: string;
  source_last_reviewed: string;
};

type ProviderResult = {
  provider: "deepseek" | "anthropic";
  model: string;
  output: ModelOutput;
};

export type AskSalesFaqRuntimeResult = AskSalesFaqResponse & {
  sanitizedQuestion: string;
  matchedArticleId: string | null;
  errorClass: string | null;
};

export async function runAskSalesFaq(question: string): Promise<AskSalesFaqRuntimeResult> {
  const startedAt = Date.now();
  const { text: sanitizedQuestion, redactions } = redactSensitiveText(question);
  const decision = decideQuestion(sanitizedQuestion);

  if (!decision.safeToGenerate) {
    return {
      ok: true,
      conversationId: "",
      messageId: "",
      answer: noModelResponse(decision),
      outcome: decision.decision,
      source: null,
      model: null,
      provider: null,
      needsRoute: decision.decision !== "admin_only",
      routeReason: decision.reason,
      redactions,
      latencyMs: Date.now() - startedAt,
      sanitizedQuestion,
      matchedArticleId: decision.articleId,
      errorClass: null,
    };
  }

  const article = APPROVED_FAQ_ARTICLES.find((candidate) => candidate.id === decision.articleId);
  if (!article) {
    return safeFallback(startedAt, sanitizedQuestion, redactions, "missing_article");
  }

  try {
    const providerResult = await generateProviderAnswer({
      question: sanitizedQuestion,
      article,
      decision,
    });

    const answer = providerResult.output.answer.trim();
    if (!answer || containsHiddenTerms(answer)) {
      return safeFallback(startedAt, sanitizedQuestion, redactions, "unsafe_model_output");
    }

    return {
      ok: true,
      conversationId: "",
      messageId: "",
      answer,
      outcome: decision.decision,
      source: {
        label: article.title,
        lastReviewed: article.lastReviewed,
        approved: true,
        expandableDetails: `Approved by ${article.approvedBy} on ${article.approvedAt}.`,
      },
      model: providerResult.model,
      provider: providerResult.provider,
      needsRoute: providerResult.output.needs_route,
      routeReason: providerResult.output.route_reason || null,
      redactions,
      latencyMs: Date.now() - startedAt,
      sanitizedQuestion,
      matchedArticleId: article.id,
      errorClass: null,
    };
  } catch (error) {
    console.error("Ask Sales FAQ provider failed", error);
    return safeFallback(startedAt, sanitizedQuestion, redactions, "provider_failure");
  }
}

function safeFallback(
  startedAt: number,
  sanitizedQuestion: string,
  redactions: string[],
  errorClass: string,
): AskSalesFaqRuntimeResult {
  return {
    ok: true,
    conversationId: "",
    messageId: "",
    answer: SAFE_FAILURE_RESPONSE,
    outcome: "safe_fallback",
    source: null,
    model: null,
    provider: null,
    needsRoute: true,
    routeReason: "The approved FAQ runtime could not produce a verified answer.",
    redactions,
    latencyMs: Date.now() - startedAt,
    sanitizedQuestion,
    matchedArticleId: null,
    errorClass,
  };
}

function noModelResponse(decision: GuardDecision) {
  if (decision.decision === "admin_only") return ADMIN_ONLY_RESPONSE;
  if (decision.blockedTopic && BLOCKED_TOPIC_RESPONSES[decision.blockedTopic]) {
    return BLOCKED_TOPIC_RESPONSES[decision.blockedTopic];
  }
  return DEFAULT_ABSTAIN_RESPONSE;
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

  const secretPattern = /\b(password|passcode|api key|secret|token)\s*[:=]\s*\S+/gi;
  text = text.replace(secretPattern, (match, label: string) => {
    redactions.add("secret");
    return `${label}: [REDACTED_SECRET]`;
  });

  return { text, redactions: Array.from(redactions).sort() };
}

function decideQuestion(question: string): GuardDecision {
  const retrieved = retrieve(question, 5);

  for (const rules of [
    ASK_SALES_FAQ_POLICY_RULES.adminOnlyRules,
    ASK_SALES_FAQ_POLICY_RULES.abstainRules,
    ASK_SALES_FAQ_POLICY_RULES.routeRules,
    ASK_SALES_FAQ_POLICY_RULES.answerRules,
  ]) {
    for (const rule of rules) {
      if (ruleMatches(question, rule)) {
        return {
          decision: rule.decision,
          safeToGenerate: ANSWER_BEHAVIORS.has(rule.decision),
          matchedRuleId: rule.id,
          reason: rule.reason,
          articleId: rule.article_id || null,
          blockedTopic: rule.blocked_topic || null,
          retrieved,
        };
      }
    }
  }

  return {
    decision: ASK_SALES_FAQ_POLICY_RULES.defaultDecision.decision,
    safeToGenerate: false,
    matchedRuleId: "default-abstain",
    reason: ASK_SALES_FAQ_POLICY_RULES.defaultDecision.reason,
    articleId: null,
    blockedTopic: null,
    retrieved,
  };
}

function ruleMatches(question: string, rule: AskSalesFaqRule) {
  const normalizedQuestion = normalizeText(question);

  if (rule.match_all?.length && !rule.match_all.every((phrase) => phrasePresent(phrase, normalizedQuestion))) {
    return false;
  }

  if (rule.match_any?.length && !rule.match_any.some((phrase) => phrasePresent(phrase, normalizedQuestion))) {
    return false;
  }

  for (const group of rule.match_any_groups || []) {
    if (!group.some((phrase) => phrasePresent(phrase, normalizedQuestion))) {
      return false;
    }
  }

  return Boolean(rule.match_all?.length || rule.match_any?.length || rule.match_any_groups?.length);
}

function retrieve(question: string, topK: number) {
  return APPROVED_FAQ_ARTICLES.map((article) => ({
    articleId: article.id,
    title: article.title,
    score: scoreArticle(question, article),
  }))
    .sort((left, right) => right.score - left.score || left.articleId.localeCompare(right.articleId))
    .slice(0, topK);
}

function scoreArticle(question: string, article: ApprovedFaqArticle) {
  const queryTokens = tokenize(question);
  const articleTokens = tokenize(`${article.id} ${article.title} ${article.category} ${article.body}`);
  let score = 0;

  for (const token of queryTokens) {
    const frequency = articleTokens.filter((candidate) => candidate === token).length;
    if (frequency) score += 1 + Math.log(frequency);
  }

  return Number(score.toFixed(6));
}

function tokenize(value: string) {
  return normalizeText(value)
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 1 && !STOPWORDS.has(token)) || [];
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
    .replaceAll("charged twice", "duplicate charge")
    .replaceAll("charged two times", "duplicate charge")
    .replaceAll("double charged", "duplicate charge")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateProviderAnswer(input: {
  question: string;
  article: ApprovedFaqArticle;
  decision: GuardDecision;
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
  input: { question: string; article: ApprovedFaqArticle; decision: GuardDecision },
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
      max_tokens: 450,
      messages: buildModelMessages(input),
    }),
  });

  const data = (await safeJson(response)) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || "DeepSeek request failed");
  }

  const content = data?.choices?.[0]?.message?.content || "";
  return {
    provider: "deepseek",
    model,
    output: parseModelOutput(content),
  };
}

async function callAnthropic(
  input: { question: string; article: ApprovedFaqArticle; decision: GuardDecision },
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
      max_tokens: 450,
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const data = (await safeJson(response)) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || "Anthropic request failed");
  }

  const content = data?.content?.find((part) => part.type === "text" && part.text)?.text || "";
  return {
    provider: "anthropic",
    model,
    output: parseModelOutput(content),
  };
}

function buildModelMessages(input: { question: string; article: ApprovedFaqArticle; decision: GuardDecision }) {
  const routeRequired = input.decision.decision === "route_from_approved_article";
  return [
    {
      role: "system" as const,
      content: [
        "You are Ask Sales FAQ, an internal sales FAQ assistant for reps.",
        "Answer only from the approved article context provided in this request.",
        "Keep answers short, direct, and useful during live calls.",
        "If the approved context does not answer the exact question, say what is safe to say and route the unresolved part.",
        "Do not use outside knowledge, raw Slack, transcripts, old docs, or memory.",
        "Do not invent prices, discounts, legal terms, payment exceptions, qualification rules, or compliance wording.",
        "Return only JSON with keys: outcome, answer, needs_route, route_reason, source_label, source_last_reviewed.",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: [
        "QUESTION:",
        input.question,
        "",
        "GUARD DECISION:",
        input.decision.decision,
        "",
        "ROUTE REQUIRED:",
        routeRequired ? "yes" : "no",
        "",
        "APPROVED ARTICLE CONTEXT:",
        `Title: ${input.article.title}`,
        `Category: ${input.article.category}`,
        `Last reviewed: ${input.article.lastReviewed}`,
        "",
        input.article.body,
        "",
        "JSON OUTPUT RULES:",
        '- outcome must be "answered" or "answered_with_route".',
        "- answer must be short and rep-facing.",
        "- needs_route must be true when route is required.",
        "- source_label must be the article title.",
        "- source_last_reviewed must be the provided last reviewed date.",
      ].join("\n"),
    },
  ];
}

function parseModelOutput(content: string): ModelOutput {
  const trimmed = content.trim();
  const jsonText = trimmed.match(/```json\s*([\s\S]*?)```/)?.[1] || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed;
  const parsed = JSON.parse(jsonText) as Partial<ModelOutput>;

  if (
    !parsed.answer ||
    !parsed.outcome ||
    !["answered", "answered_with_route"].includes(parsed.outcome) ||
    typeof parsed.needs_route !== "boolean" ||
    !parsed.source_label ||
    !parsed.source_last_reviewed
  ) {
    throw new Error("Model output did not match Ask Sales FAQ schema");
  }

  return {
    outcome: parsed.outcome,
    answer: parsed.answer,
    needs_route: parsed.needs_route,
    route_reason: parsed.route_reason || "",
    source_label: parsed.source_label,
    source_last_reviewed: parsed.source_last_reviewed,
  };
}

async function fetchWithTimeout(input: string, init: RequestInit) {
  const timeoutSeconds = Number(process.env.FAQ_MODEL_TIMEOUT_SECONDS || "20");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(5, timeoutSeconds) * 1000);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
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

function containsHiddenTerms(value: string) {
  return [
    "article_id",
    "default-abstain",
    "draft article",
    "in_conflict",
    "slack/evidence",
    "transcription/transcripts",
    ".md",
  ].some((term) => value.toLowerCase().includes(term));
}
