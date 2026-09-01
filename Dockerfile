# syntax=docker/dockerfile:1

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app

# curl is needed for the HEALTHCHECK below; the base JRE image doesn't include it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# The base image ships /usr/bin/pebble (Canonical's Go-based init/service manager) even in this
# non-chiseled variant, but it isn't dpkg-registered and nothing in the image's own entrypoint
# chain (/__cacert_entrypoint.sh, itself replaced by our own ENTRYPOINT below) invokes it - it's
# unused dead weight here. Removing it drops the Go-stdlib CVEs Trivy's image scan flags against
# its statically-linked Go runtime (Trivy has no way to know it's unreachable code for us).
RUN rm -f /usr/bin/pebble

# Run as a dedicated non-root user rather than the image's default root, so a container escape or
# arbitrary-file-write vulnerability in the app/JVM doesn't hand an attacker root inside the
# container. IDs are auto-assigned (not pinned to e.g. 1000) - nothing here depends on the exact
# value, and the base image has started shipping its own GID/UID 1000 (an "ubuntu" user), which a
# hardcoded --gid/--uid 1000 collides with.
RUN groupadd --system taskpriority \
    && useradd --system --gid taskpriority --no-create-home taskpriority

COPY --from=build /build/target/*.jar app.jar
RUN chown taskpriority:taskpriority /app/app.jar
USER taskpriority

EXPOSE 8080

# Actuator health is permitAll (see SecurityConfig) and only ever returns UP/DOWN plus
# liveness/readiness state - safe to probe without credentials from inside the container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl --fail --silent http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java","-XX:MaxRAMPercentage=50.0","-XX:InitialRAMPercentage=25.0","-jar","/app/app.jar"]
