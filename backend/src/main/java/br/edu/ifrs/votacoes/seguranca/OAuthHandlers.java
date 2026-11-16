package br.edu.ifrs.votacoes.seguranca;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import br.edu.ifrs.votacoes.config.AppProperties;
import br.edu.ifrs.votacoes.usuario.LoginNegadoException;
import br.edu.ifrs.votacoes.usuario.Usuario;
import br.edu.ifrs.votacoes.usuario.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Final do handshake OAuth do Google: cria/atualiza o usuário, grava o cookie JWT, descarta a
 * sessão HTTP usada só para o "state" e redireciona para APP_BASE_URL. Em caso de recusa,
 * redireciona para {@code APP_BASE_URL/?erroLogin=<codigo>}.
 */
@Component
public class OAuthHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuthHandlers.class);

    private final UsuarioService usuarios;
    private final CookieSessao cookie;
    private final AppProperties props;

    public OAuthHandlers(UsuarioService usuarios, CookieSessao cookie, AppProperties props) {
        this.usuarios = usuarios;
        this.cookie = cookie;
        this.props = props;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse resp, Authentication auth)
            throws IOException {
        encerrarSessaoHttp(req);
        try {
            OAuth2User principal = (OAuth2User) auth.getPrincipal();
            String email = principal.getAttribute("email");
            // Só aceita e-mail explicitamente verificado pelo Google (ausente = recusado).
            if (!Boolean.TRUE.equals(principal.getAttribute("email_verified"))) {
                redirecionarErro(resp, "email_nao_verificado");
                return;
            }
            String nome = principal.getAttribute("name");
            String foto = principal.getAttribute("picture");
            String sub = principal instanceof OidcUser oidc ? oidc.getSubject() : principal.getName();
            Usuario u = usuarios.login(email, nome, foto, sub);
            cookie.abrir(resp, u.getId());
            resp.sendRedirect(props.baseUrl() + "/");
        } catch (LoginNegadoException e) {
            redirecionarErro(resp, e.getCodigo());
        } catch (RuntimeException e) {
            // Ex.: corrida no primeiro login (e-mail único), dado fora do tamanho das colunas.
            log.warn("Erro inesperado ao concluir login Google", e);
            redirecionarErro(resp, "falha_google");
        }
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest req, HttpServletResponse resp,
            AuthenticationException e) throws IOException {
        log.warn("Falha no login Google: {}", e.getMessage());
        encerrarSessaoHttp(req);
        redirecionarErro(resp, "falha_google");
    }

    private void redirecionarErro(HttpServletResponse resp, String codigo) throws IOException {
        cookie.fechar(resp);
        resp.sendRedirect(props.baseUrl() + "/?erroLogin=" + URLEncoder.encode(codigo, StandardCharsets.UTF_8));
    }

    private static void encerrarSessaoHttp(HttpServletRequest req) {
        SecurityContextHolder.clearContext();
        HttpSession s = req.getSession(false);
        if (s != null) {
            s.invalidate();
        }
    }
}
