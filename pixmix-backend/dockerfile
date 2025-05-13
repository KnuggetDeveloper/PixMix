FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Create uploads directory
RUN mkdir -p uploads
# Set the right permissions
RUN chmod 777 uploads

# Build TypeScript code
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]