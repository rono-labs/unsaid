#!/usr/bin/env python3
"""Deterministic generator for the FINAL held-out corpus (seed 4242)."""
import base64, collections, gzip, json, os, random, string

r = random.Random(4242)
HERE = os.path.dirname(os.path.abspath(__file__))
ALNUM = string.ascii_letters + string.digits
B64 = ALNUM + "+/"
B64U = ALNUM + "-_"
UP = string.ascii_uppercase + string.digits


def al(n, cs=ALNUM): return "".join(r.choice(cs) for _ in range(n))
def hx(n): return "".join(r.choice("0123456789abcdef") for _ in range(n))
def dg(n): return "".join(r.choice(string.digits) for _ in range(n))
def pw(n=14): return al(1) + al(n - 1, ALNUM + "_-!%*")
def pwu(n=16): return al(n)
def rb64(nb): return base64.b64encode(bytes(r.getrandbits(8) for _ in range(nb))).decode()
def b64u(b): return base64.urlsafe_b64encode(b).decode().rstrip("=")


def jwt():
    h = b64u(b'{"alg":"HS256","typ":"JWT"}')
    p = b64u(json.dumps({"sub": dg(8), "uid": al(6, string.ascii_lowercase), "iat": 1700000000 + r.randint(0, 9999999), "role": "user"}, separators=(",", ":")).encode())
    return h + "." + p + "." + b64u(bytes(r.getrandbits(8) for _ in range(32)))


def pem(kind="RSA PRIVATE KEY", n=12, sep="\n"):
    lines = [al(64, B64) for _ in range(n)] + [al(r.randint(20, 60), B64) + "=="]
    return f"-----BEGIN {kind}-----{sep}" + sep.join(lines) + f"{sep}-----END {kind}-----"


def luhn_ok(s):
    d = [int(c) for c in s if c.isdigit()]
    t = 0
    for i, x in enumerate(reversed(d)):
        if i % 2: x = x * 2 - 9 if x * 2 > 9 else x * 2
        t += x
    return t % 10 == 0


def card(prefix, n):
    body = prefix + dg(n - len(prefix) - 1)
    for c in "0123456789":
        if luhn_ok(body + c): return body + c


def bad_card(prefix, n):
    while True:
        s = prefix + dg(n - len(prefix))
        if not luhn_ok(s): return s


def iban_ok(s):
    s = s.replace(" ", "")
    t = s[4:] + s[:4]
    return int("".join(str(int(c, 36)) for c in t)) % 97 == 1


def iban(cc, bban, group=True):
    t = bban + cc + "00"
    chk = 98 - int("".join(str(int(c, 36)) for c in t)) % 97
    s = f"{cc}{chk:02d}{bban}"
    return " ".join(s[i:i + 4] for i in range(0, len(s), 4)) if group else s


def ssn():
    a = r.choice([x for x in range(1, 900) if x != 666])
    return f"{a:03d}-{r.randint(1, 99):02d}-{r.randint(1, 9999):04d}"


def mac(sep=":", up=False):
    s = sep.join(f"{r.randint(0, 255):02x}" for _ in range(6))
    s = s[:1] + "2" + s[2:] if False else s
    return s.upper() if up else s


def ip4(pref=None):
    if pref: return pref + ".".join(str(r.randint(2, 250)) for _ in range(4 - pref.count(".") - 1))
    return ".".join(str(r.randint(11, 223)) for _ in range(4))


def ip6(pref="2a02:"):
    return pref + ":".join(hx(r.randint(1, 4)) for _ in range(7 - pref.count(":") + 1))


# prefixes split in source so scanners do not trip on this file
def akia(): return "AK" + "IA" + al(16, UP)
def aws_secret(): return al(40, B64)
def ghp(): return "gh" + "p_" + al(36)
def glpat(): return "glp" + "at-" + al(20, B64U)
def xoxb(): return "xo" + "xb-" + dg(12) + "-" + dg(13) + "-" + al(24)
def hook(): return "https://hooks.slack" + ".com/services/T" + al(8, UP) + "/B" + al(10, UP) + "/" + al(24)
def stripe(k="live"): return "sk" + "_" + k + "_" + al(24)
def openai(): return "sk" + "-proj-" + al(48, B64U)
def anth(): return "sk" + "-ant-api03-" + al(93, B64U) + "AA"
def gapi(): return "AI" + "za" + al(35, B64U)
def hf(): return "h" + "f_" + al(34)
def npmt(): return "np" + "m_" + al(36)
def sg(): return "S" + "G." + al(22, B64U) + "." + al(43, B64U)
def twk(): return "S" + "K" + hx(32)


