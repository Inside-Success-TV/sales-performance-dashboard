"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  MessageSquarePlus,
  PanelLeft,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AskSalesFaqConversationSummary, AskSalesFaqResponse } from "@/lib/ask-sales-faq/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  outcome?: string | null;
  sourceLabel?: string | null;
  sourceLastReviewed?: string | null;
  sourceDetails?: string | null;
  needsRoute?: boolean;
  routeReason?: string | null;
  provider?: string | null;
  model?: string | null;
};

type FeedbackState = {
  messageId: string;
  rating: "up" | "down";
  comment: string;
  status: "idle" | "saving" | "saved" | "error";
};

const starterPrompts = [
  "What is the current Lite ISTV price?",
  "Can I say Apple TV is guaranteed?",
  "Where do I check current shows?",
];

export function AskSalesFaqChat({ viewerName }: { viewerName: string }) {
  const [conversations, setConversations] = useState<AskSalesFaqConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages],
  );

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isLoading]);

  async function loadConversations() {
    try {
      const response = await fetch("/api/ask-sales-faq/conversations", { cache: "no-store" });
      const data = (await response.json()) as {
        ok?: boolean;
        conversations?: AskSalesFaqConversationSummary[];
      };
      if (response.ok && data.ok) {
        setConversations(data.conversations || []);
      }
    } catch {
      setConversations([]);
    }
  }

  function startNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setFeedback(null);
    setError(null);
    setInput("");
  }

  function openConversation(conversation: AskSalesFaqConversationSummary) {
    setActiveConversationId(conversation.id);
    setMessages(
      conversation.messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          id: message.id,
          role: message.role as "user" | "assistant",
          content: message.content,
          outcome: message.outcome,
          sourceLabel: message.sourceLabel,
          sourceLastReviewed: message.sourceLastReviewed,
          needsRoute: message.needsRoute,
          routeReason: message.routeReason,
          provider: message.provider,
          model: message.model,
        })),
    );
    setFeedback(null);
    setError(null);
  }

  async function submitQuestion(event?: FormEvent<HTMLFormElement>, override?: string) {
    event?.preventDefault();
    const question = (override || input).trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: question,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/ask-sales-faq", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });
      const data = (await response.json()) as Partial<AskSalesFaqResponse> & { error?: string };

      if (!response.ok || !data.ok || !data.answer || !data.messageId || !data.conversationId) {
        throw new Error(data.error || "Ask Sales FAQ could not answer right now.");
      }

      const conversationId = data.conversationId;
      const assistantMessageId = data.messageId;
      const assistantAnswer = data.answer;

      setActiveConversationId(conversationId);
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: "assistant",
          content: assistantAnswer,
          outcome: data.outcome,
          sourceLabel: data.source?.label || null,
          sourceLastReviewed: data.source?.lastReviewed || null,
          sourceDetails: data.source?.expandableDetails || null,
          needsRoute: data.needsRoute,
          routeReason: data.routeReason,
          provider: data.provider,
          model: data.model,
        },
      ]);
      void loadConversations();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Ask Sales FAQ could not answer right now. Route the question instead of guessing.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: `local-safe-${Date.now()}`,
          role: "assistant",
          content: "Ask Sales FAQ could not answer reliably right now. Please route the question instead of guessing.",
          outcome: "safe_fallback",
          needsRoute: true,
          routeReason: message,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveFeedback(rating: "up" | "down", comment = "") {
    if (!lastAssistantMessage || !activeConversationId) return;
    const nextFeedback: FeedbackState = {
      messageId: lastAssistantMessage.id,
      rating,
      comment,
      status: "saving",
    };
    setFeedback(nextFeedback);

    try {
      const response = await fetch("/api/ask-sales-faq/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageId: lastAssistantMessage.id,
          conversationId: activeConversationId,
          rating,
          comment,
        }),
      });
      if (!response.ok) throw new Error("Feedback could not be saved.");
      setFeedback({ ...nextFeedback, status: "saved" });
    } catch {
      setFeedback({ ...nextFeedback, status: "error" });
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-112px)] overflow-hidden rounded-lg border border-slate-200 bg-white/90 shadow-sm lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside
        className={cn(
          "border-b border-slate-200 bg-slate-50/80 lg:border-b-0 lg:border-r",
          historyOpen ? "block" : "hidden lg:block",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-950">Ask Sales FAQ</p>
              <p className="text-xs text-slate-500">{viewerName}</p>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={startNewConversation} aria-label="New chat">
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {conversations.length ? (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => openConversation(conversation)}
                  className={cn(
                    "mb-1 flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    activeConversationId === conversation.id
                      ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-950",
                  )}
                >
                  <span className="line-clamp-2 font-semibold">{conversation.title || "Ask Sales FAQ chat"}</span>
                  <span className="text-xs text-slate-400">{new Date(conversation.updatedAt).toLocaleString()}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-slate-500">No saved chats yet.</div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setHistoryOpen((value) => !value)}
              aria-label="Toggle history"
            >
              <PanelLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-normal text-slate-950">Ask Sales FAQ</h1>
              <p className="truncate text-xs text-slate-500">Approved sales answers only</p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Hidden beta
          </Badge>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/70 px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {!messages.length ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">Start with a sales-policy question.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submitQuestion(undefined, prompt)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold text-slate-600 transition-colors hover:border-[#FCA5A5] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin text-[#DC2626]" />
                Checking approved FAQ context
              </div>
            ) : null}

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            ) : null}

            {lastAssistantMessage && activeConversationId ? (
              <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void saveFeedback("up")}>
                    <ThumbsUp className="size-3.5" />
                    Good
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFeedback({
                        messageId: lastAssistantMessage.id,
                        rating: "down",
                        comment: "",
                        status: "idle",
                      })
                    }
                  >
                    <ThumbsDown className="size-3.5" />
                    Needs fix
                  </Button>
                  {feedback?.status === "saved" ? <span className="text-xs text-emerald-700">Saved</span> : null}
                  {feedback?.status === "error" ? <span className="text-xs text-red-600">Could not save</span> : null}
                </div>
                {feedback?.rating === "down" && feedback.status !== "saved" ? (
                  <form
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveFeedback("down", feedback.comment);
                    }}
                  >
                    <Textarea
                      value={feedback.comment}
                      onChange={(event) => setFeedback({ ...feedback, comment: event.target.value })}
                      className="min-h-20 resize-none text-sm"
                      placeholder="What was wrong with this answer?"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={!feedback.comment.trim() || feedback.status === "saving"}>
                        Save feedback
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : null}

            <div ref={scrollRef} />
          </div>
        </div>

        <form onSubmit={submitQuestion} className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitQuestion();
                }
              }}
              className="min-h-12 flex-1 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
              placeholder="Ask a sales FAQ question"
              disabled={isLoading}
            />
            <Button type="submit" size="icon-lg" disabled={!input.trim() || isLoading} aria-label="Send question">
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(42rem,92%)] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm",
          isUser
            ? "bg-[#DC2626] text-white"
            : "border border-slate-200 bg-white text-slate-800",
        )}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {!isUser && (message.sourceLabel || message.needsRoute || message.provider) ? (
          <details className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-slate-500">
              Source details
              <ChevronDown className="size-3" />
            </summary>
            <div className="mt-2 space-y-1">
              {message.sourceLabel ? <p>{message.sourceLabel}</p> : null}
              {message.sourceLastReviewed ? <p>Last reviewed: {message.sourceLastReviewed}</p> : null}
              {message.sourceDetails ? <p>{message.sourceDetails}</p> : null}
              {message.needsRoute && message.routeReason ? <p>Route note: {message.routeReason}</p> : null}
              {message.provider && message.model ? <p>Model: {message.provider} / {message.model}</p> : null}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
