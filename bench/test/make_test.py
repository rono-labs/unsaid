#!/usr/bin/env python3
"""Held-out test corpus generator (seed 2026). Writes cases.json.gz next to this file."""
import json, random, string, base64, os, collections
R = random.Random(2026)
AN = string.ascii_letters + string.digits
HEX = "0123456789abcdef"
def rs(n, a=AN): return "".join(R.choice(a) for _ in range(n))
def hx(n): return rs(n, HEX)
def b64u(b): return base64.urlsafe_b64encode(b).decode().rstrip("=")
def uuid(): return f"{hx(8)}-{hx(4)}-4{hx(3)}-a{hx(3)}-{hx(12)}"
def jwt(payload):
    h = b64u(b'{"alg":"HS256","typ":"JWT"}')
    return h + "." + b64u(json.dumps(payload, separators=(",", ":")).encode()) + "." + rs(43, AN + "-_")
def luhn_ok(s):
    d = [int(c) for c in s if c.isdigit()][::-1]
    t = sum(d[0::2]) + sum(sum(divmod(2 * x, 10)) for x in d[1::2])
    return t % 10 == 0
def card(prefix, n=16, bad=False):
    body = prefix + "".join(str(R.randrange(10)) for _ in range(n - len(prefix) - 1))
    for c in range(10):
        if luhn_ok(body + str(c)): break
    if bad: c = (c + 3) % 10
    return body + str(c)
def iban(cc, blen, fmt_digits=True):
    bban = "".join(str(R.randrange(10)) for _ in range(blen))
    tmp = bban + "".join(str(ord(ch) - 55) for ch in cc) + "00"
    chk = 98 - int(tmp) % 97
    s = f"{cc}{chk:02d}{bban}"
    return " ".join(s[i:i+4] for i in range(0, len(s), 4))
def iban_ok(s):
    s = s.replace(" ", ""); r = s[4:] + s[:4]
    return int("".join(str(int(c, 36)) for c in r)) % 97 == 1
def ssn(): return f"{R.randint(100,665)}-{R.randint(10,99)}-{R.randint(1000,9999)}"
def sha(): return hx(40)
def sri(n=64): return base64.b64encode(bytes(R.randrange(256) for _ in range(n))).decode()
def aws_ak(): return "AKIA" + rs(16, string.ascii_uppercase + string.digits)
def aws_sk(): return rs(40, AN + "+/")
def gh(): return "ghp_" + rs(36)
def ghpat(): return "github_pat_" + rs(22) + "_" + rs(59)
def mac(): return ":".join(hx(2).upper() for _ in range(6))

CASES = []
def c(kind, text, *labels):
    CASES.append({"kind": kind, "text": text, "labels": [{"value": v, "type": t} for v, t in labels]})

# ---- secret-heavy ----
k, a, s = gh(), aws_ak(), aws_sk()
c("gha_log", f"""##[group]Run aws s3 sync ./dist s3://prod-assets
env:
  AWS_ACCESS_KEY_ID: {a}
  AWS_SECRET_ACCESS_KEY: {s}
  GITHUB_TOKEN: ***
##[endgroup]
2025-03-14T09:12:44.8812345Z fatal: could not read Username for 'https://github.com': terminal prompts disabled
2025-03-14T09:12:44.9Z git clone https://x-access-token:{k}@github.com/acme-co/api.git
Error: Process completed with exit code 128. (commit {sha()})""",
  (a,"AWS_ACCESS_KEY"),(s,"AWS_SECRET_KEY"),(k,"GITHUB_TOKEN"))

pw = rs(14)
c("vercel_build", f"""Vercel CLI 33.5.1
Cloning github.com/jdoe/portfolio (Branch: main, Commit: {sha()[:7]})
Running "install" command: `npm install`...
added 312 packages in 14s
Environment: DATABASE_URL=postgres://app_user:{pw}@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
Build Completed in /vercel/output [41s]
Deployed to https://portfolio-xyz.vercel.app [deployment dpl_{rs(9)}]""",
  (pw,"PASSWORD"))