CASES = []


def mk(cid, kind, *parts, decoy=False):
    text, labels, seen = "", [], set()
    for p in parts:
        if isinstance(p, tuple):
            text += p[0]
            if p not in seen:
                seen.add(p)
                labels.append({"value": p[0], "type": p[1]})
        else:
            text += p
    CASES.append({"id": cid, "kind": kind, "text": text, "labels": labels, "_decoy": decoy})


S = lambda v, t: (v, t)

# f01 Django
dj = al(50, string.ascii_lowercase + string.digits + "!@#$%^&*(-_=+)")
mk("f01", "django-settings",
   "# settings.py\nimport os\nfrom pathlib import Path\nBASE_DIR = Path(__file__).resolve().parent.parent\n\nSECRET_KEY = '", S(dj, "SECRET"),
   "'\nDEBUG = False\nALLOWED_HOSTS = ['localhost', '127.0.0.1']\nSTATIC_VERSION = '4.2.11'\n\nDATABASES = {\n    'default': {\n        'ENGINE': 'django.db.backends.postgresql',\n        'NAME': 'campus',\n        'USER': 'campus_app',\n        'PASSWORD': '", S(pw(18), "PASSWORD"),
   "',\n        'HOST': '127.0.0.1',\n        'PORT': 5432,\n    }\n}\nEMAIL_HOST_PASSWORD = '", S(pw(16), "PASSWORD"),
   "'\nSTRIPE_KEY = os.environ['STRIPE_KEY']\n", decoy=True)

# f02 Rails
sk = hx(128)
mk("f02", "rails-credentials",
   "# config/credentials.yml (decrypted via `rails credentials:show`)\nsecret_key_base: ", S(sk, "SECRET"),
   "\naws:\n  access_key_id: ", S(akia(), "AWS_ACCESS_KEY"), "\n  secret_access_key: ", S(aws_secret(), "AWS_SECRET_KEY"),
   "\nsidekiq:\n  web_password: \"", S(pw(12), "PASSWORD"), "\"\nrevision: 9f2c1ab7e4d03b58a6c9e10f7d2b4a8c5e31f0d6\nruby: 3.3.1\n", decoy=True)

# f03 Spring
mk("f03", "spring-properties",
   "spring.datasource.url=jdbc:postgresql://db.internal.example.org:5432/registrar\nspring.datasource.username=registrar\nspring.datasource.password=", S(pw(15), "PASSWORD"),
   "\nspring.mail.host=smtp.office365.com\nspring.mail.port=587\nspring.mail.password=", S(pw(16), "PASSWORD"),
   "\napp.jwt.secret=", S(al(44, B64) , "SECRET"),
   "\nspring.redis.password=${REDIS_PASSWORD}\nserver.port=8080\napp.build=20240611.3\n", decoy=True)

# f04 Laravel
mk("f04", "laravel-env",
   "APP_NAME=Gradebook\nAPP_ENV=production\nAPP_KEY=", S("base64:" + rb64(32), "SECRET"),
   "\nAPP_DEBUG=false\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=gradebook\nDB_USERNAME=forge\nDB_PASSWORD=", S(pwu(20), "PASSWORD"),
   "\nREDIS_PASSWORD=null\nMAIL_USERNAME=", S("registrar+noreply@mail.uni-example.edu", "EMAIL"), "\nMAIL_PASSWORD=", S(pwu(16), "PASSWORD"),
   "\nPUSHER_APP_SECRET=", S(hx(20), "SECRET"), "\nMIX_PUSHER_APP_KEY=\"${PUSHER_APP_KEY}\"\n", decoy=True)

# f05 PHP
mk("f05", "php-config",
   "<?php\nreturn [\n    'db' => [\n        'host' => '127.0.0.1',\n        'user' => 'wp_user',\n        'password' => '", S(pw(14), "PASSWORD"),
   "',\n    ],\n    'mailgun' => [\n        'api_key' => '", S("key-" + hx(32), "SECRET"),
   "',\n        'domain' => 'mg.example.com',\n    ],\n    'salt' => getenv('AUTH_SALT'),\n    'timeout' => 30,\n];\n", decoy=True)

# f06 Go
mk("f06", "go-struct",
   "package main\n\ncfg := Config{\n\tAPIKey:     \"", S(stripe(), "STRIPE_KEY"), "\",\n\tDBPassword: \"", S(pw(16), "PASSWORD"),
   "\",\n\tSigningKey: \"", S(al(32, B64U), "SECRET"), "\",\n\tToken:      os.Getenv(\"API_TOKEN\"),\n\tAdminEmail: \"", S("ops.team+alerts@eu.corp-example.de", "EMAIL"),
   "\",\n\tListen:     \"0.0.0.0:8443\",\n\tVersion:    \"v1.14.2\",\n}\n", decoy=True)

