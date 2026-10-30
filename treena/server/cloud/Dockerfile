FROM node:22.21.0-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --silent

COPY *.mjs ./

USER node

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "api.mjs"]
