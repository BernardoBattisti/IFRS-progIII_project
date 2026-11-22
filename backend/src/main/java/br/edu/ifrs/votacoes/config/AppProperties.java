package br.edu.ifrs.votacoes.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configurações da aplicação (prefixo {@code app}), alimentadas pelas variáveis de ambiente APP_*
 * (e MAIL_FROM para o remetente dos e-mails).
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String baseUrl,
        String jwtSecret,
        Duration jwtValidade,
        String uploadDir,
        String mailFrom) {

    public AppProperties {
        if (jwtSecret == null || jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "APP_JWT_SECRET deve ser definido com pelo menos 32 bytes.");
        }
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:3000";
        }
        baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        if (jwtValidade == null) {
            jwtValidade = Duration.ofHours(12);
        }
        if (uploadDir == null || uploadDir.isBlank()) {
            uploadDir = "./uploads";
        }
        if (mailFrom == null || mailFrom.isBlank()) {
            mailFrom = "nao-responda@votacoes.local";
        }
    }

    /** Cookie com flag Secure quando o frontend é servido por HTTPS. */
    public boolean cookieSeguro() {
        return baseUrl.startsWith("https://");
    }
}
