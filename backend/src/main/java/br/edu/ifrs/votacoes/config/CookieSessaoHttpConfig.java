package br.edu.ifrs.votacoes.config;

import org.springframework.boot.web.server.Cookie.SameSite;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.server.ConfigurableServletWebServerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Cookie da sessão HTTP (JSESSIONID), usada só no handshake OAuth: HttpOnly, SameSite=Lax e Secure
 * quando APP_BASE_URL é https. Roda depois do customizador padrão do Spring Boot (ordem 0).
 */
@Configuration
public class CookieSessaoHttpConfig implements WebServerFactoryCustomizer<ConfigurableServletWebServerFactory>, Ordered {

    private final AppProperties props;

    public CookieSessaoHttpConfig(AppProperties props) {
        this.props = props;
    }

    @Override
    public void customize(ConfigurableServletWebServerFactory factory) {
        var session = new org.springframework.boot.web.servlet.server.Session();
        session.setTimeout(java.time.Duration.ofMinutes(10));
        var cookie = session.getCookie();
        cookie.setHttpOnly(true);
        cookie.setSecure(props.cookieSeguro());
        cookie.setSameSite(SameSite.LAX);
        factory.setSession(session);
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
