FROM node:18-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Create movies dir and ensure it exists
RUN mkdir -p /app/movies

# Expose port 80 (server.js uses 80 by default)
EXPOSE 80
CMD ["node", "server.js"]
