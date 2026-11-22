package br.edu.ifrs.votacoes;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

/** Lista de domínios aceitos (seções 2.2 e 5.2): rotas do admin e verificação no cadastro, login e sessão. */
class DominioTest extends TesteIntegracao {

    static final String MSG_GMAIL = "O domínio de e-mail \"gmail.com\" não é aceito por este sistema.";

    // ---------- rotas do admin ----------

    @Test
    void adminAdicionaListaEmOrdemERemove() throws Exception {
        Sessao adm = admin();
        long id = corpo(enviar(post("/api/admin/dominios"), adm, Map.of("dominio", "  @IFRS.edu.BR "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dominio").value("ifrs.edu.br"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.criadoEm").value(T0.toString()))).get("id").asLong();
        enviar(post("/api/admin/dominios"), adm, Map.of("dominio", "aluno.ifrs.edu.br")).andExpect(status().isOk());
        enviar(post("/api/admin/dominios"), adm, Map.of("dominio", "escola.edu.br")).andExpect(status().isOk());

        executar(get("/api/admin/dominios"), adm)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].dominio").value("aluno.ifrs.edu.br"))
                .andExpect(jsonPath("$[1].dominio").value("escola.edu.br"))
                .andExpect(jsonPath("$[2].dominio").value("ifrs.edu.br"));

