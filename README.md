# Orderline — AI Customer Support Chat (Nimbus Threads)

A domain-specific AI chat assistant for e-commerce customer support, built for the
"Vibe Coding: Building & Deploying an AI Web Application on AWS" project.

- **Frontend:** HTML/CSS/JS, shipping-label/receipt visual theme, responsive
- **Backend:** Node.js + Express, streams responses via Server-Sent Events (SSE)
- **LLM:** OpenAI (`gpt-4o-mini` by default, configurable)
- **Containerized:** Docker
- **Deploy target:** AWS App Runner (or Elastic Beanstalk)

## 1. Run locally

```bash
npm install
cp .env.example .env
# edit .env and add your real OPENAI_API_KEY
npm start
```

Visit http://localhost:8080

## 2. Run with Docker

```bash
docker build -t orderline-bot .
docker run -p 8080:8080 --env-file .env orderline-bot
```

Visit http://localhost:8080

## 3. Deploy to AWS App Runner (recommended — simplest path)

**Option A: Deploy from a container registry (ECR)**

```bash
# 1. Authenticate Docker to ECR (replace <account-id> and <region>)
aws ecr get-login-password --region <region> | docker login --username AWS \
  --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

# 2. Create a repository (one-time)
aws ecr create-repository --repository-name orderline-bot --region <region>

# 3. Tag and push your image
docker tag orderline-bot:latest <account-id>.dkr.ecr.<region>.amazonaws.com/orderline-bot:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/orderline-bot:latest
```

Then in the AWS Console:
1. Go to **App Runner** → **Create service**
2. Source: **Container registry** → **Amazon ECR** → select the image you pushed
3. Deployment trigger: manual or automatic
4. Port: `8080`
5. Under **Environment variables**, add `OPENAI_API_KEY` and `OPENAI_MODEL`
   (never bake these into the image or commit them to git)
6. Create & deploy — App Runner gives you a public HTTPS URL when it's done

**Option B: Deploy straight from source (App Runner can build the Dockerfile for you)**
1. Push this project to a GitHub repo (make sure `.env` is in `.gitignore` — it already is)
2. App Runner → Create service → Source: **Source code repository** → connect GitHub
3. Runtime: it will detect the `Dockerfile`
4. Add the same environment variables as above
5. Deploy — copy the public URL it gives you into your Concept Note / Report

## 4. Cost & safety notes
- `gpt-4o-mini` is inexpensive; set a usage budget/alert in your OpenAI dashboard
- Set an AWS Budget alert (Billing → Budgets) so App Runner doesn't surprise you
- `OPENAI_API_KEY` is only ever read server-side (`server.js`) — it is never sent
  to the browser and is excluded from git via `.gitignore` and from the Docker
  image via `.dockerignore`

## 5. Project structure
```
ecommerce-support-bot/
├── server.js           # Express backend, SSE streaming, system prompt
├── package.json
├── Dockerfile
├── .dockerignore
├── .gitignore
├── .env.example
└── public/
    ├── index.html       # Chat UI
    ├── style.css        # Shipping-label/receipt design system
    └── script.js        # Chat state + SSE stream consumption
```

## 6. What to customize for your submission
- `STORE_NAME` and the policy bullets in `server.js` → make it your own store/brand
- Quick-action chips in `index.html` → tailor to your use case
- Add real order-lookup logic (calls a mock DB or API) if you want to go further
  than the base requirements
