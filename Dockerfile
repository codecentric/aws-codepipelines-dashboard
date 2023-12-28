FROM openjdk:8u151-jre-alpine3.7
LABEL maintainer="Oliver Hoogvliet <oliver.hoogvliet@codecentric.de>, Raimar Falke <raimar.falke@codecentric.de>"
ARG APP_FILE_PATH
EXPOSE 80
COPY $APP_FILE_PATH app.jar
CMD ["java", "-jar", "-Dserver.port=80", "app.jar"]
