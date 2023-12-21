# Use an official Node.js runtime as a parent image
FROM node:20

RUN apt update

# Set the working directory in the container
WORKDIR /app

RUN apt install -y --no-install-recommends make g++ python3 ffmpeg

# Copy package.json and package-lock.json to the container
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY .env ./

# Install project dependencies
RUN npm uninstall ffmpeg-static
RUN npm i --no-optionals
RUN npm run build

# Define the command to start your Node.js application
CMD ["npm", "start"]
