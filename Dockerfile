# syntax=docker/dockerfile:1
# Imagem única do StudySite: a API Spring serve também a SPA compilada (mesma origem).

# 1) Frontend: compila a SPA.
FROM node:24-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Backend: empacota o jar com a SPA em static/.
FROM eclipse-temurin:25-jdk AS backend
WORKDIR /src/backend
COPY backend/mvnw backend/pom.xml ./
COPY backend/.mvn .mvn
RUN ./mvnw -B -q dependency:go-offline
COPY backend/src src
COPY --from=frontend /src/frontend/dist src/main/resources/static
RUN ./mvnw -B -q -DskipTests package && cp target/backend-*.jar /app.jar

# 3) Execução: só a JRE, usuário sem privilégios e o currículo em YAML.
FROM eclipse-temurin:25-jre
RUN useradd --system --uid 10001 studysite
WORKDIR /app
COPY --from=backend /app.jar app.jar
COPY content content
ENV CONTENT_DIR=/app/content \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
USER studysite
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
