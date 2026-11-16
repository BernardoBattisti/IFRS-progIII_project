package br.edu.ifrs.votacoes;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;

import java.util.Map;

import org.junit.jupiter.api.Test;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

class AutenticacaoTest extends TesteIntegracao {

    @Test
    void configuracaoPublicaInformaDevLoginEGoogleDesabilitado() throws Exception {
        executar(get("/api/auth/config"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.devLogin").value(true))
                .andExpect(jsonPath("$.googleHabilitado").value(false));
    }

    @Test
    void semCookieRetorna401NoFormatoPadrao() throws Exception {
        executar(get("/api/auth/me"), null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.erro").value("NAO_AUTENTICADO"))
                .andExpect(jsonPath("$.campos").doesNotExist());
        executar(get("/api/turmas"), null).andExpect(status().isUnauthorized());
    }

    @Test
    void cookieDeSessaoEHttpOnlyESameSiteLax() throws Exception {
        mvc.perform(post("/api/dev/login").contentType("application/json")
                .content("{\"email\":\"a@escola.edu.br\",\"nome\":\"A\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Lax")));
    }

    @Test
    void primeiroAcessoFicaComCadastroIncompletoESemPapel() throws Exception {
        Sessao s = login("novo@escola.edu.br", "Novo Usuário");
        executar(get("/api/auth/me"), s)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CADASTRO_INCOMPLETO"))
                .andExpect(jsonPath("$.papel").value(nullValue()))
                .andExpect(jsonPath("$.matricula").value(nullValue()))
                .andExpect(jsonPath("$.fotoUrl").value(nullValue()))
                .andExpect(jsonPath("$.email").value("novo@escola.edu.br"));
        // Sem cadastro concluído não acessa rotas de negócio.
        executar(get("/api/turmas"), s).andExpect(status().isForbidden());
    }

    @Test
    void alunoFicaAtivoImediatamente() throws Exception {
        Sessao s = login("aluno@escola.edu.br", "Aluno");
        cadastro(s, "ALUNO", "2024001")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.papel").value("ALUNO"))
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.matricula").value("2024001"));
        executar(get("/api/turmas"), s).andExpect(status().isOk());
    }

    @Test
    void cadastroExigeMatriculaEPapel() throws Exception {
        Sessao s = login("x@escola.edu.br", "X");
        enviar(post("/api/auth/cadastro"), s, Map.of("papel", "ALUNO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("VALIDACAO"))
                .andExpect(jsonPath("$.campos.matricula").exists());
        cadastro(s, "ADMIN", "123").andExpect(status().isBadRequest());
    }

    @Test
    void matriculaDuplicadaRetorna409() throws Exception {
        aluno("Aluno Um", "M1");
        Sessao s = login("outro@escola.edu.br", "Outro");
        cadastro(s, "DOCENTE", "M1").andExpect(status().isConflict());
    }

    @Test
    void cadastroNaoPodeSerRefeito() throws Exception {
        Sessao s = aluno("Aluno", "M1");
        cadastro(s, "DOCENTE", "M2").andExpect(status().isForbidden());
    }

    @Test
    void docentePendenteNaoAcessaTurmasAteAprovacao() throws Exception {
        Sessao d = login("prof@escola.edu.br", "Professora");
        cadastro(d, "DOCENTE", "D1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDENTE_APROVACAO"));
        enviar(post("/api/turmas"), d, Map.of("nome", "T")).andExpect(status().isForbidden());

        Sessao adm = admin();
        executar(get("/api/admin/usuarios?status=PENDENTE_APROVACAO&papel=DOCENTE"), adm)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(d.id()));

        executar(post("/api/admin/usuarios/" + d.id() + "/aprovar"), adm)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ATIVO"));
        // O mesmo cookie passa a valer como docente ativo (status é relido a cada requisição).
        enviar(post("/api/turmas"), d, Map.of("nome", "T")).andExpect(status().isOk());
    }

    @Test
    void docenteRejeitadoContinuaSemAcesso() throws Exception {
        Sessao d = login("prof@escola.edu.br", "Professor");
        cadastro(d, "DOCENTE", "D1");
        Sessao adm = admin();
        executar(post("/api/admin/usuarios/" + d.id() + "/rejeitar"), adm)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJEITADO"));
        executar(get("/api/turmas"), d).andExpect(status().isForbidden());
        executar(get("/api/auth/me"), d).andExpect(jsonPath("$.status").value("REJEITADO"));
        // Não é mais "pendente": nova decisão é regra de negócio violada.
        executar(post("/api/admin/usuarios/" + d.id() + "/aprovar"), adm)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.erro").value("REGRA_NEGOCIO"));
    }

    @Test
    void aprovarAlunoOuInexistenteFalha() throws Exception {
        Sessao a = aluno("Aluno", "M1");
        Sessao adm = admin();
        executar(post("/api/admin/usuarios/" + a.id() + "/aprovar"), adm).andExpect(status().isUnprocessableEntity());
        executar(post("/api/admin/usuarios/9999/aprovar"), adm).andExpect(status().isNotFound());
    }

    @Test
    void emailDeAdminViraAdminAtivoENaoGerenciaVotacoes() throws Exception {
        Sessao adm = admin();
        executar(get("/api/auth/me"), adm)
                .andExpect(jsonPath("$.papel").value("ADMIN"))
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.matricula").value(nullValue()));
        executar(get("/api/votacoes"), adm).andExpect(status().isForbidden());
        executar(get("/api/turmas"), adm).andExpect(status().isForbidden());
    }

    @Test
    void somenteAdminAcessaRotasDeAdmin() throws Exception {
        Sessao a = aluno("Aluno", "M1");
        executar(get("/api/admin/usuarios"), a)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("SEM_PERMISSAO"));
    }

    @Test
    void logoutApagaCookie() throws Exception {
        Sessao a = aluno("Aluno", "M1");
        executar(post("/api/auth/logout"), a)
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    @Test
    void cookieAdulteradoEIgnorado() throws Exception {
        Sessao a = aluno("Aluno", "M1");
        String token = a.cookie().getValue();
        var adulterado = new jakarta.servlet.http.Cookie(a.cookie().getName(), token.substring(0, token.length() - 2) + "xx");
        mvc.perform(get("/api/auth/me").cookie(adulterado)).andExpect(status().isUnauthorized());
    }
}
