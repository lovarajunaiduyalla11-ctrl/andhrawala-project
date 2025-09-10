FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy app source
COPY . .

# Expose port
EXPOSE 80

# Start the app
CMD ["node", "server.js"]
