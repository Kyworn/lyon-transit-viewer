# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
RUN npm install

# Install sharp's native dependencies
RUN apk add --no-cache vips-dev fftw-dev build-base

# Bundle app source
COPY . .

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Define environment variable
ENV NODE_ENV development

# Run the app when the container launches
CMD [ "npm", "run", "dev" ]
