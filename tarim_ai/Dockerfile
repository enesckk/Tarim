FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# The migration job needs tsx and the TypeScript migration sources. Keep this
# target separate so development tools never ship in the long-running service.
FROM build AS migration

FROM build AS production-dependencies
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV ANALYSIS_DATA_MODE=live
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/modules/database/migrations ./src/modules/database/migrations
COPY --from=build /app/src/modules/crop-recommendation/knowledge ./src/modules/crop-recommendation/knowledge
COPY --from=build /app/src/modules/physical-suitability/seed/seasonal-crop-scientific-profile-v1 ./src/modules/physical-suitability/seed/seasonal-crop-scientific-profile-v1
COPY --from=build /app/assets ./assets
COPY --from=build /app/data ./data
COPY --from=build /app/fixtures ./fixtures
RUN mkdir -p outputs public/drone_photos storage \
    && chown -R node:node outputs public storage
EXPOSE 4000
USER node
CMD ["npm", "start"]
