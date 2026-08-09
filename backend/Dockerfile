FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN mkdir -p data

# Push schema and seed
RUN DATABASE_URL="file:/app/data/agentguard.db" npx prisma db push && \
    DATABASE_URL="file:/app/data/agentguard.db" npx tsx src/demo/seed.ts

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