# f07 Cargo
mk("f07", "cargo-config",
   "# ~/.cargo/credentials.toml\n[registry]\ntoken = \"", S("cio" + al(32), "SECRET"),
   "\"\n\n[registries.internal]\ntoken = \"Bearer ", S(al(40), "SECRET"),
   "\"\nindex = \"sparse+https://crates.example.org/index/\"\n\n[dependencies]\nserde = \"1.0.197\"\n# checksum = \"", hx(64), "\"\n", decoy=True)

# f08 JDBC
mk("f08", "jdbc-url",
   "Caused by: java.sql.SQLException: Access denied\n  url=jdbc:mysql://", S("10.2.4.17", "IP_ADDRESS"), ":3306/shop?useSSL=false&user=appsvc&password=", S(pwu(14), "PASSWORD"),
   "&serverTimezone=UTC\n  at com.mysql.cj.jdbc.ConnectionImpl.<init>(ConnectionImpl.java:337)\n  build 2291\n", decoy=True)

# f09 Mongo
mk("f09", "mongo-srv",
   "const uri = \"mongodb+srv://studentdb:", S(pwu(18), "PASSWORD"), "@cluster0.ab1cd.mongodb.net/lab?retryWrites=true&w=majority\";\nconst local = \"mongodb://localhost:27017/test\";\n", decoy=True)

# f10 Redis
mk("f10", "redis-url",
   "REDIS_URL=redis://:", S(pwu(24), "PASSWORD"), "@", S("10.0.5.9", "IP_ADDRESS"), ":6379/0\nDEV_REDIS=redis://localhost:6379\nBROKER=rediss://default:", S(pwu(20), "PASSWORD"),
   "@cache.internal.example.com:6380\nSUBNET=10.0.0.0/16\n", decoy=True)

# f11 SMTP
mk("f11", "smtp-config",
   "[smtp]\nhost = smtp.sendgrid.net\nport = 587\nuser = apikey\npass = ", S(sg(), "SENDGRID_KEY"),
   "\nfrom = ", S("billing@pay.example-shop.co.uk", "EMAIL"), "\nreply_to = ", S("ana.silva+orders@gmail.com", "EMAIL"),
   "\nstarttls = true\n", decoy=True)

# f12 docker run
mk("f12", "docker-run",
   "$ docker run -d --name api -p 8080:8080 \\\n  -e DB_PASSWORD='", S(pw(15), "PASSWORD"), "' \\\n  -e OPENAI_API_KEY=", S(openai(), "OPENAI_KEY"),
   " \\\n  -e NODE_ENV=production -e SESSION_SECRET=", S(al(40), "SECRET"),
   " \\\n  registry.example.com/api@sha256:", hx(64), "\n", decoy=True)

# f13 GH actions log
gt = ghp()
mk("f13", "gha-log",
   "##[group]Run ./deploy.sh\nenv:\n  GH_TOKEN: ${{ secrets.GH_TOKEN }}\n  NODE_VERSION: 18.19.0\n##[endgroup]\n+ curl -H 'Authorization: token ", S(gt, "GITHUB_TOKEN"),
   "' https://api.github.com/user\n+ echo \"pushing with ", S(gt, "GITHUB_TOKEN"), "\"\n::add-mask::***\nRun #4471 attempt 2, commit 3fa9c0e\n", decoy=True)

# f14 heroku
mk("f14", "heroku-cli",
   "$ heroku config -a my-class-app\n=== my-class-app Config Vars\nDATABASE_URL:    postgres://u8s7d6f:", S(hx(40) , "PASSWORD"),
   "@ec2-3-211-9-4.compute-1.amazonaws.com:5432/d1k2j3\nSECRET_KEY_BASE: ", S(hx(96), "SECRET"),
   "\nSENDGRID_API_KEY: ", S(sg(), "SENDGRID_KEY"), "\nWEB_CONCURRENCY: 2\n$ heroku auth:whoami\n", S("tomas.novak@students.cvut.example.cz", "EMAIL"), "\n")

# f15 railway
mk("f15", "railway-table",
   "railway variables\n╔═══════════════════╦══════════════════════════════════════════╗\n║ JWT_SECRET        ║ ", S(al(48, B64U), "SECRET"),
   " ║\n║ STRIPE_SECRET_KEY ║ ", S(stripe(), "STRIPE_KEY"),
   " ║\n║ PGHOST            ║ postgres.railway.internal                ║\n║ PGPASSWORD        ║ ", S(pwu(32), "PASSWORD"),
   " ║\n╚═══════════════════╩══════════════════════════════════════════╝\nDeployment 7c1e9b2d-4f3a-4b8e-9d11-5a6b7c8d9e0f live\n", decoy=True)

