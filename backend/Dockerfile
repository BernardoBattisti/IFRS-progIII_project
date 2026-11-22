# syntax=docker/dockerfile:1

# ---- build: compila o jar com Maven (testes rodam fora do Docker com `mvn test`) ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# ---- runtime: apenas JRE 21, usuário não-root, pasta de uploads gravável ----
FROM eclipse-temurin:21-jre
RUN groupadd --system app && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app \
    && mkdir -p /app /dados/uploads && chown -R app:app /app /dados
WORKDIR /app
COPY --from=build --chown=app:app /src/target/votacoes.jar /app/votacoes.jar
# /dados/uploads já existe com dono "app": um volume nomeado montado ali herda essa permissão.
ENV APP_UPLOAD_DIR=/dados/uploads \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"
VOLUME ["/dados/uploads"]
USER app
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/votacoes.jar"]
