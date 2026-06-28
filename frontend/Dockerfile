FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Backend origin used by next.config rewrites to proxy /api/v1 server-side.
# On Railway set this to the backend's public URL; locally Compose omits it
# and the rewrite falls back to http://backend:8000 (see next.config.ts).
ARG BACKEND_ORIGIN
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN

# NEXT_PUBLIC_* vars are inlined into the bundle at build time. On Railway,
# pass the Goong maptiles key via this build arg (set it as a service
# variable). Locally the arg is empty and the value comes from
# frontend/.env.local, so we only export it when provided — otherwise an empty
# value would override .env.local (Next prefers real env vars over .env files).
ARG NEXT_PUBLIC_GOONG_MAPTILES_KEY
RUN if [ -n "$NEXT_PUBLIC_GOONG_MAPTILES_KEY" ]; then \
      export NEXT_PUBLIC_GOONG_MAPTILES_KEY="$NEXT_PUBLIC_GOONG_MAPTILES_KEY"; \
    fi; \
    npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]