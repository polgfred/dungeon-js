FROM node:24-slim AS build
WORKDIR /app

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --mode=server

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
