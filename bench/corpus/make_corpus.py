#!/usr/bin/env python3
"""Generate the labeled benchmark corpus (synthetic, seeded, stdlib only)."""
import json, random, string, base64, os, collections
random.seed(7)
R = random.Random(7)
A = string.ascii_letters + string.digits
def pick(cs, n): return "".join(R.choice(cs) for _ in range(n))
def alnum(n): return pick(A, n)
def upper(n): return pick(string.ascii_uppercase + string.digits, n)
def lower(n): return pick(string.ascii_lowercase + string.digits, n)
def digs(n): return pick(string.digits, n)
def hexs(n): return pick("0123456789abcdef", n)
def b64u(n): return pick(A + "-_", n)
def b64(n): return pick(A + "+/", n)
def uuid(): return f"{hexs(8)}-{hexs(4)}-4{hexs(3)}-a{hexs(3)}-{hexs(12)}"
def sha256(): return hexs(64)
def sha1(): return hexs(40)
def ghp(): return "ghp_" + alnum(36)
def akia(): return "AKIA" + upper(16)
def awssec(): return b64(40)
def sklive(): return "sk_live_" + alnum(R.choice([24, 32, 99 - 75]))
def sktest(): return "sk_test_" + alnum(R.choice([24, 32]))
def xoxb(): return f"xoxb-{digs(12)}-{digs(13)}-{alnum(24)}"
def openai(): return "sk-proj-" + b64u(R.choice([74, 120, 156]))
def anth(): return "sk-ant-api03-" + b64u(93) + "AA"
def aiza(): return "AIza" + b64u(35)
def hf(): return "hf_" + pick(string.ascii_letters, 34)
def npmt(): return "npm_" + alnum(36)
def sg(): return "SG." + b64u(22) + "." + b64u(43)
def twk(): return "SK" + hexs(32)
def glpat(): return "glpat-" + b64u(20)
def hook(): return f"https://hooks.slack.com/services/T{upper(8)}/B{upper(10)}/{alnum(24)}"
def e(o): return base64.urlsafe_b64encode(json.dumps(o, separators=(",", ":")).encode()).decode().rstrip("=")
def jwt(alg="HS256"):
    return e({"alg": alg, "typ": "JWT"}) + "." + e({"sub": digs(10), "name": "svc", "iat": 1730000000 + R.randint(0, 99999), "exp": 1740000000}) + "." + b64u(43)
def pkey(kind="RSA PRIVATE KEY"):
    lines = ["MIIEowIBAAKCAQEA" + b64(48)] + [b64(64) for _ in range(R.choice([6, 10]))] + [b64(R.randint(8, 60)) + "=="]
    return f"-----BEGIN {kind}-----\n" + "\n".join(lines) + f"\n-----END {kind}-----"
def luhn_ok(s):
    d = [int(c) for c in s][::-1]
    return sum(d[0::2]) + sum(sum(divmod(2 * x, 10)) for x in d[1::2]) % 10 == 0 if False else (sum(d[0::2]) + sum(sum(divmod(2 * x, 10)) for x in d[1::2])) % 10 == 0
def card(prefix="4", n=16):
    base = prefix + digs(n - len(prefix) - 1)
    for c in string.digits:
        if luhn_ok(base + c): return base + c
def badcard(prefix="4", n=16):
    c = card(prefix, n); return c[:-1] + str((int(c[-1]) + 3) % 10)
def iban_ok(s):
    t = s[4:] + s[:4]; return int("".join(str(int(c, 36)) for c in t)) % 97 == 1
def iban(cc, bban):
    t = bban + cc + "00"; n = int("".join(str(int(c, 36)) for c in t))
    return f"{cc}{98 - n % 97:02d}{bban}"
def ssn():
    return f"{R.choice([r for r in range(100, 665)])}-{R.randint(1,99):02d}-{R.randint(1,9999):04d}"
def pubip():
    return f"{R.choice([3,13,18,34,35,44,52,54,63,91,104,142,157,185,198])}.{R.randint(1,254)}.{R.randint(1,254)}.{R.randint(1,254)}"
def privip(): return R.choice([f"10.{R.randint(0,255)}.{R.randint(0,255)}.{R.randint(2,254)}", f"192.168.{R.randint(0,255)}.{R.randint(2,254)}", f"172.{R.randint(16,31)}.{R.randint(0,255)}.{R.randint(2,254)}"])
def mac(): return ":".join(hexs(2) for _ in range(6))
def ip6(): return ":".join(hexs(4) for _ in range(8))

