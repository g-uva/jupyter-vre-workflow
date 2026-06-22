FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/docusaurus.config.ts ./docusaurus.config.ts
EXPOSE 3000
CMD ["npx", "docusaurus", "serve", "--port", "3000", "--host", "0.0.0.0", "--no-open"]
