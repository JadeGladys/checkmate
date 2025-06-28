# Use Node base image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package.json & lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start:prod"]
