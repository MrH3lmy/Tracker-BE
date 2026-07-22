# syntax=docker/dockerfile:1

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests clean package

FROM eclipse-temurin:25-jre
WORKDIR /app

# curl is needed for the HEALTHCHECK below; the base JRE image doesn't include it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as a dedicated non-root user rather than the image's default root, so a container escape or
# arbitrary-file-write vulnerability in the app/JVM doesn't hand an attacker root inside the
# container.
RUN groupadd --system --gid 1000 taskpriority \
    && useradd --system --uid 1000 --gid taskpriority --no-create-home taskpriority

COPY --from=build /build/target/*.jar app.jar
RUN chown taskpriority:taskpriority /app/app.jar
USER taskpriority

EXPOSE 8080

# Actuator health is permitAll (see SecurityConfig) and only ever returns UP/DOWN plus
# liveness/readiness state - safe to probe without credentials from inside the container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl --fail --silent http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java","-XX:MaxRAMPercentage=50.0","-XX:InitialRAMPercentage=25.0","-jar","/app/app.jar"]
