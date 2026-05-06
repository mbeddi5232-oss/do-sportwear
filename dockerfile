# 1. Use a lightweight version of Node.js 18
FROM node:18-alpine

# 2. Create a folder inside the container for our app
WORKDIR /usr/src/app

# 3. Copy only the package files first (to optimize build speed)
COPY package*.json ./

# 4. Install only production dependencies
RUN npm install --production

# 5. Copy all your code from your computer into the container
COPY . .

# 6. Open port 5000 (or whichever port your backend uses)
EXPOSE 3000

# 7. The command to start your app inside the container
CMD ["npm", "start"]