# f16 firebase
pkj = "-----BEGIN PRIVATE KEY-----\\n" + "\\n".join(al(64, B64) for _ in range(10)) + "\\n" + al(40, B64) + "=\\n-----END PRIVATE KEY-----\\n"
mk("f16", "firebase-sa-json",
   "{\n  \"type\": \"service_account\",\n  \"project_id\": \"quiz-app-77\",\n  \"private_key_id\": \"", hx(40), "\",\n  \"private_key\": \"", S(pkj, "PRIVATE_KEY"),
   "\",\n  \"client_email\": \"", S("firebase-adminsdk-x7k2p@quiz-app-77.iam.gserviceaccount.com", "EMAIL"),
   "\",\n  \"client_id\": \"", dg(21), "\",\n  \"token_uri\": \"https://oauth2.googleapis.com/token\"\n}\n", decoy=True)

# f17 google client json
mk("f17", "google-oauth-json",
   "{\"web\":{\"client_id\":\"", dg(12), "-", al(32, string.ascii_lowercase + string.digits), ".apps.googleusercontent.com\",\"project_id\":\"cs101-demo\",\"client_secret\":\"",
   S("GOCSPX-" + al(28, B64U), "SECRET"), "\",\"redirect_uris\":[\"http://localhost:3000/callback\"]}}\nmaps key: ", S(gapi(), "GOOGLE_API_KEY"), "\n", decoy=True)

# f18 azure
mk("f18", "azure-conn",
   "DefaultEndpointsProtocol=https;AccountName=labstore01;AccountKey=", S(al(86, B64) + "==", "SECRET"),
   ";EndpointSuffix=core.windows.net\nServer=tcp:labsql.database.windows.net,1433;Database=grades;User ID=dbadmin;Password=", S(pw(16), "PASSWORD"), ";Encrypt=yes;\n")

# f19 k8s
mk("f19", "k8s-secret",
   "apiVersion: v1\nkind: Secret\nmetadata:\n  name: db-creds\ntype: Opaque\ndata:\n  username: ", base64.b64encode(b"svc_reports").decode(),
   "\n  password: ", S(base64.b64encode(pw(14).encode()).decode(), "SECRET"),
   "\n  api-token: ", S(base64.b64encode(al(30).encode()).decode(), "SECRET"),
   "\n  ca.crt: ", base64.b64encode(b"-----BEGIN CERTIFICATE-----\n" + bytes(r.getrandbits(8) for _ in range(60))).decode(), "\n", decoy=True)

# f20 compose yaml
mk("f20", "compose-yaml",
   "services:\n  db:\n    image: postgres:16.2\n    environment:\n      POSTGRES_PASSWORD: \"", S(pw(18), "PASSWORD"),
   "\"\n  app:\n    environment:\n      API_TOKEN: ", S(al(36, B64U), "SECRET"), "\n      SMTP_PASS: '", S(pw(12), "PASSWORD"),
   "'\n      DB_PASS: ${DB_PASS}\n      LOG_LEVEL: info\n    ports: [\"3000:3000\"]\n", decoy=True)

# f21 windows paths
mk("f21", "windows-paths",
   "Traceback (most recent call last):\n  File \"C:\\Users\\", S("jdoe42", "USERNAME"), "\\AppData\\Local\\Programs\\Python\\Python311\\lib\\site-packages\\requests\\api.py\", line 59\n  File \"C:\\Users\\",
   S("jdoe42", "USERNAME"), "\\Documents\\hw3\\main.py\", line 12, in <module>\nConnectionError: HTTPConnectionPool(host='", S("192.168.0.23", "IP_ADDRESS"), "', port=8000)\nPython 3.11.4 [MSC v.1934 64 bit]\n", decoy=True)

# f22 macOS crash
mk("f22", "macos-crash",
   "Process:         Xcode [3921]\nPath:            /Applications/Xcode.app/Contents/MacOS/Xcode\nIdentifier:      com.apple.dt.Xcode\nVersion:         15.3 (22618)\nCrash Reporter Key:   ",
   hx(40).upper(), "\nIncident Identifier: 8F2A1C3D-5B6E-4F70-A1B2-C3D4E5F60718\nSource: /Users/", S("mkessler", "USERNAME"), "/Library/Developer/Xcode/DerivedData/App-bgfwx/Build/Products/Debug/App.app\nStdout: /Users/",
   S("mkessler", "USERNAME"), "/Desktop/proj/out.log\nOS Version: macOS 14.4.1 (23E224)\n", decoy=True)

