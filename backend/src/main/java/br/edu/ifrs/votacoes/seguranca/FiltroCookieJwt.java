package br.edu.ifrs.votacoes.seguranca;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

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
 */
public class FiltroCookieJwt extends OncePerRequestFilter {

    private final CookieSessao cookie;
    private final JwtService jwt;
    private final UsuarioRepository usuarios;

    public FiltroCookieJwt(CookieSessao cookie, JwtService jwt, UsuarioRepository usuarios) {
        this.cookie = cookie;
        this.jwt = jwt;
        this.usuarios = usuarios;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp, FilterChain chain)
            throws ServletException, IOException {
        String token = cookie.ler(req);
        if (token != null && !token.isEmpty()) {
            jwt.validar(token).flatMap(usuarios::findById).ifPresent(this::autenticar);
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
