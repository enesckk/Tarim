FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
ENV HOST=0.0.0.0
ENV VITE_API_URL=http://localhost:5109
ENV VITE_TARIM_AI_PROXY_TARGET=http://tarim-ai:4000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
