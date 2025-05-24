# Stage 1: Build the application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY client/package.json client/package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY client ./

# Build the application
RUN npm run build

# Stage 2: Serve the application
FROM node:18-alpine

WORKDIR /app

# Copy built files from previous stage
COPY --from=build /app/build ./build

# Install serve package
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]