# f23 ssh prompt
mk("f23", "ssh-prompt",
   S("devon", "USERNAME"), "@buildbox:~$ cat ~/.aws/credentials\n[default]\naws_access_key_id = ", S(akia(), "AWS_ACCESS_KEY"), "\naws_secret_access_key = ", S(aws_secret(), "AWS_SECRET_KEY"),
   "\n", S("devon", "USERNAME"), "@buildbox:~$ uname -r\n6.8.0-31-generic\n")

# f24 ipconfig
mk("f24", "ipconfig",
   "Wireless LAN adapter Wi-Fi:\n\n   Connection-specific DNS Suffix  . : home\n   IPv6 Address. . . . . . . . . . . : ", S("2603:6010:4e00:1a2b:" + ":".join(hx(4) for _ in range(4)), "IP_ADDRESS"),
   "\n   Link-local IPv6 Address . . . . . : ", S("fe80::" + ":".join(hx(4) for _ in range(4)) + "%12", "IP_ADDRESS"),
   "\n   IPv4 Address. . . . . . . . . . . : ", S("192.168.1.57", "IP_ADDRESS"), "\n   Default Gateway . . . . . . . . . : ", S("192.168.1.1", "IP_ADDRESS"),
   "\nEthernet adapter Ethernet:\n   Physical Address. . . . . . . . . : ", S(mac("-", True), "MAC_ADDRESS"), "\n   DHCP Enabled. . . . . . . . . . . : Yes\n", decoy=False)

# f25 ifconfig
mk("f25", "ifconfig",
   "en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500\n\tether ", S(mac(), "MAC_ADDRESS"), "\n\tinet6 ", S("fe80::" + ":".join(hx(r.randint(1, 4)) for _ in range(4)) + "%en0", "IP_ADDRESS"),
   " prefixlen 64 scopeid 0x6\n\tinet ", S("10.8.0.6", "IP_ADDRESS"), " netmask 0xffffff00 broadcast ", S("10.8.0.255", "IP_ADDRESS"),
   "\nlo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> mtu 16384\n\tinet 127.0.0.1 netmask 0xff000000\n\tinet6 ::1 prefixlen 128\nroute: 10.8.0.0/24 via utun3\n", decoy=True)

# f26 wireshark
a, b, m1, m2 = ip4("172.16."), ip4(), mac(), mac()
mk("f26", "wireshark",
   "No.     Time        Source               Destination          Protocol Length Info\n  101   0.000000    ", S(a, "IP_ADDRESS"), "   ", S(b, "IP_ADDRESS"), "   TCP      74     52114 → 443 [SYN] Seq=0 Win=64240 Len=0 MSS=1460\n  102   0.021844    ",
   S(b, "IP_ADDRESS"), "   ", S(a, "IP_ADDRESS"), "   TCP      74     443 → 52114 [SYN, ACK] Seq=0 Ack=1\nEthernet II, Src: ", S(m1, "MAC_ADDRESS"), ", Dst: ", S(m2, "MAC_ADDRESS"),
   "\nFrame 101: 74 bytes on wire; capture file md5 ", hx(32), "\nDHCPv6 solicit from ", S(ip6("2001:4860:"), "IP_ADDRESS"), " via ff02::1:2\n", decoy=True)

# f27 phones
mk("f27", "phone-formats",
   "Contacts for the group project:\nMaria Lopez   ", S("555.201.4432", "PHONE"), " ext. 22\nJames Okoro   ", S("(415) 555-0187", "PHONE"), "\nOliver Smith  ", S("+44 7700 900123", "PHONE"),
   "\nAnanya Rao    ", S("+91 98765 43210", "PHONE"), "\nKlaus Meier   ", S("+49 30 12345678", "PHONE"), "\nPriya (office)  ", S("1-800-555-0142", "PHONE"),
   "\nOrder ref 1234-5678-90 and ISBN 978-3-16-148410-0 are NOT phone numbers.\nRoom 204, build 18.0.3\n", decoy=True)

# f28 emails
mk("f28", "emails",
   "To: ", S("rohit.sharma+cs301@students.iitb.ac.in", "EMAIL"), "\nCc: ", S("prof.weiss@cs.ox.ac.uk", "EMAIL"), ", ", S("t.nakamura+hw@mail.u-tokyo.ac.jp", "EMAIL"),
   "\nBcc: ", S("grader_02@dept.example.edu", "EMAIL"), "\nSubject: Re: hw4 extension\nMessage-ID: <", hx(16), "@mail.gmail.com>\nX-Mailer-Version: 16.0.17328\n", decoy=True)

