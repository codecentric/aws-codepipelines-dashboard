FROM openjdk:8u151-jre-alpine3.7
# FROM java:8-jre
LABEL maintainer="Oliver Hoogvliet <oliver.hoogvliet@codecentric.de>, Raimar Falke <raimar.falke@codecentric.de>"
ARG APP_FILE_PATH
# RUN groupadd -r app && useradd --no-log-init -r -g app app
# WORKDIR /home/app
# COPY  container_start.sh container_start.sh
# RUN chmod 755 container_start.sh
# USER app
# ENTRYPOINT ["/app/container_start.sh"]
EXPOSE 80
COPY $APP_FILE_PATH app.jar
# COPY --from=builder /tmp/build-dir/target/app.jar /app/app.jar
CMD ["java", "-jar", "-Dserver.port=80", "app.jar"]
# CMD ["container_start.sh"]
