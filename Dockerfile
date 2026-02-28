FROM node:24-slim AS build
WORKDIR /app

ARG VITE_BUILD_COMMIT_HASH
ENV VITE_BUILD_COMMIT_HASH=$VITE_BUILD_COMMIT_HASH

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --mode=server

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