# f29 cards
c1, c2, c3 = card("4", 16), card("37", 15), card("5", 16)
bc1, bc2 = bad_card("4", 16), bad_card("37", 15)
isbn = "978-0-13-468599-1"
mk("f29", "cards",
   "Please charge ", S(" ".join(c1[i:i + 4] for i in range(0, 16, 4)), "CREDIT_CARD"), " exp 09/27 cvv 418.\nBackup amex ", S(f"{c2[:4]} {c2[4:10]} {c2[10:]}", "CREDIT_CARD"),
   "\nMastercard-ish: ", S("-".join(c3[i:i + 4] for i in range(0, 16, 4)), "CREDIT_CARD"), "\nTracking ", bc1, " is not a card; neither is ", bc2, ".\nISBN ", isbn, ", tracking 1234-5678-90.\n", decoy=True)
DECOY_CARDS = [bc1, bc2]
assert not luhn_ok(isbn)

# f30 iban
ib1 = iban("DE", dg(18)); ib2 = iban("GB", "NWBK" + dg(14)); ib3 = iban("FR", dg(23), group=False)
bad_iban = ib1[:-1] + str((int(ib1[-1]) + 1) % 10)
mk("f30", "ibans",
   "Pay to IBAN ", S(ib1, "IBAN"), " (DE) or ", S(ib2, "IBAN"), " (UK). French: ", S(ib3, "IBAN"), ".\nTypo version ", bad_iban, " failed validation.\nSWIFT NWBKGB2L, invoice 2024-0912.\n", decoy=True)
DECOY_IBANS = [bad_iban]

# f31 ssn
mk("f31", "ssn-record",
   "Student record 88231\nName: Dana Whitfield\nSSN: ", S(ssn(), "SSN"), "\nParent SSN: ", S(ssn(), "SSN"), "\nPhone: ", S("602.555.0199", "PHONE"), "\nZIP+4 85281-1234, form 1234-5678-90, GPA 3.82\n", decoy=True)

# f32 jwt curl
j = jwt()
mk("f32", "curl-jwt",
   "curl -s https://api.classroom.example.com/v2/me \\\n  -H 'Authorization: Bearer ", S(j, "JWT"), "' \\\n  -H 'Cookie: sessionid=", S(al(32, string.ascii_lowercase + string.digits), "SECRET"),
   "; csrftoken=", S(al(40), "SECRET"), "'\n{\"id\": \"b3f1e2d4-77aa-4c21-9a0e-1d2c3b4a5f60\", \"ok\": true}\n", decoy=True)

# f33 url secret
mk("f33", "url-secrets",
   "GET https://api.weatherly.example/v1/data?api_key=", S(al(32, string.ascii_lowercase + string.digits), "URL_SECRET"), "&format=json&page=2&sort=asc\nGET https://files.example.com/dl?file=a.zip&token=",
   S(al(40, B64U), "URL_SECRET"), "&expires=1735689600\nhttps://example.org/search?q=cats&lang=en&utm_source=news\n", decoy=True)

# f34 pem + ssh
mk("f34", "openssh-key",
   "Here is my key, why does ssh say 'invalid format'?\n\n", S(pem("OPENSSH PRIVATE KEY", 9), "PRIVATE_KEY"), "\n\nAnd my public one: ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ", al(120, B64), " me@laptop\nFingerprint: SHA256:", al(43, B64), "\n", decoy=True)

# f35 slack/twilio
mk("f35", "slack-twilio",
   "SLACK_BOT = '", S(xoxb(), "SLACK_TOKEN"), "'\nWEBHOOK = '", S(hook(), "SLACK_WEBHOOK"), "'\nTWILIO_SID = 'AC", hx(32), "'\nTWILIO_API_KEY = '", S(twk(), "TWILIO_KEY"),
   "'\nTWILIO_FROM = '", S("+14155550134", "PHONE"), "'\n", decoy=True)

# f36 npm/hf
mk("f36", "npm-hf",
   "$ cat ~/.npmrc\n//registry.npmjs.org/:_authToken=", S(npmt(), "NPM_TOKEN"), "\nregistry=https://registry.npmjs.org/\n$ huggingface-cli login --token ", S(hf(), "HF_TOKEN"),
   "\nToken is valid (permission: write).\nnpm 10.2.4 / node v20.11.1 lockfile integrity sha512-", al(86, B64), "==\n", decoy=True)

