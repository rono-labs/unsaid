import type { Rule, TypeInfo } from "./types";
import { ibanValid, ipv4Valid, ipv6Valid, isPlaceholder, luhn, shannon } from "./validators";

export const TYPES: Record<string, TypeInfo> = {
  PRIVATE_KEY: { label: "Private key", category: "secret" },
  AWS_ACCESS_KEY: { label: "AWS access key", category: "secret" },
  AWS_SECRET_KEY: { label: "AWS secret key", category: "secret" },
  GITHUB_TOKEN: { label: "GitHub token", category: "secret" },
  GITLAB_TOKEN: { label: "GitLab token", category: "secret" },
  SLACK_TOKEN: { label: "Slack token", category: "secret" },
  SLACK_WEBHOOK: { label: "Slack webhook", category: "secret" },
  STRIPE_KEY: { label: "Stripe key", category: "secret" },
  OPENAI_KEY: { label: "OpenAI key", category: "secret" },
  ANTHROPIC_KEY: { label: "Anthropic key", category: "secret" },
  GOOGLE_API_KEY: { label: "Google API key", category: "secret" },
  HF_TOKEN: { label: "Hugging Face token", category: "secret" },
  NPM_TOKEN: { label: "npm token", category: "secret" },
  PYPI_TOKEN: { label: "PyPI token", category: "secret" },
  SENDGRID_KEY: { label: "SendGrid key", category: "secret" },
  TWILIO_KEY: { label: "Twilio key", category: "secret" },
  DISCORD_TOKEN: { label: "Discord token", category: "secret" },
  JWT: { label: "JSON Web Token", category: "secret" },
  PASSWORD: { label: "Password", category: "secret" },
  SECRET: { label: "Secret value", category: "secret" },
  URL_SECRET: { label: "Secret in URL", category: "secret" },
  EMAIL: { label: "Email", category: "personal" },
  PHONE: { label: "Phone number", category: "personal" },
  CREDIT_CARD: { label: "Card number", category: "personal" },
  SSN: { label: "SSN", category: "personal" },
  IBAN: { label: "IBAN", category: "personal" },
  IP_ADDRESS: { label: "IP address", category: "personal" },
  MAC_ADDRESS: { label: "MAC address", category: "personal" },
  USERNAME: { label: "OS username", category: "personal" },
  PERSON: { label: "Person", category: "name" },
  ORG: { label: "Organization", category: "name" },
  LOCATION: { label: "Place", category: "name" },
  CUSTOM: { label: "Custom term", category: "secret" },
};

const s = (type: string, pattern: RegExp, extra: Partial<Rule> = {}): Rule => ({
  type,
  category: TYPES[type].category,
  label: TYPES[type].label,
  pattern,
  score: 0.99,
  ...extra,
});

const SECRET_KEY_NAME =
  String.raw`[A-Za-z0-9_.\-]*(?:password|passwd|passphrase|pwd|secret|token|api[_\-]?key|apikey|access[_\-]?key|auth[_\-]?key|client[_\-]?secret|credentials?|private[_\-]?key|session[_\-]?key|signing[_\-]?key|encryption[_\-]?key|master[_\-]?key|webhook[_\-]?secret|dsn)[A-Za-z0-9_\-]*`;

const NON_SECRET_KEY = /(?:_url|_uri|_endpoint|_path|_file|_type|_expires?|_expiry|_ttl|_length|_count|_limit|_header|_name|_id|_dir|_prefix|_policy|_rotation|_hint|_strength)$/i;

