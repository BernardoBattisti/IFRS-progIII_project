package br.edu.ifrs.votacoes.seguranca;

import java.io.IOException;
import java.net.URI;
import java.util.Locale;
import java.util.Set;

import org.springframework.web.filter.OncePerRequestFilter;

import br.edu.ifrs.votacoes.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Defesa contra CSRF de mesmo site (complementa o cookie SameSite=Lax): para métodos não seguros em
 * /api/**, recusa (403) a requisição quando o navegador indica outra origem:
 * <ul>
 * <li>{@code Sec-Fetch-Site} presente e diferente de {@code same-origin}/{@code none};</li>
 * <li>{@code Origin} presente e diferente da origem de APP_BASE_URL.</li>
 * </ul>
 * Requisições sem esses cabeçalhos (curl, clientes não navegadores) passam: elas não carregam o
 * cookie da vítima por conta própria. O proxy do Next.js repassa os cabeçalhos do navegador, cuja
 * origem é APP_BASE_URL.
 */
public class FiltroOrigem extends OncePerRequestFilter {

    private static final Set<String> METODOS_SEGUROS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");
    private static final Set<String> FETCH_SITE_PERMITIDOS = Set.of("same-origin", "none");

    private final String origemPermitida;
    private final RespostasSeguranca respostas;

    public FiltroOrigem(AppProperties props, RespostasSeguranca respostas) {
        this.origemPermitida = origemDe(props.baseUrl());
        this.respostas = respostas;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        String caminho = req.getRequestURI().substring(req.getContextPath().length());
        return METODOS_SEGUROS.contains(req.getMethod().toUpperCase(Locale.ROOT)) || !caminho.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp, FilterChain chain)
            throws ServletException, IOException {
        String fetchSite = req.getHeader("Sec-Fetch-Site");
        if (fetchSite != null && !FETCH_SITE_PERMITIDOS.contains(fetchSite.trim().toLowerCase(Locale.ROOT))) {
            respostas.origemRecusada(resp);
            return;
        }
        String origin = req.getHeader("Origin");
        if (origin != null && !origemPermitida.equals(origemDe(origin))) {
            respostas.origemRecusada(resp);
            return;
        }
        chain.doFilter(req, resp);
    }

    /** scheme://host[:porta], em minúsculas e sem porta padrão; "" se inválida. */
    static String origemDe(String url) {
        try {
            URI u = URI.create(url.trim());
            if (u.getScheme() == null || u.getHost() == null) {
                return "";
            }
            String esquema = u.getScheme().toLowerCase(Locale.ROOT);
            int porta = u.getPort();
            boolean padrao = porta == -1 || ("http".equals(esquema) && porta == 80)
                    || ("https".equals(esquema) && porta == 443);
            return esquema + "://" + u.getHost().toLowerCase(Locale.ROOT) + (padrao ? "" : ":" + porta);
        } catch (IllegalArgumentException e) {
            return "";
        }
    }
}
