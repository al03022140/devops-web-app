FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]