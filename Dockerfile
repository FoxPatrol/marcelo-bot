# Use an official Node.js runtime as a parent image
FROM node:16-alpine

RUN apk update

# Set the working directory in the container
WORKDIR /app

RUN apk add --no-cache --virtual .build-deps make g++ python3

# Copy package.json and package-lock.json to the container
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY .env ./

# Install project dependencies
RUN npm ci
RUN npm run build

# Define the command to start your Node.js application
CMD ["npm", "start"]
