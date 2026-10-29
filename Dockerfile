# Build
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn
COPY src src

RUN chmod +x mvnw && ./mvnw -DskipTests package

# Run
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

COPY --from=build /app/target/app-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
