package br.edu.ifrs.votacoes.seguranca;

import java.io.IOException;
import java.util.Set;

import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Limite por IP nas rotas públicas de cadastro e redefinição de senha: mais de
 * {@value LimiteTentativas#POR_IP} POSTs por minuto do mesmo IP na mesma rota → 429. (Login e
 * "esqueci minha senha" são limitados por e-mail, nos serviços: ver {@link LimiteTentativas}.)
 * <p>
 * É SÓ UM FREIO CONTRA ABUSO GROSSEIRO, e é contornável: o IP é o primeiro valor de
 * {@code X-Forwarded-For} (senão o {@code remoteAddr}), e o proxy do Next.js repassa esse cabeçalho
 * do navegador sem alterar — quem forjar o cabeçalho escolhe o próprio "IP". Não é isso que protege
 * a redefinição: o token tem 32 bytes aleatórios, o que já torna força bruta inviável. Com
 * {@code server.forward-headers-strategy=framework} o Spring já troca o {@code remoteAddr} pelo
 * primeiro IP desse cabeçalho; o resultado é o mesmo.
 */
public class FiltroLimiteTentativas extends OncePerRequestFilter {

    private static final Set<String> ROTAS = Set.of(
            "/api/auth/cadastro", "/api/auth/redefinir-senha");

    private final LimiteTentativas limite;
    private final RespostasSeguranca respostas;

    public FiltroLimiteTentativas(LimiteTentativas limite, RespostasSeguranca respostas) {
        this.limite = limite;
        this.respostas = respostas;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !"POST".equalsIgnoreCase(req.getMethod()) || !ROTAS.contains(caminho(req));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp, FilterChain chain)
            throws ServletException, IOException {
        if (!limite.permitir(ipDoCliente(req) + " " + caminho(req), LimiteTentativas.POR_IP)) {
            respostas.muitasTentativas(resp, LimiteTentativas.JANELA.toSeconds());
            return;
        }
        chain.doFilter(req, resp);
    }

    static String ipDoCliente(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null) {
            String primeiro = xff.split(",", 2)[0].trim();
            if (!primeiro.isEmpty()) {
                return primeiro.length() <= 64 ? primeiro : primeiro.substring(0, 64);
            }
        }
        return req.getRemoteAddr();
    }

    private static String caminho(HttpServletRequest req) {
        return req.getRequestURI().substring(req.getContextPath().length());
    }
}
