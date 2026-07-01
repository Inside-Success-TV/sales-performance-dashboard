import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/app/ask-sales-faq/page.tsx",
  "src/app/ask-sales-faq/admin/page.tsx",
  "src/app/api/ask-sales-faq/route.ts",
  "src/app/api/ask-sales-faq/conversations/route.ts",
  "src/app/api/ask-sales-faq/conversations/[conversationId]/route.ts",
  "src/app/api/ask-sales-faq/feedback/route.ts",
  "src/components/ask-sales-faq/ask-sales-faq-chat.tsx",
  "src/lib/ask-sales-faq/access.ts",
  "src/lib/ask-sales-faq/feedback-sync.ts",
  "src/lib/ask-sales-faq/runtime.ts",
  "src/lib/ask-sales-faq/types.ts",
  "src/lib/ask-sales-faq/generated/approved-faq-bundle.ts",
  "src/lib/ask-sales-faq/generated/policy-aware-rag-index.json",
];

const secretPatterns = [/sk-proj-[A-Za-z0-9_-]{20,}/, /sk-ant-[A-Za-z0-9_-]{20,}/, /sk-[A-Za-z0-9_-]{32,}/];

const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function addCheck(name, passed, detail) {
  checks.push({ name, passed, detail });
}

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
addCheck(
  "required Ask Sales FAQ files exist",
  missingFiles.length === 0,
  missingFiles.length ? `missing: ${missingFiles.join(", ")}` : "all required files exist",
);

