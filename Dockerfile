FROM node:18-alpine

WORKDIR /app

# Copy package files to container
COPY package*.json ./

# Install dependencies inside container
RUN npm install

# Copy app source code to container
COPY . .

# Expose the port your app listens on
EXPOSE 80

# Start the app
CMD ["node", "server.js"]
