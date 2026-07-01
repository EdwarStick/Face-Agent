FROM node:22-alpine AS build

WORKDIR /app/frontend

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["/bin/sh", "-c", "echo '\n🚀 Frontend is ready! You can view it in your browser at: http://localhost\n' && nginx -g 'daemon off;'"]