# f37 env ai
mk("f37", "env-ai-keys",
   "OPENAI_API_KEY=", S(openai(), "OPENAI_KEY"), "\nANTHROPIC_API_KEY=", S(anth(), "ANTHROPIC_KEY"),
   "\nGOOGLE_API_KEY=YOUR_KEY_HERE\nHF_TOKEN=<your token>\nSTRIPE=%API_KEY%\nconst k = process.env.OPENAI_API_KEY;\nk2 = os.environ[\"ANTHROPIC_API_KEY\"]\n", decoy=True)

# f38 gitlab
gl = glpat()
mk("f38", "gitlab-remote",
   "$ git remote -v\norigin\thttps://oauth2:", S(gl, "GITLAB_TOKEN"), "@gitlab.com/cs-dept/capstone.git (fetch)\n# .gitlab-ci.yml\nvariables:\n  DEPLOY_TOKEN: ", S(gl, "GITLAB_TOKEN"),
   "\n  IMAGE: registry.gitlab.com/cs-dept/capstone:1.8.0\n  COMMIT: ", hx(40), "\n", decoy=True)

# f39 stripe webhook
mk("f39", "stripe-node",
   "const stripe = require('stripe')('", S(stripe("test"), "STRIPE_KEY"), "');\nconst whsec = '", S("wh" + "sec_" + al(32), "SECRET"), "';\nconst live = '", S(stripe(), "STRIPE_KEY"),
   "';\n// idempotency key ", "3e6f1c2a-9d84-4b7e-a0c1-5f2d8e7b9a31", "\n", decoy=True)

# f40 headers
mk("f40", "http-headers",
   "HTTP/2 200\ncontent-security-policy: default-src 'self'; script-src 'nonce-", al(22, B64U), "' 'strict-dynamic'\nset-cookie: session=", S(al(64, B64U), "SECRET"),
   "; Path=/; HttpOnly; Secure\n<script src=\"/app.js\" integrity=\"sha384-", al(64, B64), "\" crossorigin></script>\n<img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk", al(30, B64), "\">\netag: \"", hx(32), "\"\n", decoy=True)

# f41 terraform
mk("f41", "terraform",
   "variable \"vpc_cidr\" { default = \"10.0.0.0/16\" }\ndb_password = \"", S(pw(20), "PASSWORD"), "\"\naccess_key  = \"", S(akia(), "AWS_ACCESS_KEY"), "\"\nsecret_key  = \"", S(aws_secret(), "AWS_SECRET_KEY"),
   "\"\n# aws_instance.web: private_ip = ", S("10.0.3.14", "IP_ADDRESS"), "\n# subnet 10.0.3.0/24, provider version ~> 5.40\n", decoy=True)

# f42 access log
c1, c2 = ip4(), ip6("2605:")
mk("f42", "nginx-log",
   S(c1, "IP_ADDRESS"), " - - [01/Oct/2026:10:14:02 +0000] \"GET /api/grades HTTP/1.1\" 200 512 \"-\" \"Mozilla/5.0 (X11; Linux x86_64) Chrome/118.0.5993.88\"\n127.0.0.1 - - [01/Oct/2026:10:14:03 +0000] \"GET /healthz HTTP/1.1\" 200 2\n",
   S(c2, "IP_ADDRESS"), " - - [01/Oct/2026:10:14:09 +0000] \"POST /login HTTP/2.0\" 302 0\nupstream 10.1.0.0/16 build=4471\n", decoy=True)

# f43 chat prose
mk("f43", "student-chat",
   "hey can you help me debug my flask app? i keep getting auth errors. my password is ", S("Tr0ub4dor&" + dg(3), "PASSWORD"),
   " for the admin page and the email on the account is ", S("sam.rivera2004@gmail.com", "EMAIL"), ". if you need to text me its ", S("212-555-0178", "PHONE"),
   ". also my TA Jordan said to use port 5000 and python 3.10.12.\n", decoy=True)

# f44 git log
e1, e2 = "li.wei+gh@users.noreply.example.com", "a.petrov@dev.example.ru"
mk("f44", "git-log",
   "commit ", hx(40), "\nAuthor: Li Wei <", S(e1, "EMAIL"), ">\nDate:   Mon Jun 3 12:01:44 2024 +0800\n\n    bump deps\n\ncommit ", hx(40), "\nAuthor: Anton Petrov <", S(e2, "EMAIL"),
   ">\n\n    fix flaky test (v2.0.1-rc.3)\n", decoy=True)

