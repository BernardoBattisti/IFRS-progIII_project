package br.edu.ifrs.votacoes.seguranca;

import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import br.edu.ifrs.votacoes.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Cookie de sessão: JWT, HttpOnly, SameSite=Lax, Secure quando APP_BASE_URL é https. */
@Component
public class CookieSessao {

    public static final String NOME = "VOTACOES_SESSAO";

    private final JwtService jwt;
    private final AppProperties props;

    public CookieSessao(JwtService jwt, AppProperties props) {
        this.jwt = jwt;
        this.props = props;
    }

    public void abrir(HttpServletResponse resp, Long usuarioId) {
        escrever(resp, jwt.emitir(usuarioId), props.jwtValidade());
    }

    public void fechar(HttpServletResponse resp) {
        escrever(resp, "", Duration.ZERO);
    }

    public String ler(HttpServletRequest req) {
        if (req.getCookies() == null) {
            return null;
        }
        for (Cookie c : req.getCookies()) {
            if (NOME.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    private void escrever(HttpServletResponse resp, String valor, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(NOME, valor)
                .httpOnly(true)
                .secure(props.cookieSeguro())
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
        resp.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