function assignedValue(value: string, m: RegExpExecArray): boolean {
  const key = m[1] ?? "";
  if (NON_SECRET_KEY.test(key)) return false;
  if (isPlaceholder(value)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return false;
  if (/^\d{1,9}$/.test(value)) return false;
  if (/^[([{]/.test(value)) return false;
  const isPassword = /pass|pwd/i.test(key);
  if (!isPassword && /^[A-Za-z]+$/.test(value) && value.length < 16) return false;
  return true;
}

function versionContext(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 12), start).toLowerCase();
  const after = text.slice(end, end + 2);
  if (/(?:version|ver|v|release|build|kernel|linux|os)[\s:="']*$/.test(before)) return true;
  if (/[a-z]\/$/i.test(before)) return true;
  if (/^[.-]\d/.test(after) || /^-[a-z]/i.test(after)) return true;
  return false;
}

export const RULES: Rule[] = [
  s("PRIVATE_KEY", /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?-----END (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/g),
  s("AWS_ACCESS_KEY", /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA|AIPA)[A-Z0-9]{16}\b/g),
  s(
    "AWS_SECRET_KEY",
    /(?:aws_?secret_?access_?key|secret_?access_?key|aws_?secret(?:_?key)?|SecretAccessKey)["']?\s*[:=]\s*["']?([A-Za-z0-9/+]{40})(?![A-Za-z0-9/+])/gi,
    { group: 1 },
  ),
  s("GITHUB_TOKEN", /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/g),
  s("GITLAB_TOKEN", /\bglpat-[A-Za-z0-9_-]{20,}\b/g),
  s("SLACK_WEBHOOK", /https:\/\/hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9_/\-]{20,}/g),
  s("SLACK_TOKEN", /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g),
  s("STRIPE_KEY", /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g),
  s("ANTHROPIC_KEY", /\bsk-ant-(?:api|admin)\d{2}-[A-Za-z0-9_-]{20,}/g),
  s("OPENAI_KEY", /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}(?:T3BlbkFJ[A-Za-z0-9_-]{20,})?/g, {
    validate: (v) => !v.startsWith("sk-ant-") && /\d/.test(v) && /[A-Za-z]/.test(v.slice(3)),
  }),
  s("GOOGLE_API_KEY", /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/g),
  s("HF_TOKEN", /\bhf_[A-Za-z0-9]{30,}\b/g),
  s("NPM_TOKEN", /\bnpm_[A-Za-z0-9]{36}\b/g),
  s("PYPI_TOKEN", /\bpypi-AgE[A-Za-z0-9_-]{50,}/g),
  s("SENDGRID_KEY", /\bSG\.[A-Za-z0-9_-]{16,32}\.[A-Za-z0-9_-]{30,64}\b/g),
  s("TWILIO_KEY", /\bSK[0-9a-f]{32}\b/g),
  s("DISCORD_TOKEN", /\b[MNO][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,38}\b/g),
  s("JWT", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g),
  s(
    "PASSWORD",
    /\b[a-z][a-z0-9+.-]{1,20}:\/\/[^\s:/@'"]*:([^\s@/'"]{3,})@[^\s/'"]+/gi,
    {
      group: 1,
      score: 0.98,
      validate: (v, m) =>
        !isPlaceholder(v) && !(/@(?:localhost|127\.0\.0\.1)\b/.test(m[0]) && /^(?:postgres|root|admin|password|secret|guest|test)$/.test(v)),
    },
  ),
  s(
    "SECRET",
    /\bAuthorization["']?\s*[:=]\s*["']?(?:Basic|Token|Bearer)\s+([A-Za-z0-9._~+/\-]{12,}=*)/gi,
    { group: 1, score: 0.96 },
  ),
  s("SECRET", /\b(?:Set-)?Cookie:[^\n]*?\b(?:session|sess|sid|token|auth|jwt|remember)[\w-]*=([^;\s]{16,})/gi, { group: 1, score: 0.93 }),
  s(
    "SECRET",
    /\b(?:x-api-key|api-key|x-auth-token|x-access-token|private-token|x-api-token|x-functions-key|ocp-apim-subscription-key)["']?\s*[:=]\s*["']?([A-Za-z0-9._~+/\-]{8,})/gi,
    { group: 1, score: 0.93, validate: (v) => !isPlaceholder(v) },
  ),
  s(
    "SECRET",
    /"key"\s*:\s*"[\w-]*(?:api[_-]?key|token|secret|password|auth)[\w-]*"\s*,\s*"value"\s*:\s*"([^"\n]{6,})"/gi,
    { group: 1, score: 0.93, validate: (v) => !isPlaceholder(v) && !/^\{\{.*\}\}$/.test(v) },
  ),
  s("PASSWORD", /\b(?:curl|wget|http|https)\b[^\n]*?\s(?:-u|--user)\s*["']?[^\s:"']+:([^\s"'@]{3,})/g, {
    group: 1,
    score: 0.94,
    validate: (v) => !isPlaceholder(v),
  }),
  s("PASSWORD", /(?:^|\s)(?:[\w-]+\.)*(?:key|psk|wpa_passphrase|wpa_psk)\s*=\s*["']?([^\s"']{8,})/gm, {
    group: 1,
    score: 0.85,
    validate: (v, m) => !isPlaceholder(v) && /(?:wireless|wifi|wlan|wpa|psk)/i.test(m[0] + v) || /psk|wpa/i.test(m[0]),
  }),
  s("SECRET", /\bBearer\s+([A-Za-z0-9._~+/\-]{16,}=*)/g, { group: 1, score: 0.95 }),
  s(
    "URL_SECRET",
    /[?&](?:access_token|refresh_token|id_token|token|api_key|apikey|api-key|key|sig|signature|secret|client_secret|auth|password|pwd|X-Amz-Signature|X-Amz-Credential|X-Amz-Security-Token|code|session|sessionid|sid)=([^&\s#"'<>]{6,})/gi,
    { group: 1, score: 0.93, validate: (v) => !isPlaceholder(v) },
  ),
  s(
    "PASSWORD",
    /(?:^|\s)--?(?:password|passwd|pass|pwd)(?:=|\s+)(["']?)([^\s"']{3,})\1/gim,
    { group: 2, score: 0.94, validate: (v) => !isPlaceholder(v) },
  ),
  s("PASSWORD", /\bmysql(?:dump|admin)?\b[^\n]*?\s-p([^\s"']{3,})/g, {
    group: 1,
    score: 0.94,
    validate: (v) => !isPlaceholder(v),
  }),
  s(
    "SECRET",
    /(?:^|\s)--?(?:token|api-key|apikey|secret|client-secret|access-key|auth-token)(?:=|\s+)(["']?)([^\s"']{6,})\1/gim,
    { group: 2, score: 0.92, validate: (v) => !isPlaceholder(v) },
  ),
  s(
    "PASSWORD",
    new RegExp(
      String.raw`(?<![A-Za-z0-9])((?:[A-Za-z0-9_.\-]*(?:password|passwd|passphrase|pwd|(?<![A-Za-z])pass(?![a-z]))[A-Za-z0-9_\-]*))["']?\s*(?:=>|:=|[:=])\s*(?:"([^"\n]{3,})"|'([^'\n]{3,})'|([^\s"',;}{)\]]{3,}))`,
      "gi",
    ),
    { score: 0.9 },
  ),
  s(
    "SECRET",
    new RegExp(
      String.raw`(?<![A-Za-z0-9])(${SECRET_KEY_NAME})["']?\s*(?:=>|:=|[:=])\s*(?:"([^"\n]{6,})"|'([^'\n]{6,})'|([^\s"',;}{)\]]{6,}))`,
      "gi",
    ),
    { score: 0.88 },
  ),
  s("EMAIL", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g, {
    score: 0.97,
    validate: (v, m, text) =>
      !/^git@(?:github|gitlab|bitbucket)\./i.test(v) &&
      !/\.(?:png|jpe?g|gif|svg|webp)$/i.test(v) &&
      !/(?:message-id|in-reply-to|references)\s*:\s*[^\n]*<$/i.test(text.slice(Math.max(0, m.index - 200), m.index)),
  }),
  s("CREDIT_CARD", /(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])/g, {
    score: 0.95,
    validate: (v) => {
      const d = v.replace(/[ -]/g, "");
      if (d.length < 13 || d.length > 19) return false;
      if (!/^(?:4|5[0-8]|2[2-7]|3[47]|6\d|35)/.test(d)) return false;
      if (/[ -]/.test(v) && !/^\d{4}([ -])\d{4,6}\1\d{4,5}(?:\1\d{1,4})?$/.test(v)) return false;
      return luhn(d);
    },
  }),
  s("SSN", /(?<![\d-])(\d{3})-(\d{2})-(\d{4})(?![\d-])/g, {
    score: 0.9,
    validate: (_v, m) => !/^(?:000|666|9\d\d)$/.test(m[1]) && m[2] !== "00" && m[3] !== "0000",
  }),
  s("IBAN", /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g, {
    score: 0.95,
    validate: (v) => ibanValid(v),
  }),
  s(
    "PHONE",
    /(?<![\w\-+./:])(?:\+?1[ .-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[ .-]?[2-9]\d{2}[ .-]\d{4}(?![\w\-/]|\.\d)/g,
    { score: 0.9 },
  ),
  s("PHONE", /(?<![\w+])\+(?:[2-9]\d{0,2})(?:[ .-]?\(?\d{1,4}\)?){2,5}(?![\w-])/g, {
    score: 0.88,
    validate: (v) => {
      const n = v.replace(/\D/g, "").length;
      return n >= 9 && n <= 15;
    },
  }),
  s("PHONE", /(?<![\w+])\+1[2-9]\d{2}[2-9]\d{6}(?!\d)/g, { score: 0.9 }),
  s("PASSWORD", /\b(?:password|passcode|passwd|pw)\s+(?:is|was)\s*:?\s+["'`]?([^\s"'`]{4,}?)["'`]?(?=[\s,;)]|\.(?:\s|$)|$)/gim, {
    group: 1,
    score: 0.86,
    validate: (v) => !isPlaceholder(v) && /[\d\W]/.test(v) && !/^(?:wrong|incorrect|correct|invalid|expired|required|not|too|the|my|a|an)$/i.test(v),
  }),
  s("PASSWORD", /^[^:\s#]+:(?:\d+|\*):[^:\s]+:[^:\s]+:(\S{4,})$/gm, { group: 1, score: 0.85, validate: (v) => !isPlaceholder(v) }),
  s("MAC_ADDRESS", /\b[0-9A-Fa-f]{2}(?:([:-])[0-9A-Fa-f]{2})(?:\1[0-9A-Fa-f]{2}){4}\b/g, {
    score: 0.9,
    validate: (v) => !/^(?:00[:-]){5}00$|^(?:ff[:-]){5}ff$/i.test(v),
  }),
  s("IP_ADDRESS", /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?!\w|\.\d)/g, {
    score: 0.9,
    validate: (v, m, text) =>
      ipv4Valid(v) && !versionContext(text, m.index, m.index + v.length) && !(/\.0$/.test(v) && text[m.index + v.length] === "/"),
  }),
  s("IP_ADDRESS", /(?<![\w:.])[0-9A-Fa-f]{0,4}(?::[0-9A-Fa-f]{0,4}){2,7}(?![\w:])/g, {
    score: 0.88,
    validate: (v) =>
      (/[a-f]/i.test(v) || v.includes("::")) &&
      v.split(":").filter(Boolean).length >= 2 &&
      !/^ff[0-9a-f]{2}:/i.test(v) &&
      ipv6Valid(v),
  }),
  s("USERNAME", /^(?:\$\s)?([a-z_][a-z0-9_-]{1,31})@[\w.-]+:\s?~/gm, { group: 1, score: 0.9 }),
  s("USERNAME", /(?:\/home\/|\/Users\/|[A-Za-z]:\\{1,2}Users\\{1,2})([A-Za-z0-9_][A-Za-z0-9_.\- ]{0,31}?)(?=[\\/]|\s|$|["'`:])/g, {
    group: 1,
    score: 0.9,
    validate: (v) => !/^(?:Public|Default|Default User|All Users|Shared|\$USER|%USERNAME%|<[^>]+>|USER|username|you|me)$/i.test(v),
  }),
];

const HEXISH = /^[0-9a-f]+$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeGenericSecret(token: string, before: string): boolean {
  if (token.length < 24 || token.length > 200) return false;
  if (HEXISH.test(token) || UUID.test(token)) return false;
  if (/^(?:sha\d+-|nonce-|AAAA[A-Za-z0-9+/]{20}|LS0tLS1CRUdJTiBDRVJU|LS0tLS1CRUdJTiBQVUJMSUM)/.test(token)) return false;
  if (/(?:ssh-(?:rsa|ed25519|dss)|ecdsa-sha2-nistp\d+)\s+$/.test(before)) return false;
  if (/(?:base64,|sha\d+[:-]|sha512-|nonce-|integrity["']?\s*[:=]\s*["']?|(?:certificate|cert|ca)[\w-]*["']?\s*[:=]\s*["']?)$/i.test(before)) return false;
  if (!/[A-Z]/.test(token) || !/[a-z]/.test(token) || !/\d/.test(token)) return false;
  if (/^[A-Za-z]+(?:[_\-./][A-Za-z]+)*$/.test(token)) return false;
  if (/[/]/.test(token) && /^[\w\-.]+(?:\/[\w\-.]+){2,}$/.test(token)) return false;
  return shannon(token) >= 4.3;
}

export { assignedValue };