cases = []
def add(kind, text, labels=()):
    seen, out = set(), []
    for v, t in labels:
        if (v, t) not in seen: seen.add((v, t)); out.append({"value": v, "type": t})
    cases.append({"id": f"c{len(cases)+1:02d}", "kind": kind, "text": text, "labels": out})

# ---- c01 server log
ip1, ip2 = pubip(), pubip(); tok = alnum(32)
add("server-log", f"""2024-11-03T08:14:22.481Z INFO  [req {uuid()}] GET /api/v2/orders?page=2 200 14ms client={ip1}
2024-11-03T08:14:23.002Z INFO  [req {uuid()}] POST /api/v2/login 401 9ms client={ip2} user=dana.whitfield@acmefreight.com
2024-11-03T08:14:23.113Z WARN  [auth] Invalid password attempt for dana.whitfield@acmefreight.com (3rd failure)
2024-11-03T08:14:25.870Z DEBUG [http] Authorization: Bearer {tok}
2024-11-03T08:14:26.004Z INFO  listening on 0.0.0.0:8080 (pid 4412)
2024-11-03T08:14:26.390Z INFO  build {sha1()[:7]} version 3.4.1""",
    [(ip1, "IP_ADDRESS"), (ip2, "IP_ADDRESS"), ("dana.whitfield@acmefreight.com", "EMAIL"), (tok, "SECRET")])

# ---- c02 .env
gh, ak, sk = ghp(), akia(), awssec(); dbp = alnum(18)
add(".env", f"""# production env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://appuser:{dbp}@10.4.22.17:5432/appdb
AWS_ACCESS_KEY_ID={ak}
AWS_SECRET_ACCESS_KEY={sk}
GITHUB_TOKEN={gh}
REDIS_HOST=127.0.0.1
LOG_LEVEL=debug
SENTRY_DSN=${{SENTRY_DSN}}
STRIPE_KEY=<your-stripe-key>""",
    [(dbp, "PASSWORD"), ("10.4.22.17", "IP_ADDRESS"), (ak, "AWS_ACCESS_KEY"), (sk, "AWS_SECRET_KEY"), (gh, "GITHUB_TOKEN")])

# ---- c03 docker-compose (decoys heavy)
add("docker-compose", f"""version: "3.8"
services:
  web:
    image: nginx@sha256:{sha256()}
    ports:
      - "8080:80"
      - "127.0.0.1:9000:9000"
    environment:
      - DB_PASSWORD=${{DB_PASSWORD}}
      - API_KEY=changeme
      - SECRET_KEY=xxxxxxxxxxxxxxxx
  db:
    image: postgres:15.4
    environment:
      POSTGRES_PASSWORD: <your-password>
    healthcheck:
      test: ["CMD", "pg_isready"]
    networks: [backend]
# build {sha1()}""", [])

# ---- c04 shell history
tk = ghp(); hfk = hf()
add("shell-history", f"""  101  cd ~/projects/ml-demo
  102  git clone https://oauth2:{tk}@github.com/tamsin-ortega/ml-demo.git
  103  export HF_TOKEN={hfk}
  104  pip install -r requirements.txt
  105  python train.py --epochs 10
  106  docker run -p 5432:5432 -e POSTGRES_PASSWORD=Winter2024! postgres:15
  107  git log --oneline | head -3
  108  history | tail""", [(tk, "GITHUB_TOKEN"), (hfk, "HF_TOKEN"), ("Winter2024!", "PASSWORD")])

# ---- c05 curl
ok = openai(); ip = pubip()
add("curl", f"""curl https://api.openai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {ok}" \\
  -d '{{"model": "gpt-4o", "messages": [{{"role": "user", "content": "hi"}}]}}'

# also tried the internal proxy
curl -s http://{ip}:8000/health""", [(ok, "OPENAI_KEY"), (ip, "IP_ADDRESS")])

