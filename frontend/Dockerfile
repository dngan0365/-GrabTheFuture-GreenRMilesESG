FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Backend origin used by next.config rewrites to proxy /api/v1 server-side.
# On Railway set this to the backend's public URL; locally Compose omits it
# and the rewrite falls back to http://backend:8000.
ARG BACKEND_ORIGIN
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]