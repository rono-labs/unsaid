"""Writes public/samples/chatgpt-export.json.gz, a synthetic ChatGPT conversations export for the Audit demo."""
import gzip, json, uuid, random
from pathlib import Path

random.seed(11)
T0 = 1767225600  # 2026-01-01
convs = [
    ("Fix CORS error in Express", ["I get 'blocked by CORS policy' calling my API from localhost:5173. Here's server.js:\n\nconst app = express();\napp.use(cors({ origin: 'https://budgetbuddy.vercel.app' }));\napp.listen(3000);"]),
    ("Flask deploy crash", ["My Flask app crashes on deploy:\n * Connecting to postgres://budget_admin:Tr0ub4dor-77x@10.0.4.12:5432/budget\nstripe.AuthenticationError: Invalid API key provided\nclient = stripe.StripeClient(\"sk_live_" + "51NzQe8Hk2LwXr7TbQyP4mVd9\")"]),
    ("Explain big-O of quicksort", ["Why is quicksort O(n log n) on average but O(n^2) worst case?"]),
    ("GitHub Actions failing on push", ["My workflow fails with 'Bad credentials'. env section:\n  GH_TOKEN: ghp_" + "8fK2mQ9xLr4TzW7bN1cVyP3sD6hJ0aGeU5oR\n  NODE_VERSION: 20", "Still failing after re-running, same token ghp_" + "8fK2mQ9xLr4TzW7bN1cVyP3sD6hJ0aGeU5oR"]),
    ("Cover letter for internship", ["Write a cover letter for a SWE internship. My info: Priya Raman, priya.raman@gatech.edu, (404) 555-0187, Atlanta GA. Applying to Northwind Labs."]),
    ("Next.js env vars undefined", ["Why is my key undefined in the browser?\nOPENAI_API_KEY=sk-proj-" + "Jx8e2RkQ7vLm4NcT9aWb3YpZ6fHd1KsU0gEoAiBn5Cr\nNEXT_PUBLIC_SITE_URL=https://budgetbuddy.vercel.app"]),
    ("Study plan for CS 2110", ["Make me a 3 week study plan for my computer organization final."]),
    ("AWS S3 upload AccessDenied", ["boto3 upload_file gives AccessDenied. My config:\n[default]\naws_access_key_id = AKIA" + "Z7Q4MBX2KD9RLW3T\naws_secret_access_key = q9Lx3VmT8bKc2RwN7yPf4HsJ1dGz6AeU0iOtMnBv\nregion = us-east-1"]),
    ("Regex for email validation", ["What's a reasonable regex to validate emails in a signup form?"]),
    ("Discord bot not responding", ["My bot logs in but ignores commands. Webhook for logs: https://hooks.slack.com/services/" + "T04QX7K2M/B05R8LZ1N/xY7kQ2mP9vR4tL8wZ3nB6cJd\nRunning on my Pi at 192.168.1.42"]),
    ("Summarize this lecture", ["Summarize: Today we covered virtual memory, page tables, TLBs and why a TLB miss costs so much."]),
    ("SQL query slow", ["This query takes 9 seconds on 2M rows:\nSELECT * FROM orders WHERE customer_email = 'elena.petrova@outlook.com' ORDER BY created_at DESC;\nHow do I index it?"]),
    ("Python traceback help", ["Traceback (most recent call last):\n  File \"C:\\Users\\priya\\Desktop\\scraper\\main.py\", line 12, in <module>\n    resp = requests.get(url, headers={\"Authorization\": \"Bearer hf_" + "QpWzXcVbNmLkJhGfDsAqWeRtYuIoPaSdFg\"})\nKeyError: 'data'"]),
    ("Birthday message ideas", ["Give me 5 short birthday messages for my roommate."]),
]
out = []
for i, (title, msgs) in enumerate(convs):
    t = T0 + i * 86400 * 19 + random.randint(0, 80000)
    mapping, parent = {}, None
    root = str(uuid.UUID(int=random.getrandbits(128)))
    mapping[root] = {"id": root, "message": None, "parent": None, "children": []}
    parent = root
    for j, m in enumerate(msgs):
        for role, text in (("user", m), ("assistant", "Here's what's going on and how to fix it.")):
            nid = str(uuid.UUID(int=random.getrandbits(128)))
            mapping[nid] = {"id": nid, "parent": parent, "children": [], "message": {"id": nid, "author": {"role": role}, "create_time": t + j * 600 + (5 if role == "assistant" else 0), "content": {"content_type": "text", "parts": [text]}}}
            mapping[parent]["children"].append(nid)
            parent = nid
    out.append({"title": title, "create_time": t, "update_time": t + 3600, "conversation_id": str(uuid.UUID(int=random.getrandbits(128))), "mapping": mapping})
dest = Path(__file__).resolve().parent.parent.joinpath("public/samples/chatgpt-export.json.gz")
with gzip.GzipFile(dest, "wb", mtime=0) as f:
    f.write(json.dumps(out, indent=1).encode())
print(len(out), "conversations")