# ---- c06 SQL dump
c1, c2 = card("4"), card("5", 16); s1 = ssn(); ib = iban("DE", digs(18))
add("sql-dump", f"""-- MySQL dump 10.13  Distrib 8.0.34
INSERT INTO customers (id, name, email, phone, ssn) VALUES
 (1, 'Marcus Delgado', 'marcus.delgado@bluepeak.io', '+1 415-555-0178', '{s1}'),
 (2, 'Priya Raman', 'priya.r@bluepeak.io', '+44 20 7946 0958', NULL);
INSERT INTO payments (id, customer_id, card_number, iban, amount) VALUES
 (1, 1, '{c1}', '{ib}', 129.99),
 (2, 2, '{c2}', NULL, 54.00);
INSERT INTO sessions (id, created) VALUES ('{uuid()}', '2024-05-06 10:11:12');""",
    [("Marcus Delgado", "PERSON"), ("Priya Raman", "PERSON"), ("marcus.delgado@bluepeak.io", "EMAIL"), ("priya.r@bluepeak.io", "EMAIL"),
     ("+1 415-555-0178", "PHONE"), ("+44 20 7946 0958", "PHONE"), (s1, "SSN"), (c1, "CREDIT_CARD"), (c2, "CREDIT_CARD"), (ib, "IBAN")])

# ---- c07 JSON API
j = jwt(); em = "tobias.lund@nordhaven.se"
add("json-response", json.dumps({"status": "ok", "user": {"id": 4821, "email": em, "name": "Tobias Lund", "city": "Gothenburg"},
    "access_token": j, "request_id": uuid(), "created_at": "2024-08-19T12:00:00Z", "avatar": "data:image/png;base64," + b64(120)}, indent=2),
    [(j, "JWT"), (em, "EMAIL"), ("Tobias Lund", "PERSON"), ("Gothenburg", "LOCATION")])

# ---- c08 git config
add("git-config", f"""[user]
	name = Helena Voss
	email = helena.voss@kestrelworks.com
[remote "origin"]
	url = https://github.com/kestrelworks/pipeline.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main
# HEAD {sha1()}""", [("Helena Voss", "PERSON"), ("helena.voss@kestrelworks.com", "EMAIL")])

# ---- c09 support email
cc = card("37", 15); ph = "+1 (312) 555-0143"
add("support-email", f"""Subject: Charged twice!!

Hi team,

My name is Rachel Okafor and I live at 1420 Maple Street, Portland. I was charged twice for order #{digs(7)} on my card {cc}.
Please call me on {ph} or reply to rachel.okafor@gmail.com. My previous ticket was TKT-{digs(6)}.

Thanks,
Rachel""", [("Rachel Okafor", "PERSON"), ("1420 Maple Street", "LOCATION"), ("Portland", "LOCATION"), (cc, "CREDIT_CARD"), (ph, "PHONE"), ("rachel.okafor@gmail.com", "EMAIL")])

# ---- c10 slack message
sw = hook(); xb = xoxb()
add("slack-message", f"""[10:42] jmarsh: ok so the bot token is {xb} -- can someone rotate it?
[10:43] jmarsh: and the webhook for #alerts is {sw}
[10:44] kpatel: on it, the deploy is at commit {sha1()[:12]}
[10:45] kpatel: ETA 15 minutes""", [(xb, "SLACK_TOKEN"), (sw, "SLACK_WEBHOOK")])

# ---- c11 CSV
rows = []; labs = []
names = [("Olivia Brennan", "olivia.b@harborlight.org"), ("Wei Zhang", "wei.zhang@harborlight.org"), ("Samuel Adeyemi", "s.adeyemi@harborlight.org")]
for n_, em_ in names:
    p = f"+1 {R.randint(201,989)}-{R.randint(201,989)}-{R.randint(1000,9999)}"
    rows.append(f"{n_},{em_},{p},INV-{digs(6)}"); labs += [(n_, "PERSON"), (em_, "EMAIL"), (p, "PHONE")]
add("csv", "name,email,phone,invoice\n" + "\n".join(rows), labs)

# ---- c12 kubeconfig
tk2 = b64u(40); ip = pubip()
add("kubeconfig", f"""apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: {b64(180)}
    server: https://{ip}:6443
  name: prod-cluster
contexts:
- context: {{cluster: prod-cluster, user: deploy-bot}}
  name: prod
users:
- name: deploy-bot
  user:
    token: {tk2}
current-context: prod""", [(ip, "IP_ADDRESS"), (tk2, "SECRET")])