nt, sg = rs(40, AN+"_-"), "SG." + rs(22, AN+"-_") + "." + rs(43, AN+"-_")
c("netlify_build", f"""12:01:03 PM: Netlify Build
12:01:03 PM: ❯ Version @netlify/build 29.20.4
12:01:04 PM: NETLIFY_AUTH_TOKEN={nt}
12:01:05 PM: SENDGRID_API_KEY={sg}
12:01:09 PM: Functions bundling complete in 3.2s
12:01:10 PM: Site is live ✨ (deploy {uuid()})""",
  (nt,"SECRET"),(sg,"SENDGRID_KEY"))

gk = "AIza" + rs(35, AN+"-_")
c("firebase_config", f"""const firebaseConfig = {{
  apiKey: "{gk}",
  authDomain: "todo-app-7c1f2.firebaseapp.com",
  projectId: "todo-app-7c1f2",
  storageBucket: "todo-app-7c1f2.appspot.com",
  messagingSenderId: "{R.randint(10**11,10**12-1)}",
  appId: "1:{R.randint(10**11,10**12-1)}:web:{hx(20)}"
}};
const app = initializeApp(firebaseConfig);""", (gk,"GOOGLE_API_KEY"))

anon = jwt({"iss":"supabase","ref":rs(20,string.ascii_lowercase),"role":"anon","iat":1712000000,"exp":2027000000})
svc = jwt({"iss":"supabase","ref":rs(20,string.ascii_lowercase),"role":"service_role","iat":1712000000,"exp":2027000000})
c("supabase", f"""NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY={anon}
SUPABASE_SERVICE_ROLE_KEY={svc}
# why does RLS still block my insert??""", (anon,"JWT"),(svc,"JWT"))

c("py_tb_windows", r"""Traceback (most recent call last):
  File "C:\Users\kbhatt22\AppData\Local\Programs\Python\Python311\lib\site-packages\requests\adapters.py", line 487, in send
    resp = conn.urlopen(
  File "C:\Users\kbhatt22\Documents\cs101\hw4\fetch.py", line 18, in <module>
    main()
requests.exceptions.ConnectionError: HTTPConnectionPool(host='localhost', port=8000): Max retries exceeded
Python 3.11.4 on Windows 10.0.19045.3803""", ("kbhatt22","USERNAME"))

c("py_tb_mac", """  File "/Users/priya.nair/dev/flask-demo/app.py", line 52, in login
    user = db.query(User).filter_by(email=form.email.data).first()
  File "/Users/priya.nair/.pyenv/versions/3.10.6/lib/python3.10/site-packages/sqlalchemy/orm/query.py", line 2870
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: user
Running on http://127.0.0.1:5000""", ("priya.nair","USERNAME"))

ok, hf = "sk-proj-" + rs(48, AN+"-_"), "hf_" + rs(34)
c("jupyter", json.dumps({"cell_type":"code","execution_count":3,"metadata":{},"outputs":[],
  "source":["import os\n", f"os.environ['OPENAI_API_KEY'] = '{ok}'\n", f"login(token='{hf}')\n", "df = pd.read_csv('data.csv')"]}, indent=1),
  (ok,"OPENAI_KEY"),(hf,"HF_TOKEN"))

ak, sk2, dbp = aws_ak(), aws_sk(), rs(18)
c("tfvars", f"""region     = "eu-west-1"
access_key = "{ak}"
secret_key = "{sk2}"
db_password = "{dbp}"
instance_type = "t3.micro"
vpc_cidr = "10.0.0.0/16"
""", (ak,"AWS_ACCESS_KEY"),(sk2,"AWS_SECRET_KEY"),(dbp,"PASSWORD"))

