# --- Orderline: AI customer support chat (Node.js Express + OpenAI) ---
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# App Runner / most AWS services expect the container to listen on 8080
ENV PORT=8080
EXPOSE 8080

# Basic healthcheck used by orchestrators that support it
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