# ---- c13 CI log
npm = npmt(); sgk = sg()
add("ci-log", f"""Run actions/checkout@v4
  with: ref: {sha1()}
Run npm ci
npm WARN deprecated left-pad@1.3.0
added 412 packages in 11s
Run npm publish
npm notice Publishing to https://registry.npmjs.org/ with tag latest
//registry.npmjs.org/:_authToken={npm}
SENDGRID_API_KEY={sgk}
Error: 403 Forbidden - PUT https://registry.npmjs.org/@acme%2fui
Process completed with exit code 1.""", [(npm, "NPM_TOKEN"), (sgk, "SENDGRID_KEY")])

# ---- c14 python hardcoded
sl = sklive(); an = anth()
add("python-code", f'''import stripe, anthropic

stripe.api_key = "{sl}"
client = anthropic.Anthropic(api_key="{an}")

def charge(amount):
    return stripe.Charge.create(amount=amount, currency="usd", source="tok_visa")

MAX_RETRIES = 3
VERSION = "1.2.3.4-beta"
''', [(sl, "STRIPE_KEY"), (an, "ANTHROPIC_KEY")])

# ---- c15 JS code
gk = aiza(); tw = twk(); tsec = hexs(32)
add("js-code", f"""const config = {{
  googleMapsKey: '{gk}',
  twilioSid: '{tw}',
  twilioSecret: '{tsec}',
  apiBase: 'http://localhost:3000',
  retries: 3,
}};
module.exports = config;""", [(gk, "GOOGLE_API_KEY"), (tw, "TWILIO_KEY"), (tsec, "SECRET")])

# ---- c16 home-dir stack trace
add("stack-trace", f"""Traceback (most recent call last):
  File "/home/mkessler/code/inventory/app.py", line 88, in <module>
    main()
  File "/home/mkessler/code/inventory/db.py", line 41, in connect
    conn = psycopg2.connect(host="db.internal")
  File "/home/mkessler/.venv/lib/python3.11/site-packages/psycopg2/__init__.py", line 122, in connect
psycopg2.OperationalError: could not connect to server""", [("mkessler", "USERNAME")])

# ---- c17 Windows error report
add("error-report", r"""System.IO.FileNotFoundException: Could not find file 'C:\Users\jdoerr\Documents\reports\q3.xlsx'.
   at System.IO.FileStream.ValidateFileHandle(SafeFileHandle fileHandle)
   at ReportGen.Program.Main(String[] args) in C:\Users\jdoerr\source\repos\ReportGen\Program.cs:line 27
Machine: DESKTOP-7QK2LM  Version 10.0.19045.3693""", [("jdoerr", "USERNAME")])

# ---- c18 decoy-only: package/lock
add("package-lock", f"""{{
  "name": "dashboard",
  "version": "2.0.1",
  "dependencies": {{
    "lodash": {{"version": "4.17.21", "integrity": "sha512-{b64(86)}=="}},
    "ip-regex": {{"version": "10.2.0.1"}},
    "left-pad": {{"version": "1.2.3.4-beta"}}
  }},
  "resolved": "git+ssh://git@github.com/org/lib.git#{sha1()}"
}}""", [])

# ---- c19 decoy: placeholders in README
add("readme", """## Setup

Copy `.env.example` to `.env` and fill in:

```
OPENAI_API_KEY=<your-api-key>
DATABASE_URL=postgres://user:${DB_PASSWORD}@localhost:5432/app
SECRET_KEY=changeme
STRIPE_SECRET=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_PASSWORD=your_password_here
```

Then run `docker compose up` and open http://localhost:3000 or http://127.0.0.1:3000.""", [])

# ---- c20 decoy: failing Luhn cards, ids
add("checkout-test", f"""test_cards = [
    "{badcard('4')}",   # declined test
    "{badcard('5')}",
]
order_id = "ORD-{digs(8)}"
trace_id = "{uuid()}"
timestamp = 1730646000
port = 5432
checksum = "{sha256()}"
""", [])

# ---- c21 decoy: docker digests and git log
add("git-log", f"""commit {sha1()}
Author: CI Bot <noreply@github.com>
Date:   Mon Oct 7 09:12:44 2024 +0000

    bump base image to python@sha256:{sha256()}

commit {sha1()}
    fix flaky test (build 2024.10.07)""", [("noreply@github.com", "EMAIL")])

# ---- c22 decoy: base64 data
add("html-snippet", f"""<img src="data:image/png;base64,{b64(240)}==" alt="logo">
<script>window.__BUILD__="{sha1()}";</script>
<div data-id="{uuid()}">ok</div>""", [])

