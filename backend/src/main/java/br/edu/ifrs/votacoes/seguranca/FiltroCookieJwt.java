package br.edu.ifrs.votacoes.seguranca;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import br.edu.ifrs.votacoes.dominio.DominioService;
import br.edu.ifrs.votacoes.usuario.Usuario;
import br.edu.ifrs.votacoes.usuario.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Autentica a requisição a partir do cookie de sessão. O usuário é recarregado do banco a cada
 * requisição, então aprovação/rejeição pelo admin vale imediatamente. O papel (ROLE_*) só é
 * concedido a contas ATIVO; contas em outro status ficam apenas "autenticadas".
 * <p>
 * Também confere a lista de domínios aceitos (seção 2.2) a cada requisição: se o domínio da conta
 * deixou de ser aceito, a sessão é ignorada e as rotas protegidas respondem 403 com a mensagem de
 * domínio (ver {@link RespostasSeguranca#commence}). Rotas públicas (login, cadastro, logout...)
 * continuam funcionando. O admin não passa por essa verificação.
 */
public class FiltroCookieJwt extends OncePerRequestFilter {

    /** Atributo da requisição com o domínio recusado da sessão. */
    public static final String ATRIBUTO_DOMINIO_RECUSADO = FiltroCookieJwt.class.getName() + ".dominioRecusado";

    private final CookieSessao cookie;
    private final JwtService jwt;
    private final UsuarioRepository usuarios;
    private final DominioService dominios;

    public FiltroCookieJwt(CookieSessao cookie, JwtService jwt, UsuarioRepository usuarios, DominioService dominios) {
        this.cookie = cookie;
        this.jwt = jwt;
        this.usuarios = usuarios;
        this.dominios = dominios;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp, FilterChain chain)
            throws ServletException, IOException {
        String token = cookie.ler(req);
        if (token != null && !token.isEmpty()) {
            jwt.validar(token).flatMap(usuarios::findById).ifPresent(u -> {
                if (u.isAdmin()) {
                    autenticar(u);
                    return;
                }
                String dominio = DominioService.dominioDoEmail(u.getEmail());
                if (dominios.aceita(dominio)) {
                    autenticar(u);
                } else {
                    req.setAttribute(ATRIBUTO_DOMINIO_RECUSADO, dominio);
                }
            });
        }
        chain.doFilter(req, resp);
    }

    private void autenticar(Usuario u) {
        List<SimpleGrantedAuthority> autoridades = (u.isAtivo() && u.getPapel() != null)
                ? List.of(new SimpleGrantedAuthority("ROLE_" + u.getPapel().name()))
                : List.of();
        var auth = new UsernamePasswordAuthenticationToken(new UsuarioAutenticado(u.getId()), null, autoridades);
        var ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);
    }
}
