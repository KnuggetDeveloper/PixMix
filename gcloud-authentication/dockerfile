FROM node:18-slim

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY dist ./dist

# Set environment variables
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]