FROM node:20-alpine
WORKDIR /srv/app
COPY api/package.json api/package-lock.json* ./api/
RUN cd api && npm ci
COPY api ./api
ENV PORT=8787
EXPOSE 8787
CMD ["node", "api/server.mjs"]