nn = "npm_" + rs(36)
c("npmrc", f"""registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken={nn}
@myorg:registry=https://npm.pkg.github.com
always-auth=true""", (nn,"NPM_TOKEN"))

pp = rs(16, AN+"_-")
pyt = "pypi-AgEIcHlwaS5vcmc" + rs(60)
c("pypirc", f"""[distutils]
index-servers =
    pypi
[pypi]
username = __token__
password = {pyt}
[testpypi]
username = devguy
password = {pp}""", (pyt, "PASSWORD"),(pp,"PASSWORD"))

bt, xk = rs(36, AN+"._-"), rs(32, HEX)
c("postman", json.dumps({"info":{"name":"Orders API","_postman_id":uuid()},"item":[{"name":"list","request":{"method":"GET","header":[{"key":"Authorization","value":"Bearer "+bt},{"key":"x-api-key","value":xk}],"url":{"raw":"{{base}}/orders"}}}]}, indent=2),
  (bt,"SECRET"),(xk,"SECRET"))

ck = rs(32, AN)
c("har", f"""{{"request":{{"method":"GET","url":"https://app.example.org/dashboard","headers":[{{"name":"Cookie","value":"_ga=GA1.2.{R.randint(10**8,10**9)}.1700000000; session={ck}; theme=dark"}},{{"name":"User-Agent","value":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"}}]}},"time":143.2,"startedDateTime":"2025-01-09T18:22:01.331Z"}}""",
  (ck,"SECRET"))

c("nginx_log", """203.0.113.57 - - [12/Mar/2025:10:14:22 +0000] "GET /wp-login.php HTTP/1.1" 404 153 "-" "Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36"
198.51.100.23 - alice [12/Mar/2025:10:14:25 +0000] "POST /api/v1/login HTTP/1.1" 200 512 "-" "curl/8.4.0"
127.0.0.1 - - [12/Mar/2025:10:14:26 +0000] "GET /healthz HTTP/1.1" 200 2 "-" "kube-probe/1.28"
192.168.1.44 - - [12/Mar/2025:10:14:30 +0000] "GET /static/app.js HTTP/1.1" 304 0""",
  ("203.0.113.57","IP_ADDRESS"),("198.51.100.23","IP_ADDRESS"),("192.168.1.44","IP_ADDRESS"))

xb = "xoxb-" + str(R.randint(10**11,10**12-1)) + "-" + str(R.randint(10**11,10**12-1)) + "-" + rs(24)
c("discord_chat", f"""[11:02] mira: the slack bot stopped posting after deploy
[11:03] dev_tom: did you rotate the token?
[11:03] mira: no, still {xb} in the config lol
[11:04] dev_tom: pls dont paste that here
[11:05] mira: oops. Anyway ping Sarah Whitfield, she owns it""",
  (xb,"SLACK_TOKEN"),("Sarah Whitfield","PERSON"))

wh = "https://hooks.slack.com/services/T" + rs(8, string.ascii_uppercase+string.digits) + "/B" + rs(10, string.ascii_uppercase+string.digits) + "/" + rs(24)
c("slack_webhook", f"""Alerts not firing. Here's the notifier:
requests.post("{wh}", json={{"text": "build failed"}})
Status 404 no_service""", (wh,"SLACK_WEBHOOK"))

c("resume", """Ananya Krishnamurthy
Flat 4B, Lake View Apartments, Bengaluru, Karnataka 560034
+91 98450 12367 | ananya.krishnamurthy@gmail.com

EXPERIENCE
Software Intern, Infosys Limited - Pune (Jun 2024 - Aug 2024)
Built REST APIs in Spring Boot; reduced latency by 30%.
EDUCATION
B.Tech Computer Science, PES University, GPA 8.9/10""",
  ("Ananya Krishnamurthy","PERSON"),("Bengaluru","LOCATION"),("+91 98450 12367","PHONE"),("ananya.krishnamurthy@gmail.com","EMAIL"),("Infosys Limited","ORG"),("Pune","LOCATION"),("PES University","ORG"))