# f45 notebook
mk("f45", "notebook",
   "import os, requests, getpass\npw = getpass.getpass()\nTOKEN = os.environ['API_TOKEN']\nhdr = {'Authorization': 'Bearer ", S(al(40, B64U), "SECRET"),
   "'}\nr = requests.get('https://api.example.com/v1/items', headers=hdr)\nclient_secret = \"", S(al(40, B64U), "SECRET"), "\"\n", decoy=True)

# f46 pgpass / netrc
mk("f46", "pgpass-netrc",
   "# ~/.pgpass\ndb.prod.example.com:5432:orders:reporter:", S(pwu(18), "PASSWORD"), "\n# ~/.netrc\nmachine api.heroku.com\n  login ", S("pat.owens@outlook.com", "EMAIL"), "\n  password ", S(pwu(30), "PASSWORD"),
   "\nmachine localhost login dev password <password>\n", decoy=True)

# f47 terminal
mk("f47", "terminal-session",
   S("rohan", "USERNAME"), "@thinkpad:~/proj$ export AWS_SECRET_ACCESS_KEY=", S(aws_secret(), "AWS_SECRET_KEY"), "\n", S("rohan", "USERNAME"), "@thinkpad:~/proj$ ls /home/", S("rohan", "USERNAME"),
   "/.ssh\nid_ed25519  id_ed25519.pub  known_hosts\n", S("rohan", "USERNAME"), "@thinkpad:~/proj$ git rev-parse HEAD\n", hx(40), "\n", decoy=True)

# f48 syslog
mk("f48", "syslog",
   "Jun  3 09:12:44 lab-pc NetworkManager[812]: <info> device (wlp2s0): address ", S(mac(), "MAC_ADDRESS"), "\nJun  3 09:12:45 lab-pc dhclient[901]: bound to ", S("192.168.50.112", "IP_ADDRESS"),
   " -- renewal in 3412 seconds.\nJun  3 09:12:46 lab-pc systemd[1]: Started Session 14 of user tchen; config /home/", S("tchen", "USERNAME"), "/.config/app.toml\nJun  3 09:13:01 lab-pc sshd[1203]: Accepted publickey from ",
   S(ip6("2a02:"), "IP_ADDRESS"), " port 50122\nkernel 6.1.0-18-amd64 #1 SMP\n", decoy=True)

# f49 postman export
mk("f49", "postman-json",
   "{\"item\":[{\"name\":\"list\",\"request\":{\"header\":[{\"key\":\"X-API-Key\",\"value\":\"", S(al(32, string.ascii_lowercase + string.digits), "SECRET"),
   "\"},{\"key\":\"Authorization\",\"value\":\"Bearer ", S(jwt(), "JWT"), "\"}],\"url\":\"{{baseUrl}}/users\"}}],\"variable\":[{\"key\":\"baseUrl\",\"value\":\"http://localhost:8080\"}],\"info\":{\"_postman_id\":\"",
   "c2b1a0f9-8e7d-4c6b-a5f4-3e2d1c0b9a87", "\"}}\n", decoy=True)

# f50 powershell
mk("f50", "powershell",
   "PS C:\\Users\\", S("ana.lopez", "USERNAME"), "\\Documents> getmac\nPhysical Address    Transport Name\n", S(mac("-", True), "MAC_ADDRESS"), "   \\Device\\Tcpip_{", "9A1B2C3D-4E5F-6071-8293-A4B5C6D7E8F9", "}\nPS C:\\Users\\",
   S("ana.lopez", "USERNAME"), "\\Documents> $conn = \"Server=tcp:srv01.database.windows.net;User ID=sa;Password=", S(pw(16), "PASSWORD"), ";\"\nPS> $env:API_KEY\n", decoy=True)


def main():
    assert len(CASES) == 50 and len({c["id"] for c in CASES}) == 50
    tc = collections.Counter()
    for c in CASES:
        for l in c["labels"]:
            assert l["value"] in c["text"], (c["id"], l)
            tc[l["type"]] += 1
            if l["type"] == "CREDIT_CARD": assert luhn_ok(l["value"]), l
            if l["type"] == "IBAN": assert iban_ok(l["value"]), l
    assert not any(luhn_ok(x) for x in DECOY_CARDS) and not any(iban_ok(x) for x in DECOY_IBANS)
    nd = sum(c["_decoy"] for c in CASES)
    out = [{k: v for k, v in c.items() if not k.startswith("_")} for c in CASES]
    path = os.path.join(HERE, "cases.json.gz")
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(json.dumps(out, ensure_ascii=False, indent=1).encode("utf-8"))
    print("cases", len(out), "decoy cases", nd, "labels", sum(tc.values()))
    print(dict(sorted(tc.items())))


if __name__ == "__main__":
    main()
