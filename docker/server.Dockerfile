FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY server/package.json server/package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY server/ ./

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]