c("cover_letter", """Dear Hiring Manager at Stripe,

I'm writing to apply for the Backend Engineer role. I live in Manchester and can be reached on +44 161 496 0873 or at liam.oconnor@outlook.com.

Sincerely,
Liam O'Connor""",
  ("Stripe","ORG"),("Manchester","LOCATION"),("+44 161 496 0873","PHONE"),("liam.oconnor@outlook.com","EMAIL"),("Liam O'Connor","PERSON"))

s1 = ssn()
c("doctor_note", f"""Riverside Pediatrics
Patient: Marcus T. Delgado   DOB: 04/17/2009   SSN: {s1}
Please excuse Marcus from PE until 10/02 due to a sprained ankle.
Dr. Helen Park, MD  Phone: (503) 555-0142""",
  ("Riverside Pediatrics","ORG"),("Marcus T. Delgado","PERSON"),(s1,"SSN"),("Helen Park","PERSON"),("(503) 555-0142","PHONE"))

s2 = ssn()
c("school_form", f"""FAFSA helper - student info
Name: Destiny Okafor
SSN: {s2}
Address: 2210 Maple Ave, Austin, TX 78704
Parent email: c.okafor@yahoo.com
Can you help me fill the dependency section?""",
  ("Destiny Okafor","PERSON"),(s2,"SSN"),("Austin","LOCATION"),("c.okafor@yahoo.com","EMAIL"))

ib = iban("DE", 18)
c("bank_email", f"""Subject: Rent payment March
Hi Katrin,
please transfer 850 EUR to IBAN {ib}, BIC COBADEFFXXX, reference RENT-{R.randint(1000,9999)}.
Thanks, Jonas Weber""",
  ("Katrin","PERSON"),(ib,"IBAN"),("Jonas Weber","PERSON"))

cc = card("4", 16)
c("order_json", json.dumps({"order_id":"ORD-"+str(R.randint(10**7,10**8)),"tracking":"1Z"+rs(16,string.ascii_uppercase+string.digits),"payment":{"number":cc,"exp":"09/28","cvv":"417"},"ship_to":{"name":"Hannah Berg","city":"Seattle"},"email":"hberg.shop@proton.me"}, indent=2),
  (cc,"CREDIT_CARD"),("Hannah Berg","PERSON"),("Seattle","LOCATION"),("hberg.shop@proton.me","EMAIL"))

m1, m2, wp = mac(), mac(), rs(12)
c("router_config", f"""wireless.radio0.ssid='HomeNet-5G'
wireless.radio0.key='{wp}'
dhcp.lan.ip=192.168.0.1
host laptop {{ hardware ethernet {m1.lower()}; fixed-address 192.168.0.23; }}
host printer {{ hardware ethernet {m2}; fixed-address 192.168.0.40; }}
wan_ip=86.14.201.9""",
  (wp,"PASSWORD"),("192.168.0.1","IP_ADDRESS"),(m1.lower(),"MAC_ADDRESS"),("192.168.0.23","IP_ADDRESS"),(m2,"MAC_ADDRESS"),("192.168.0.40","IP_ADDRESS"),("86.14.201.9","IP_ADDRESS"))

kp = rs(20)
whs = "whsec_" + rs(32)
c("k8s_secret", f"""apiVersion: v1
kind: Secret
metadata:
  name: api-creds
type: Opaque
stringData:
  DB_PASSWORD: {kp}
  STRIPE_WEBHOOK_SECRET: {whs}
  LOG_LEVEL: debug""", (kp,"PASSWORD"),(whs,"SECRET"))

