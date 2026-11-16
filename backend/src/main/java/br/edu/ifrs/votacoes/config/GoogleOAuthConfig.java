package br.edu.ifrs.votacoes.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;

/**
 * Registra o cliente OAuth do Google somente quando GOOGLE_CLIENT_ID está preenchido.
 * Sem ele não há ClientRegistrationRepository e o login Google fica desabilitado.
 * O redirect-uri é montado a partir de APP_BASE_URL porque o navegador fala com o Next.js,
 * que repassa /api/* ao backend.
 */
@Configuration
@ConditionalOnExpression("!'${app.google.client-id:}'.trim().isEmpty()")
public class GoogleOAuthConfig {

    public static final String BASE_AUTORIZACAO = "/api/oauth2/authorization";
    public static final String BASE_CALLBACK = "/api/login/oauth2/code/*";

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository(AppProperties props) {
        var google = CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(props.google().clientId().trim())
                .clientSecret(props.google().clientSecret())
                .redirectUri(props.baseUrl() + "/api/login/oauth2/code/{registrationId}")
                .scope("openid", "email", "profile")
                .build();
        return new InMemoryClientRegistrationRepository(google);
    }
}
