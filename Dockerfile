FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates openssl fonts-noto-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@11.17.0 && npm ci
COPY . .
RUN npx prisma generate && npm run build
RUN mkdir -p /app/data/media /app/test-output && chown -R node:node /app/data /app/test-output
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
