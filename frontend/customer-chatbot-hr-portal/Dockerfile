FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://127.0.0.1:8000
ARG VITE_ADMIN_URL=http://localhost:5174
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ADMIN_URL=${VITE_ADMIN_URL}

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
