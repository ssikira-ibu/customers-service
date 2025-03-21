FROM node:23-alpine

WORKDIR /app

# Install nodemon globally
RUN npm install -g nodemon

# Copy package files
COPY package*.json ./

ENV NODE_ENV=development

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Make scripts executable
RUN chmod +x ./scripts/start.dev.sh ./scripts/wait-for-it.sh

# Expose port
EXPOSE 3000

# Command to run the application
CMD ["sh", "./scripts/start.dev.sh"] 