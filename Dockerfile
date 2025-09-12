FROM node:18-alpine

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy rest of the source code
COPY . .

# Expose port (match with your server.js)
EXPOSE 7070

# Start the app
CMD ["node", "server.js"]
