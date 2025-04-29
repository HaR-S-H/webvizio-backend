# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of your backend code
COPY . .

# Expose the port your app runs on (adjust if needed)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
