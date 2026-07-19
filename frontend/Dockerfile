# syntax=docker/dockerfile:1

###############################################################################
# Dream Vacation App — Frontend (React, served by nginx)
# Multi-stage build:
#   Stage 1 (build)      -> compile the React app to static files
#   Stage 2 (production) -> copy ONLY the static build into a tiny nginx image
# Result: the final image ships no Node.js, no source, no node_modules.
###############################################################################

# ---- Stage 1: build -------------------------------------------------------
# react-scripts 3.x (webpack 4) is incompatible with Node 17+ (OpenSSL 3),
# so we pin Node 16 for a clean, reproducible build.
FROM node:16-alpine AS build
WORKDIR /app

# Cache dependencies separately from source.
COPY package*.json ./
RUN npm ci

# CRA bakes REACT_APP_* variables in at BUILD time -> pass it as a build arg.
# Default empty => the app uses relative "/api" paths, which nginx proxies to the
# backend. Override only if you want the frontend to call an absolute backend URL.
ARG REACT_APP_API_URL=
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the optimized production bundle into /app/build.
COPY . .
RUN npm run build

# ---- Stage 2: production --------------------------------------------------
FROM nginx:1.27-alpine AS production

# SPA-aware nginx config (deep links fall back to index.html).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Ship only the compiled static assets.
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
