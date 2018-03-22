### Build stage
FROM maven:3.5.2-jdk-8 as builder
WORKDIR /tmp/build-dir
COPY . .
RUN cd /tmp/build-dir && mvn package

### Production stage
FROM java:8-jre
LABEL maintainer="Oliver Hoogvliet <oliver.hoogvliet@codecentric.de>, Raimar Falke <raimar.falke@codecentric.de>"
RUN groupadd -r app && useradd --no-log-init -r -g app app
WORKDIR /home/app
COPY --from=builder /tmp/build-dir/container_start.sh /app/container_start.sh
RUN chmod 755 /app/container_start.sh
USER app
ENTRYPOINT ["/app/container_start.sh"]
EXPOSE 8080
COPY --from=builder /tmp/build-dir/target/app.jar /app/app.jar
