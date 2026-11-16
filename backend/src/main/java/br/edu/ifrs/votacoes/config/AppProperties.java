package br.edu.ifrs.votacoes.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configurações da aplicação (prefixo {@code app}), alimentadas pelas variáveis de ambiente APP_*.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String baseUrl,
        String allowedDomains,
        String adminEmails,
        String jwtSecret,
        Duration jwtValidade,
        String uploadDir,
        Google google) {

    public record Google(String clientId, String clientSecret) {
        public boolean habilitado() {
            return clientId != null && !clientId.isBlank();
        }
    }

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
        if (google == null) {
            google = new Google("", "");
        }
    }

    public Set<String> dominiosPermitidos() {
        return lista(allowedDomains).stream()
                .map(d -> d.startsWith("@") ? d.substring(1) : d)
                .collect(Collectors.toSet());
    }

    public Set<String> emailsAdmin() {
        return lista(adminEmails);
    }

    /** Cookie com flag Secure quando o frontend é servido por HTTPS. */
    public boolean cookieSeguro() {
        return baseUrl.startsWith("https://");
    }

    private static Set<String> lista(String valor) {
        if (valor == null || valor.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(valor.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }
}