sl = "sk_live_" + rs(24)
pkt = "pk_test_" + rs(24)
nas = rs(32,AN+"+/")
c("env_local", f"""NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY={pkt}
STRIPE_SECRET_KEY={sl}
NEXTAUTH_SECRET={nas}
NEXTAUTH_URL=http://localhost:3000""",
  (sl,"STRIPE_KEY"),(pkt,"STRIPE_KEY"),(nas,"SECRET"))

cp, ck2 = rs(10), rs(32, HEX)
c("curl", f"""curl -u admin:{cp} https://staging.internal.acme.io/api/users
curl -X POST https://api.example.com/v2/jobs -H "x-api-key: {ck2}" -d '{{"id":1}}'""",
  (cp,"PASSWORD"),(ck2,"SECRET"))

c("intl_phones", """Support contacts:
UK: +44 20 7946 0321
India: +91 98765 43210
Germany: +49 30 901820
Call Ms. Fischer before 5pm.""",
  ("+44 20 7946 0321","PHONE"),("+91 98765 43210","PHONE"),("+49 30 901820","PHONE"),("Fischer","PERSON"))

c("ipv6", """ip -6 addr:
  inet6 2001:db8:85a3::8a2e:370:7334/64 scope global
  inet6 fe80::1c2b:3dff:fe4a:9b10/64 scope link
  inet6 ::1/128 scope host
default via fe80::1 dev eth0""",
  ("2001:db8:85a3::8a2e:370:7334","IP_ADDRESS"),("fe80::1c2b:3dff:fe4a:9b10","IP_ADDRESS"),("fe80::1","IP_ADDRESS"))

wsec = "whsec_" + rs(32)
stt = "sk_test_" + rs(24)
c("stripe_hook", f"""stripe.WebhookSignatureVerificationError: No signatures found matching expected signature
endpoint_secret = "{wsec}"
client = stripe.StripeClient("{stt}")""",
  (wsec,"SECRET"),(stt,"STRIPE_KEY"))

an, tw = "sk-ant-api03-" + rs(93, AN+"-_"), "SK" + hx(32)
c("anthropic_twilio", f"""ANTHROPIC_API_KEY={an}
TWILIO_API_KEY={tw}
TWILIO_ACCOUNT_SID=AC{hx(32)}""", (an,"ANTHROPIC_KEY"),(tw,"TWILIO_KEY"))

gl, gp = "glpat-" + rs(20, AN+"-_"), ghpat()
c("gitlab_github", f"""git remote add origin https://oauth2:{gl}@gitlab.com/team/proj.git
export GH_TOKEN={gp}""", (gl,"GITLAB_TOKEN"),(gp,"GITHUB_TOKEN"))

pk = "-----BEGIN RSA PRIVATE KEY-----\n" + "\n".join(rs(64, AN+"+/") for _ in range(6)) + "\n-----END RSA PRIVATE KEY-----"
c("private_key", f"""ssh keeps rejecting me. my key:
{pk}
and the server is deploy@build-01""", (pk,"PRIVATE_KEY"))

sg2 = rs(64, HEX)
tk3 = rs(28)
c("signed_url", f"""Download link expired:
https://cdn.example.com/files/report.pdf?X-Amz-Expires=300&X-Amz-Signature={sg2}
https://api.example.com/export?format=csv&token={tk3}&page=2""",
  (sg2,"URL_SECRET"),(tk3,"URL_SECRET"))

xp = "xoxp-" + "-".join(str(R.randint(10**10,10**11-1)) for _ in range(3)) + "-" + hx(32)
c("slack_user", f"""SLACK_USER_TOKEN={xp}
# channel C{rs(10,string.ascii_uppercase+string.digits)}""", (xp,"SLACK_TOKEN"))

pgp = rs(16)
c("compose", f"""services:
  db:
    image: postgres:16.2
    environment:
      POSTGRES_PASSWORD: {pgp}
    ports: ["5432:5432"]
  web:
    build: .
    depends_on: [db]
    ports: ["8080:80"]
    extra_hosts: ["db.local:10.20.30.4"]""", (pgp,"PASSWORD"),("10.20.30.4","IP_ADDRESS"))