# ---- c23 URL secrets
sig = hexs(64); ak2 = akia(); tkq = alnum(40); gk2 = aiza()
add("urls", f"""https://bucket.s3.amazonaws.com/export.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential={ak2}%2F20241101%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature={sig}
https://api.example.org/v1/data?access_token={tkq}&format=json
https://maps.googleapis.com/maps/api/geocode/json?address=Berlin&key={gk2}
https://example.org/page?utm_source=news&page=3""",
    [(ak2, "AWS_ACCESS_KEY"), (sig, "URL_SECRET"), (tkq, "URL_SECRET"), (gk2, "GOOGLE_API_KEY")])

# ---- c24 PEM key
pk = pkey()
add("pem", f"""Here is my deploy key, why does ssh say invalid format?

{pk}

I copied it from the server at 192.168.1.50.""", [(pk, "PRIVATE_KEY"), ("192.168.1.50", "IP_ADDRESS")])

# ---- c25 openssh/ec key mix
pk2 = pkey("OPENSSH PRIVATE KEY")
add("pem", f"cat ~/.ssh/id_ed25519\n{pk2}\n", [(pk2, "PRIVATE_KEY")])

# ---- c26 IPv6 + MAC
i6 = ip6(); m = mac(); m2 = mac()
add("network-dump", f"""eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 {i6}  prefixlen 64
        ether {m}  txqueuelen 1000
wlan0: ether {m2}
route: default via 0.0.0.0 dev eth0
kernel 6.1.0.15 (build {sha1()[:8]})""", [(i6, "IP_ADDRESS"), (m, "MAC_ADDRESS"), (m2, "MAC_ADDRESS")])

# ---- c27 IBAN + SSN form
ib2 = iban("GB", "NWBK" + digs(14)); ib3 = iban("FR", digs(10) + upper(11) + digs(2)); s2 = ssn()
add("hr-form", f"""Employee: Gabriela Fontaine
SSN: {s2}
Payroll IBAN (UK): {ib2}
Backup IBAN (FR): {ib3}
Office: Lyon""", [("Gabriela Fontaine", "PERSON"), (s2, "SSN"), (ib2, "IBAN"), (ib3, "IBAN"), ("Lyon", "LOCATION")])

# ---- c28 gitlab + ORG
gl = glpat()
add("ci-config", f""".gitlab-ci.yml
deploy:
  script:
    - git clone https://deploy:{gl}@gitlab.com/quantumleaf/infra.git
    - ./deploy.sh --env prod
  # owner: Quantumleaf Technologies""", [(gl, "GITLAB_TOKEN"), ("Quantumleaf Technologies", "ORG")])

# ---- c29 mostly decoy ansible
pw = alnum(14)
add("ansible", f"""- hosts: web
  vars:
    ansible_become_pass: {pw}
    http_port: 8080
    app_version: 4.12.0.1
    image: registry.local/app@sha256:{sha256()}
    admin_email: ${{ADMIN_EMAIL}}
    api_token: "<your-api-token>"
""", [(pw, "PASSWORD")])

# ---- c30 MySQL CLI
pw2 = alnum(12) + "#9"
add("shell-history", f"""mysql -h 10.0.3.14 -u root -p{pw2} -e "SHOW DATABASES;"
mysqldump --user=backup --password={pw2} shop > /tmp/shop.sql
ls -la /var/backups
""", [("10.0.3.14", "IP_ADDRESS"), (pw2, "PASSWORD")])

# ---- c31 multi-secret JS
sk2 = sktest(); sk3 = sktest()
add("js-code", f"""// TODO remove before commit
const stripe = require('stripe')('{sk2}');
const backup = "{sk3}";
const PORT = 3000;
app.listen(PORT, () => console.log('up on 0.0.0.0:' + PORT));""", [(sk2, "STRIPE_KEY"), (sk3, "STRIPE_KEY")])

# ---- c32 decoy long log, no labels
lines = []
for i in range(40):
    lines.append(f"2024-11-01T10:{i:02d}:{R.randint(0,59):02d}Z INFO worker-{R.randint(1,8)} job={uuid()} duration={R.randint(5,900)}ms port=6379 status=ok")
add("server-log", "\n".join(lines), [])

# ---- c33 long mixed log (60 lines)
lines = []; labs = []
ipx = pubip(); tkn = b64u(36); ml = "ryan.calloway@meridian-labs.net"
for i in range(55):
    lines.append(f"[{i:02d}] 2024-11-01 12:{i:02d}:00 DEBUG cache hit key=item:{R.randint(1000,9999)} etag={hexs(32)}")
