# Use the official MongoDB image
FROM mongo:6.0

# Set environment variables
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=password
ENV MONGO_INITDB_DATABASE=finsight

# Copy initialization scripts
COPY docker/mongo-init.js /docker-entrypoint-initdb.d/

# Expose MongoDB port
EXPOSE 27017