jt = jwt({"sub":"1234567890","name":"John Doe","iat":1516239022})
c("jwt_debug", f"""Authorization: Bearer {jt}
"Why does jwt.verify throw invalid signature?" Request id {uuid()}""", (jt,"JWT"))

# ---- decoy-heavy ----
c("pkg_lock", f"""    "node_modules/lodash": {{
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-{sri()}"
    }},
    "node_modules/react": {{ "version": "18.2.0", "integrity": "sha512-{sri()}" }}""")

c("docker_digests", f"""FROM node:20.11.1-alpine@sha256:{hx(64)}
docker pull ghcr.io/acme/web@sha256:{hx(64)}
docker ps: container {hx(12)}  0.0.0.0:8080->80/tcp
healthcheck: curl http://localhost:3000/health""")

png = base64.b64encode(bytes(R.randrange(256) for _ in range(90))).decode()
c("data_uri", f"""<img src="data:image/png;base64,iVBORw0KGgo{png}" alt="logo">
<script src="https://cdn.jsdelivr.net/npm/vue@3.4.21/dist/vue.global.js"></script>
body {{ margin: 0 }}""")

c("win_ua", """OS Name: Microsoft Windows 10 Pro
OS Version: 10.0.19045.3803 Build 19045
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91
node v20.10.0, npm 10.2.3""")

c("env_example", """# copy to .env
OPENAI_API_KEY=your-api-key-here
STRIPE_SECRET_KEY=sk_live_...
GITHUB_TOKEN=<TOKEN>
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=xxxxxxxxxxxxxxxx
const key = process.env.STRIPE_KEY;""")

c("bad_cards", f"""Test cards that keep failing validation:
{card('4',16,True)}
{card('5',16,True)}
Order #{R.randint(10**9,10**10)} tracking 9400 1118 9922 {R.randint(1000,9999)} {R.randint(1000,9999)} 00
Invoice INV-2025-{R.randint(1000,9999)}""")

c("git_log", f"""commit {sha()}
Author: build bot
Date:   Tue Mar 4 11:22:09 2025 +0000
    bump deps
commit {sha()}
    request id {uuid()}
    trace {uuid()}""")

c("isbn_ts", """Reading list:
ISBN 978-0-13-468599-1  Effective Java
ISBN-13: 978-1-4919-5017-3
Logged 2025-02-11T08:15:00Z, epoch 1739261700, duration 00:03:12.450""")

c("localhost_logs", """[vite] dev server running at:
  > Local:   http://localhost:5173/
  > Network: http://0.0.0.0:5173/
listening on 127.0.0.1:8000
redis ready on [::1]:6379
postgres port 5432, mongo port 27017""")

c("readme_placeholders", """## Setup
Set `STRIPE_API_KEY=sk_test_xxxxxxxx` and `export SLACK_TOKEN=xoxb-your-token`.
In code: `client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])`
Then run `npm start` (v1.2.3.4 of the CLI).""")

c("k8s_clean", f"""apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: registry.local/api@sha256:{hx(64)}
        ports: [{{containerPort: 8080}}]
        env:
        - name: DB_PASSWORD
          valueFrom: {{secretKeyRef: {{name: api-creds, key: db}}}}""")

c("py_plain", """def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
print([fib(i) for i in range(10)])  # why is this O(n)?""")

c("sql_orders", f"""SELECT id, order_no FROM orders WHERE order_no IN ('A-{R.randint(10**6,10**7)}','A-{R.randint(10**6,10**7)}') AND created_at > '2025-01-01 00:00:00';
-- shipment 1Z{rs(16,string.ascii_uppercase+string.digits)} delayed""")

c("requirements", """numpy==1.26.4
pandas>=2.1.0,<3
torch==2.2.1+cu121
Django~=4.2.11
python 3.12.2""")

