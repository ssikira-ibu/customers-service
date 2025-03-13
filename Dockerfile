FROM node:23-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Set the NODE_ENV environment variable to "production"
ENV NODE_ENV=production

# Expose port 8080 for the application to listen on
EXPOSE 8080

# Start the application
CMD ["npm", "start"]