lines.insert(20, f"[20b] WARN login from {ipx} for {ml}")
lines.insert(41, f"[41b] DEBUG header X-Api-Token: {tkn}")
add("server-log", "\n".join(lines), [(ipx, "IP_ADDRESS"), (ml, "EMAIL"), (tkn, "SECRET")])

# ---- c34 SendGrid + Twilio python
sg2 = sg(); tw2 = twk()
add("python-code", f'''SENDGRID_API_KEY = "{sg2}"
TWILIO_API_KEY = "{tw2}"
FROM = "alerts@example.com"
def notify(): pass
''', [(sg2, "SENDGRID_KEY"), (tw2, "TWILIO_KEY"), ("alerts@example.com", "EMAIL")])

# ---- c35 JWT in cookie header
j2 = jwt("RS256"); sid = hexs(32)
add("http-request", f"""GET /dashboard HTTP/1.1
Host: app.internal.example.com
Cookie: session={sid}; token={j2}
User-Agent: Mozilla/5.0 (X11; Linux x86_64) Chrome/118.0.0.0
X-Request-Id: {uuid()}""", [(j2, "JWT"), (sid, "SECRET")])

# ---- c36 postgres connection strings
p1, p2 = alnum(16), alnum(20)
add("config", f"""[primary]
dsn = postgresql://svc_report:{p1}@pg-prod.internal:5432/reports
[replica]
dsn = mongodb+srv://analytics:{p2}@cluster0.mongodb.net/test
[local]
dsn = postgresql://postgres:postgres@localhost:5432/dev""", [(p1, "PASSWORD"), (p2, "PASSWORD")])

# ---- c37 short decoy
add("shell-history", f"""$ git rev-parse HEAD
{sha1()}
$ node --version
v20.11.1
$ docker images --digests
nginx latest sha256:{sha256()}""", [])

# ---- c38 support slack with org/person
add("slack-message", """Priya: Hey, the Salesforce integration for Globex Corporation is failing again.
Marco Bianchi from their IT team says it started after the Denver data center migration.
Can you ping him at marco.bianchi@globex.com?""", [("Salesforce", "ORG"), ("Globex Corporation", "ORG"), ("Marco Bianchi", "PERSON"), ("Denver", "LOCATION"), ("marco.bianchi@globex.com", "EMAIL")])

# ---- c39 cloud creds file
ak3 = akia(); sk4 = awssec(); ak4 = akia(); sk5 = awssec()
add("aws-credentials", f"""[default]
aws_access_key_id = {ak3}
aws_secret_access_key = {sk4}

[staging]
aws_access_key_id = {ak4}
aws_secret_access_key = {sk5}
region = us-west-2""", [(ak3, "AWS_ACCESS_KEY"), (sk4, "AWS_SECRET_KEY"), (ak4, "AWS_ACCESS_KEY"), (sk5, "AWS_SECRET_KEY")])

# ---- c40 mixed app config yaml with decoys
pw3 = alnum(15); ci = "client-" + alnum(8); cs = b64u(40); hip = privip()
add("config", f"""server:
  host: {hip}
  port: 8443
  version: 5.0.2.1
oauth:
  client_id: {ci}
  client_secret: {cs}
smtp:
  user: mailer
  password: {pw3}
  from: no-reply@trellis-app.io
build: {sha1()[:10]}
password: ${{SMTP_PASSWORD}}""", [(hip, "IP_ADDRESS"), (cs, "SECRET"), (pw3, "PASSWORD"), ("no-reply@trellis-app.io", "EMAIL")])

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "cases.json"), "w") as f: json.dump(cases, f, indent=1)

# ---- verify
cnt = collections.Counter()
for c in cases:
    for l in c["labels"]:
        assert l["value"] in c["text"], (c["id"], l)
        cnt[l["type"]] += 1
        if l["type"] == "CREDIT_CARD": assert luhn_ok(l["value"]), l
        if l["type"] == "IBAN": assert iban_ok(l["value"]), l
zero = sum(1 for c in cases if not c["labels"]); few = sum(1 for c in cases if len(c["labels"]) <= 2)
print(len(cases), "cases; zero-label:", zero, "; <=2 labels:", few)
print(sum(cnt.values()), dict(sorted(cnt.items())))