        executar(delete("/api/admin/dominios/" + id), adm).andExpect(status().isNoContent());
        executar(get("/api/admin/dominios"), adm).andExpect(jsonPath("$", hasSize(2)));
        executar(delete("/api/admin/dominios/" + id), adm).andExpect(status().isNotFound());
    }

    @Test
    void dominioDuplicadoAposNormalizarRetorna409() throws Exception {
        Sessao adm = admin();
        enviar(post("/api/admin/dominios"), adm, Map.of("dominio", "ifrs.edu.br")).andExpect(status().isOk());
        enviar(post("/api/admin/dominios"), adm, Map.of("dominio", "@IFRS.EDU.BR"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("CONFLITO"));
    }

    @Test
    void formatoInvalidoRetorna400() throws Exception {
        Sessao adm = admin();
        for (String invalido : new String[] { "", "ifrs", "fulano@ifrs.edu.br", "-ifrs.edu.br", "ifrs..edu.br",
                "ifrs.edu.br.", "if_rs.edu.br", "http://ifrs.edu.br", "a".repeat(64) + ".com" }) {
            enviar(post("/api/admin/dominios"), adm, Map.of("dominio", invalido))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value("VALIDACAO"))
                    .andExpect(jsonPath("$.campos.dominio").exists());
        }
        enviar(post("/api/admin/dominios"), adm, Map.of()).andExpect(status().isBadRequest());
        executar(get("/api/admin/dominios"), adm).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void naoAdminNaoGerenciaDominios() throws Exception {
        Sessao d = docente("Prof", "D1");
        enviar(post("/api/admin/dominios"), d, Map.of("dominio", "x.com")).andExpect(status().isForbidden());
        executar(get("/api/admin/dominios"), null).andExpect(status().isUnauthorized());
    }

    // ---------- cadastro ----------

    @Test
    void listaVaziaAceitaQualquerDominio() throws Exception {
        cadastrar("Fulano", "fulano@gmail.com", SENHA, "M1", "ALUNO").andExpect(status().isOk());
    }

    @Test
    void cadastroComDominioNaoAceitoRetorna403ENaoCriaConta() throws Exception {
        adicionarDominio("ifrs.edu.br");
        cadastrar("Fulano", "fulano@gmail.com", SENHA, "M1", "ALUNO")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("DOMINIO_NAO_ACEITO"))
                .andExpect(jsonPath("$.mensagem").value(MSG_GMAIL));
        // Comparação exata: subdomínio não é o domínio.
        cadastrar("Sub", "sub@aluno.ifrs.edu.br", SENHA, "M2", "DOCENTE").andExpect(status().isForbidden());
        cadastrar("Ok", "OK@IFRS.EDU.BR", SENHA, "M3", "ALUNO").andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(
                jdbc.queryForObject("select count(*) from usuario where papel <> 'ADMIN'", Integer.class)).isEqualTo(1);
    }

    // ---------- login ----------

    @Test
    void loginComDominioRemovidoRetorna403AteODominioVoltar() throws Exception {
        aluno("Fulano", "M1"); // fulano@escola.edu.br, com lista vazia
        adicionarDominio("ifrs.edu.br");
        tentarLogin("fulano@escola.edu.br", SENHA)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("DOMINIO_NAO_ACEITO"))
                .andExpect(jsonPath("$.mensagem")
                        .value("O domínio de e-mail \"escola.edu.br\" não é aceito por este sistema."));
        adicionarDominio("escola.edu.br");
        login("fulano@escola.edu.br", SENHA);
    }

    @Test
    void dominioNaoAceitoNaoRevelaSeAContaExiste() throws Exception {
        cadastrar("Fulano", "fulano@gmail.com", SENHA, "M1", "ALUNO").andExpect(status().isOk());
        adicionarDominio("ifrs.edu.br");
        String existente = corpo(tentarLogin("fulano@gmail.com", "senha-errada-1").andExpect(status().isForbidden()))
                .toString();
        String inexistente = corpo(tentarLogin("ninguem@gmail.com", "senha-errada-1").andExpect(status().isForbidden()))
                .toString();
        org.assertj.core.api.Assertions.assertThat(existente).isEqualTo(inexistente);
    }

    // ---------- sessão já aberta ----------

    @Test
    void removerDominioDerrubaSessaoAbertaComA403EVoltarRestaura() throws Exception {
        Sessao adm = admin();
        long id = corpo(enviar(post("/api/admin/dominios"), adm, Map.of("dominio", "escola.edu.br"))).get("id").asLong();
        Sessao a = aluno("Aluno", "A1");
        Sessao d = docente("Prof", "D1");
        executar(get("/api/turmas"), a).andExpect(status().isOk());

        executar(delete("/api/admin/dominios/" + id), adm).andExpect(status().isNoContent());
        enviar(post("/api/admin/dominios"), adm, Map.of("dominio", "ifrs.edu.br")).andExpect(status().isOk());

        String msg = "O domínio de e-mail \"escola.edu.br\" não é aceito por este sistema.";
        executar(get("/api/auth/me"), a)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("DOMINIO_NAO_ACEITO"))
                .andExpect(jsonPath("$.mensagem").value(msg));
        executar(get("/api/turmas"), a).andExpect(status().isForbidden()).andExpect(jsonPath("$.mensagem").value(msg));
        enviar(post("/api/turmas"), d, Map.of("nome", "T")).andExpect(status().isForbidden());
        // Logout continua funcionando para limpar o cookie.
        executar(post("/api/auth/logout"), a).andExpect(status().isNoContent());

        // Lista vazia de novo = qualquer domínio: a mesma sessão volta a valer.
        long ifrs = corpo(executar(get("/api/admin/dominios"), adm)).get(0).get("id").asLong();
        executar(delete("/api/admin/dominios/" + ifrs), adm).andExpect(status().isNoContent());
        executar(get("/api/auth/me"), a).andExpect(status().isOk());
        executar(get("/api/turmas"), a).andExpect(status().isOk());
    }

    // ---------- admin isento ----------

    @Test
    void adminFicaForaDaVerificacaoDeDominio() throws Exception {
        Sessao adm = admin();
        enviar(post("/api/admin/dominios"), adm, Map.of("dominio", "ifrs.edu.br")).andExpect(status().isOk());
        // gmail.com não está na lista, mas o admin continua com a sessão e consegue entrar de novo.
        executar(get("/api/auth/me"), adm).andExpect(status().isOk());
        executar(get("/api/admin/dominios"), adm).andExpect(status().isOk());
        login(EMAIL_ADMIN, SENHA_ADMIN);
        // Outros e-mails do gmail continuam recusados.
        cadastrar("Fulano", "fulano@gmail.com", SENHA, "M1", "ALUNO").andExpect(status().isForbidden());
    }
}