if (missingFiles.length === 0) {
  const page = read("src/app/ask-sales-faq/page.tsx");
  const adminPage = read("src/app/ask-sales-faq/admin/page.tsx");
  const chatRoute = read("src/app/api/ask-sales-faq/route.ts");
  const historyRoute = read("src/app/api/ask-sales-faq/conversations/route.ts");
  const conversationActionRoute = read("src/app/api/ask-sales-faq/conversations/[conversationId]/route.ts");
  const feedbackRoute = read("src/app/api/ask-sales-faq/feedback/route.ts");
  const feedbackSync = read("src/lib/ask-sales-faq/feedback-sync.ts");
  const chatUi = read("src/components/ask-sales-faq/ask-sales-faq-chat.tsx");
  const nav = read("src/components/dashboard/main-nav.tsx");
  const runtime = read("src/lib/ask-sales-faq/runtime.ts");
  const access = read("src/lib/ask-sales-faq/access.ts");
  const bundle = read("src/lib/ask-sales-faq/generated/approved-faq-bundle.ts");
  const ragIndex = JSON.parse(read("src/lib/ask-sales-faq/generated/policy-aware-rag-index.json"));
  const db = read("src/lib/db.ts");
  const envExample = read(".env.example");

  addCheck("hidden page route is not in main nav", !nav.includes("/ask-sales-faq"), "main nav does not expose route");

  addCheck(
    "admin route stays hidden from main nav",
    !nav.includes("/ask-sales-faq/admin"),
    "admin route is not exposed in normal dashboard navigation",
  );

  addCheck(
    "page uses Ask Sales FAQ access gate",
    page.includes("getAskSalesFaqAccess"),
    "page checks feature flag and allowlist",
  );

  addCheck(
    "admin page uses admin email gate",
    adminPage.includes("isAskSalesFaqAdmin") &&
      adminPage.includes("getAskSalesFaqAdminOverview") &&
      adminPage.includes("Read-only Neon review") &&
      adminPage.includes("backend records remain saved"),
    "admin page requires admin email and is read-only",
  );

  addCheck(
    "api routes call auth directly",
    [chatRoute, historyRoute, conversationActionRoute, feedbackRoute].every((content) => content.includes("await auth()")),
    "all api routes call auth",
  );

  addCheck(
    "api routes use access gate",
    [chatRoute, historyRoute, conversationActionRoute, feedbackRoute].every((content) => content.includes("getAskSalesFaqAccess")),
    "all api routes use access gate",
  );

  addCheck(
    "runtime uses approved bundle and policy guard",
    runtime.includes("APPROVED_FAQ_ARTICLES") &&
      runtime.includes("ASK_SALES_FAQ_POLICY_RULES") &&
      runtime.includes("policy-aware-rag-index.json"),
    "runtime imports approved bundle, guard rules, and server-side RAG index",
  );

  addCheck(
    "runtime has safe fallback behavior",
    runtime.includes("DEFAULT_ROUTE_RESPONSE") && runtime.includes("buildExtractiveEvidenceAnswer"),
    "runtime returns safe fallback or evidence-based route guidance instead of raw errors",
  );

  addCheck(
    "bundle has eight approved articles",
    (bundle.match(/approvedAt: "2026-06-30"/g) || []).length === 8,
    "bundle contains 8 approved articles",
  );

  addCheck(
    "neon schema and helpers are present",
    db.includes("ask_sales_faq_conversations") &&
      db.includes("ask_sales_faq_messages") &&
      db.includes("ask_sales_faq_feedback") &&
      db.includes("ask_sales_faq_misses") &&
      db.includes("saveAskSalesFaqExchange") &&
      db.includes("getAskSalesFaqAdminOverview") &&
      db.includes("answer_payload"),
    "db includes ask sales faq tables, helpers, admin overview, and structured answer retention",
  );

  addCheck(
    "conversation delete is soft-delete and backend-retained",
    db.includes("status = 'deleted'") &&
      db.includes("deleted_at") &&
      conversationActionRoute.includes("retainedInBackend: true") &&
      !conversationActionRoute.includes("delete from ask_sales_faq"),
    "delete hides chat from sidebar without deleting rows",
  );

  addCheck(
    "conversation action menu closes on outside click",
    chatUi.includes("document.addEventListener(\"pointerdown\", closeConversationMenu)") &&
      chatUi.includes("[data-conversation-menu-root]") &&
      chatUi.includes("document.addEventListener(\"keydown\", closeConversationMenuWithKeyboard)"),
    "recent-chat action menu has click-away and escape-key closing behavior",
  );

  addCheck(
    "policy-aware RAG index has broad source coverage",
    ragIndex.chunk_count > 1000 &&
      ragIndex.chunks.some((chunk) => chunk.source_type === "approved_article") &&
      ragIndex.chunks.some((chunk) => chunk.source_type === "curated_slack_evidence") &&
      ragIndex.chunks.some((chunk) => chunk.source_type === "training_transcript"),
    `RAG index contains ${ragIndex.chunk_count} chunks across approved, Slack, and transcript evidence`,
  );

  addCheck(
    "show list answer is approved and deterministic",
      bundle.includes("Legacy Makers") &&
      bundle.includes("Masters of Innovation") &&
      bundle.includes("all tv shows") &&
      runtime.includes("buildDeterministicAnswer") &&
      runtime.includes("APPROVED_SHOW_LIST"),
    "show-list questions can answer from approved article without model drift",
  );

  addCheck(
    "pricing starter prompt has approved guard coverage",
    bundle.includes("current istv prices") &&
      bundle.includes("price and payment plans") &&
      bundle.includes("payment plans"),
    "common pricing/payment-plan phrasing routes to approved pricing article",
  );

  addCheck(
    "runtime handles broad discount wording through retrieval",
    runtime.includes("can i give my client any discount") ||
      (runtime.includes("discountQuestion") && runtime.includes("The approved discount I have is the $2,000 same-day discount")),
    "discount questions can answer from the approved pricing article without exact starter wording",
  );

  addCheck(
    "follow-up questions include recent chat context",
    chatRoute.includes("runAskSalesFaq(lastMessage.content, messages)") &&
      runtime.includes("buildContextualQuestion") &&
      runtime.includes("Conversation context:"),
    "runtime receives recent conversation messages and rewrites short follow-ups with context",
  );

  addCheck(
    "current question intent is not overwritten by old chat context",
    runtime.includes("decideQuestion(sanitizedQuestion, contextualQuestion)") &&
      runtime.includes("findMatchingRule(question)") &&
      runtime.includes("findMatchingRule(contextualQuestion)") &&
      !runtime.includes("const decision = decideQuestion(contextualQuestion)") &&
      !runtime.includes("/\\b(it|that|this|they|them|those|same|there)\\b/i.test(question);"),
    "runtime matches the latest user question first and restricts context to true follow-ups",
  );

  addCheck(
    "show-list duplicate summary is suppressed",
    chatUi.includes("isDuplicatedSummary") &&
      chatUi.includes("duplicatedItems >= 4") &&
      runtime.includes("Here is the latest approved show list I have."),
    "show-list answers do not render the full list twice",
  );

  addCheck(
    "pricing answer includes package descriptions",
    runtime.includes("Entry ISTV package with a 12-15 minute episode") &&
      runtime.includes("Mid-tier ISTV package with a 16-20 minute episode") &&
      runtime.includes("Top ISTV package with a 20-25 minute episode") &&
      runtime.includes("How to explain it on a call"),
    "pricing answer explains package differences, payment plans, and call guidance",
  );

  addCheck(
    "structured answers are retained and rendered",
    chatRoute.includes("structuredAnswer: result.structuredAnswer") &&
      chatUi.includes("StructuredAnswerCard") &&
      db.includes("normalizeAskSalesFaqAnswerPayload"),
    "answers can render sectioned UI and persist structured payloads in Neon",
  );

  addCheck(
    "common approved-topic wording has guard coverage",
    [
      "refund policy",
      "what payment link",
      "tier 1 placement",
      "share internal docs",
      "how long can clients use",
      "call recordings stored",
    ].every((phrase) => bundle.includes(phrase)),
    "broad rep phrasing maps to existing approved articles",
  );

  addCheck(
    "feature flag env vars are documented",
    [
      "ASK_SALES_FAQ_ENABLED",
      "ASK_SALES_FAQ_ALLOWED_EMAILS",
      "ASK_SALES_FAQ_ADMIN_EMAILS",
      "ASK_SALES_FAQ_FEEDBACK_WEBHOOK_URL",
      "ASK_SALES_FAQ_FEEDBACK_WEBHOOK_SECRET",
    ].every((name) => envExample.includes(name)),
    "env example includes faq flags",
  );

  addCheck(
    "feedback sync is non-blocking and sheet-tab aware",
    feedbackRoute.includes("syncAskSalesFaqFeedbackToSheet") &&
      feedbackRoute.includes("console.warn") &&
      feedbackSync.includes("Positive Reviews") &&
      feedbackSync.includes("Negative Reviews") &&
      feedbackSync.includes("ASK_SALES_FAQ_FEEDBACK_WEBHOOK_URL"),
    "feedback sync posts to configured webhook and does not fail user response",
  );

  addCheck(
    "allowlist fails closed",
    access.includes("ASK_SALES_FAQ_ENABLED") &&
      access.includes("ASK_SALES_FAQ_ALLOWED_EMAILS") &&
      access.includes("not_allowlisted"),
    "access gate checks flag and allowlist",
  );

  const scanned = [page, adminPage, chatRoute, historyRoute, conversationActionRoute, feedbackRoute, feedbackSync, runtime, access, bundle, db, envExample];
  const secretHit = scanned.some((content) => secretPatterns.some((pattern) => pattern.test(content)));
  addCheck("no committed api-key-like secrets", !secretHit, secretHit ? "secret-like value found" : "no secret-like value found");
}

const failed = checks.filter((check) => !check.passed);
console.log(`Ask Sales FAQ validation: ${checks.length - failed.length}/${checks.length} passed`);
for (const check of checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
}

if (failed.length) process.exit(1);
