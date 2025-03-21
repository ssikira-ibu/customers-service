FROM node:23-alpine

ENV NODE_ENV=development
ENV DOCKERIZE_VERSION v0.9.3

# Install dockerize
RUN apk update --no-cache \
    && apk add --no-cache wget openssl \
    && wget -O - https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz | tar xzf - -C /usr/local/bin \
    && apk del wget

# Set working directory
WORKDIR /app

# Install nodemon globally
RUN npm install -g nodemon

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

ENTRYPOINT [ "sh", "./start.sh" ]

# Command to run the application
CMD ["npm", "run", "dev"] 