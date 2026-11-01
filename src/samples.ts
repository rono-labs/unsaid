export interface Sample {
  id: string;
  label: string;
  text: string;
}

export const SAMPLES: Sample[] = [
  {
    id: "log",
    label: "Crash log",
    text: `My Flask app crashes on deploy, can you tell me why?

$ python app.py
 * Loading config from /home/priya/projects/budgetbuddy/.env
 * Connecting to postgres://budget_admin:Tr0ub4dor-77x@10.0.4.12:5432/budget
Traceback (most recent call last):
  File "/home/priya/projects/budgetbuddy/app.py", line 41, in <module>
    client = stripe.StripeClient("sk_live_51NzQe8Hk2LwXr7TbQyP4mVd9")
  File "/home/priya/.venv/lib/python3.12/site-packages/stripe/_client.py", line 88, in __init__
    raise AuthenticationError("Invalid API key provided")
stripe.AuthenticationError: Invalid API key provided
 * Error report sent to priya.raman@gatech.edu from 73.162.18.204`,
  },
  {
    id: "env",
    label: ".env file",
    text: `# why does my Next.js build say OPENAI_API_KEY is undefined?
NEXT_PUBLIC_SITE_URL=https://budgetbuddy.vercel.app
OPENAI_API_KEY=sk-proj-Jx8e2RkQ7vLm4NcT9aWb3YpZ6fHd1KsU0gEoAiBn5Cr
GITHUB_TOKEN=ghp_8fK2mQ9xLr4TzW7bN1cVyP3sD6hJ0aGeU5oR
AWS_ACCESS_KEY_ID=AKIAZ7Q4MBX2KD9RLW3T
AWS_SECRET_ACCESS_KEY=q9Lx3VmT8bKc2RwN7yPf4HsJ1dGz6AeU0iOtMnBv
DATABASE_PASSWORD=sunflower-2003
ADMIN_EMAIL=marcus.lee@budgetbuddy.app
NODE_ENV=production`,
  },
  {
    id: "email",
    label: "Support email",
    text: `Hi team,

Please help me write a polite reply to this customer:

"Hello, my name is Elena Petrova and I was charged twice for order 88213.
My card is 4539 1488 0343 6467 and you can reach me at +1 (404) 555-0187
or elena.petrova@outlook.com. I live at 221 Peachtree St, Atlanta.
I already emailed Northwind Outfitters support last week."

Thanks,
Jordan`,
  },
];