e1 = "ops.team@" + "northwind-traders.com"
c("mixed_one_email", f"""trace_id {uuid()}
span {hx(16)}
Sent report to {e1} at 2025-03-01 02:00:00
status=ok bytes=2048 port=443""", (e1,"EMAIL"))

c("mixed_one_ip", f"""Pinging 10.4.2.19 ... ok
docker0 172.17.0.1/16
sha: {sha()}
version 2.0.1.77""", ("10.4.2.19","IP_ADDRESS"),("172.17.0.1","IP_ADDRESS"))

mp = rs(12)
c("mixed_one_pw", f"""Hi, my wordpress admin login is not working.
sha256 of backup: {hx(64)}
login: admin / password: {mp}
Running PHP 8.2.15 on port 8081""", (mp,"PASSWORD"))

c("git_user_path", f"""$ git status
On branch feature/login
hint: /home/dylan_ho/projects/webapp/.git/index.lock exists
HEAD is now at {sha()[:7]} fix typo""", ("dylan_ho","USERNAME"))

c("tf_plan_clean", """# aws_instance.web will be created
  + instance_type = "t3.micro"
  + ami           = "ami-0c55b159cbfafe1f0"
  + vpc_id        = "vpc-0a1b2c3d4e5f6a7b8"
Plan: 3 to add, 0 to change, 0 to destroy.""")

jt2 = jwt({"sub":"u_"+rs(6),"role":"authenticated","exp":1893456000})
c("sha_plus_jwt", f"""build {sha()} ok
refresh_token cache: {jt2}
etag W/"{hx(32)}" """, (jt2,"JWT"))

c("plain_chat", """Can you explain the difference between a mutex and a semaphore? I have an OS exam on Friday and my notes from lecture 7 are confusing. An example with producer/consumer would help.""")

c("math_hw", """Problem 3: Solve 3x^2 - 12x + 9 = 0. Then find the area between y = x^2 and y = 4 from x = 0 to x = 2. Show steps. Due 11:59pm.""")

c("java_trace", """Exception in thread "main" java.lang.NullPointerException
	at com.example.App.run(App.java:42)
	at com.example.App.main(App.java:17)
Caused by: java.net.ConnectException: Connection refused (localhost:9200)
Java 17.0.9+9, Maven 3.9.6""")

c("api_json_hashes", f"""{{"id":"{uuid()}","checksum":"{hx(64)}","build":"4.8.2.1","created":"2025-03-02T10:00:00.000Z","email":"deepa.rao@iitb.ac.in"}}""",
  ("deepa.rao@iitb.ac.in","EMAIL"))

for i, cs in enumerate(CASES, 1): cs["id"] = f"t{i:02d}"
CASES = [dict(id=x.pop("id"), **x) for x in CASES]

# ---- verification ----
for cs in CASES:
    for l in cs["labels"]:
        assert l["value"] in cs["text"], (cs["id"], l["value"])
        if l["type"] == "CREDIT_CARD": assert luhn_ok(l["value"]), cs["id"]
        if l["type"] == "IBAN": assert iban_ok(l["value"]), cs["id"]
assert len(CASES) == 60, len(CASES)
here = os.path.dirname(os.path.abspath(__file__))
import gzip
with gzip.GzipFile(os.path.join(here, "cases.json.gz"), "wb", mtime=0) as f: f.write(json.dumps(CASES, indent=1, ensure_ascii=False).encode())
cnt = collections.Counter(l["type"] for cs in CASES for l in cs["labels"])
low = sum(1 for cs in CASES if len(cs["labels"]) <= 2 and (len(cs["labels"]) == 0 or "mixed" in cs["kind"] or True) and len(cs["labels"]) <= 1)
print(len(CASES), "cases;", "zero-label:", sum(1 for cs in CASES if not cs["labels"]), "<=1 label:", low)
print(dict(sorted(cnt.items())))
