import { detect } from "./detect";
import type { Category, Finding } from "./types";

export interface ChatMessage {
  conversation: string;
  title: string;
  time: number | null;
  text: string;
}

export interface AuditItem {
  value: string;
  type: string;
  category: Category;
  count: number;
  conversations: { id: string; title: string }[];
  first: number | null;
  last: number | null;
}

export interface AuditReport {
  source: "chatgpt" | "claude" | "text";
  conversations: number;
  messages: number;
  items: AuditItem[];
}

interface GptNode {
  message?: {
    author?: { role?: string };
    content?: { content_type?: string; parts?: unknown[]; text?: string };
    create_time?: number | null;
  } | null;
}
interface GptConversation {
  id?: string;
  conversation_id?: string;
  title?: string;
  create_time?: number;
  mapping?: Record<string, GptNode>;
}
interface ClaudeConversation {
  uuid?: string;
  name?: string;
  created_at?: string;
  chat_messages?: { sender?: string; text?: string; created_at?: string; content?: { type?: string; text?: string }[] }[];
}

export function parseExport(data: unknown): { source: AuditReport["source"]; conversations: number; messages: ChatMessage[] } {
  const list = Array.isArray(data) ? data : [];
  if (list.some((c) => c && typeof c === "object" && "mapping" in c)) {
    const messages: ChatMessage[] = [];
    (list as GptConversation[]).forEach((c, i) => {
      const id = c.conversation_id ?? c.id ?? String(i);
      for (const node of Object.values(c.mapping ?? {})) {
        const m = node.message;
        if (!m || m.author?.role !== "user") continue;
        const parts = m.content?.parts ?? (m.content?.text ? [m.content.text] : []);
        const text = parts.filter((p): p is string => typeof p === "string").join("\n");
        if (text.trim()) messages.push({ conversation: id, title: c.title ?? "Untitled", time: m.create_time ?? c.create_time ?? null, text });
      }
    });
    return { source: "chatgpt", conversations: list.length, messages };
  }
  if (list.some((c) => c && typeof c === "object" && "chat_messages" in c)) {
    const messages: ChatMessage[] = [];
    (list as ClaudeConversation[]).forEach((c, i) => {
      for (const m of c.chat_messages ?? []) {
        if (m.sender !== "human") continue;
        const text = m.text || (m.content ?? []).map((p) => p.text ?? "").join("\n");
        const time = m.created_at ? Date.parse(m.created_at) / 1000 : null;
        if (text.trim()) messages.push({ conversation: c.uuid ?? String(i), title: c.name || "Untitled", time, text });
      }
    });
    return { source: "claude", conversations: list.length, messages };
  }
  throw new Error("This doesn't look like a ChatGPT or Claude conversations export.");
}

const SEVERITY: Record<Category, number> = { secret: 0, personal: 1, name: 2 };

export function audit(parsed: ReturnType<typeof parseExport>, findNames?: (m: ChatMessage) => Finding[]): AuditReport {
  const items = new Map<string, AuditItem>();
  for (const m of parsed.messages) {
    for (const f of detect(m.text, { extra: findNames?.(m) })) {
      const key = f.value;
      let it = items.get(key);
      if (!it) {
        it = { value: f.value, type: f.type, category: f.category, count: 0, conversations: [], first: m.time, last: m.time };
        items.set(key, it);
      }
      it.count++;
      if (!it.conversations.some((c) => c.id === m.conversation)) it.conversations.push({ id: m.conversation, title: m.title });
      if (m.time !== null) {
        it.first = it.first === null ? m.time : Math.min(it.first, m.time);
        it.last = it.last === null ? m.time : Math.max(it.last, m.time);
      }
    }
  }
  const sorted = [...items.values()].sort(
    (a, b) => SEVERITY[a.category] - SEVERITY[b.category] || b.conversations.length - a.conversations.length || b.count - a.count,
  );
  return { source: parsed.source, conversations: parsed.conversations, messages: parsed.messages.length, items: sorted };
}

export const ROTATE: Record<string, { label: string; url: string }> = {
  GITHUB_TOKEN: { label: "Revoke on GitHub", url: "https://github.com/settings/tokens" },
  GITLAB_TOKEN: { label: "Revoke on GitLab", url: "https://gitlab.com/-/user_settings/personal_access_tokens" },
  AWS_ACCESS_KEY: { label: "Rotate in AWS IAM", url: "https://console.aws.amazon.com/iam/home#/security_credentials" },
  AWS_SECRET_KEY: { label: "Rotate in AWS IAM", url: "https://console.aws.amazon.com/iam/home#/security_credentials" },
  STRIPE_KEY: { label: "Roll in Stripe", url: "https://dashboard.stripe.com/apikeys" },
  OPENAI_KEY: { label: "Revoke on OpenAI", url: "https://platform.openai.com/api-keys" },
  ANTHROPIC_KEY: { label: "Revoke on Anthropic", url: "https://console.anthropic.com/settings/keys" },
  GOOGLE_API_KEY: { label: "Rotate in Google Cloud", url: "https://console.cloud.google.com/apis/credentials" },
  SLACK_TOKEN: { label: "Rotate in Slack", url: "https://api.slack.com/apps" },
  SLACK_WEBHOOK: { label: "Regenerate in Slack", url: "https://api.slack.com/apps" },
  HF_TOKEN: { label: "Revoke on Hugging Face", url: "https://huggingface.co/settings/tokens" },
  NPM_TOKEN: { label: "Revoke on npm", url: "https://www.npmjs.com/settings/~/tokens" },
  PYPI_TOKEN: { label: "Revoke on PyPI", url: "https://pypi.org/manage/account/token/" },
  SENDGRID_KEY: { label: "Revoke in SendGrid", url: "https://app.sendgrid.com/settings/api_keys" },
  TWILIO_KEY: { label: "Revoke in Twilio", url: "https://console.twilio.com/us1/account/keys-credentials/api-keys" },
  DISCORD_TOKEN: { label: "Reset in Discord", url: "https://discord.com/developers/applications" },
};
