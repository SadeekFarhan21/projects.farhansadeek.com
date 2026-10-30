FROM node:20-bookworm-slim

# Runtime hardening: prefer docker run --cpus / --memory / --pids-limit (see README).

RUN apt-get update \
  && apt-get install -y python3 make g++ git ripgrep \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server.mjs ./

ENV WORKSPACE_DIR=/workspace
RUN mkdir -p /workspace \
  && chown -R node:node /app /workspace

USER node

EXPOSE 3001

CMD ["node", "server.mjs"]
