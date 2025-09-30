# syntax=docker/dockerfile:1

# Build stage: install dependencies and produce the static bundle
FROM node:20-alpine AS builder
WORKDIR /app

# Only copy package manifests initially to leverage Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application source and build the production bundle
COPY . .
RUN npm run build

# Runtime stage: serve the static bundle with nginx
FROM nginx:1.27-alpine AS runner

# Remove default nginx static assets and replace with our build output
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port and start nginx in the foreground
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
