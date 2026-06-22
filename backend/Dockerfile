# syntax=docker/dockerfile:1

###############################################################################
# Dream Vacation App — Backend (Node.js + Express)
# Single-stage: small Alpine base, layer-cached deps, runs as non-root.
###############################################################################
FROM node:18-alpine AS production

# App directory
WORKDIR /app

# 1) Copy ONLY manifests first so `npm ci` is cached until deps actually change.
COPY package*.json ./

# 2) Install production dependencies (omit nodemon & other devDeps).
RUN npm ci --omit=dev

# 3) Copy the rest of the source (node_modules/.env excluded via .dockerignore).
COPY . .

# 4) Drop root: the official node image ships a least-privilege `node` user.
USER node

# 5) Document the port the server listens on (matches PORT env / compose).
EXPOSE 3001

# 6) Start the API.
CMD ["node", "server.js"]
