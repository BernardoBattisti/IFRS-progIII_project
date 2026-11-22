package br.edu.ifrs.votacoes.seguranca;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.edu.ifrs.votacoes.dominio.DominioService;
import br.edu.ifrs.votacoes.erro.ErroResposta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** 401/403 no formato JSON de erro da API. */
@Component
public class RespostasSeguranca implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper json;

    public RespostasSeguranca(ObjectMapper json) {
        this.json = json;
    }

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse resp, AuthenticationException e)
            throws IOException {
        if (req.getAttribute(FiltroCookieJwt.ATRIBUTO_DOMINIO_RECUSADO) instanceof String dominio) {
            // Sessão válida, mas o domínio da conta saiu da lista de aceitos.
            escrever(resp, new ErroResposta(403, "DOMINIO_NAO_ACEITO", DominioService.mensagemRecusa(dominio), null));
            return;
        }
        escrever(resp, new ErroResposta(401, "NAO_AUTENTICADO", "Você precisa entrar no sistema.", null));
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse resp, AccessDeniedException e)
            throws IOException {
        escrever(resp, new ErroResposta(403, "SEM_PERMISSAO",
                "Você não tem permissão para esta ação (verifique seu papel e se sua conta está ativa).", null));
    }

    public void origemRecusada(HttpServletResponse resp) throws IOException {
        escrever(resp, new ErroResposta(403, "SEM_PERMISSAO",
                "Requisição recusada: origem não permitida.", null));
    }

    public void muitasTentativas(HttpServletResponse resp, long segundos) throws IOException {
        resp.setHeader("Retry-After", Long.toString(segundos));
        escrever(resp, new ErroResposta(429, "MUITAS_TENTATIVAS", "Muitas tentativas. Aguarde um minuto.", null));
    }

    private void escrever(HttpServletResponse resp, ErroResposta erro) throws IOException {
        resp.setStatus(erro.status());
        resp.setContentType(MediaType.APPLICATION_JSON_VALUE);
        resp.setCharacterEncoding("UTF-8");
        json.writeValue(resp.getOutputStream(), erro);
    }
}
