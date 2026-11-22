package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;

import br.edu.ifrs.votacoes.seguranca.CookieSessao;
import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

/** Cadastro, login, sessão, admin fixo e aprovação de docentes (seções 2.1, 2.3 e 5.1). */
class AutenticacaoTest extends TesteIntegracao {

    // ---------- sessão ----------

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
    void rotasDoGoogleEDevLoginNaoExistemMais() throws Exception {
        executar(get("/api/auth/config"), null).andExpect(status().isUnauthorized());
        executar(post("/api/dev/login"), null).andExpect(status().isUnauthorized());
        executar(get("/api/oauth2/authorization/google"), null).andExpect(status().isUnauthorized());
        Sessao adm = admin();
        executar(post("/api/dev/login"), adm).andExpect(status().isForbidden());
        executar(get("/api/auth/config"), adm).andExpect(status().isNotFound());
    }

    @Test
    void cookieDeSessaoEHttpOnlyESameSiteLax() throws Exception {
        cadastrar("A", "a@escola.edu.br", SENHA, "M1", "ALUNO")
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString(CookieSessao.NOME + "=")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Lax")))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=43200")));
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

    // ---------- cadastro ----------

    @Test
    void alunoFicaAtivoImediatamenteEJaEntraLogado() throws Exception {
        Sessao s = sessaoDe(cadastrar("Aluno Um", "Aluno.Um@Escola.EDU.br", SENHA, " 2024001 ", "ALUNO")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.papel").value("ALUNO"))
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.email").value("aluno.um@escola.edu.br"))
                .andExpect(jsonPath("$.matricula").value("2024001"))
                .andExpect(jsonPath("$.nome").value("Aluno Um"))
                .andExpect(jsonPath("$.fotoUrl").doesNotExist())
                .andReturn(), json);
        executar(get("/api/auth/me"), s).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(s.id()));
        executar(get("/api/turmas"), s).andExpect(status().isOk());
    }

    @Test
    void senhaEGuardadaComoHashBcrypt() throws Exception {
        aluno("Aluno", "M1");
        String hash = jdbc.queryForObject("select senha_hash from usuario where email = ?", String.class,
                emailDe("Aluno"));
        assertThat(hash).startsWith("$2").doesNotContain(SENHA);
    }

    @Test
    void cadastroValidaCampos() throws Exception {
        enviar(post("/api/auth/cadastro"), null, Map.of("papel", "ALUNO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("VALIDACAO"))
                .andExpect(jsonPath("$.campos.matricula").exists())
                .andExpect(jsonPath("$.campos.nome").exists())
                .andExpect(jsonPath("$.campos.email").exists())
                .andExpect(jsonPath("$.campos.senha").exists());
        cadastrar("X", "x@escola.edu.br", SENHA, "1", "ADMIN")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.papel").exists());
        cadastrar("X", "nao-e-email", SENHA, "1", "ALUNO")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.email").exists());
        assertThat(jdbc.queryForObject("select count(*) from usuario", Integer.class)).isEqualTo(1); // só o admin
    }

    @Test
    void senhaPrecisaTerDe8A72Caracteres() throws Exception {
        cadastrar("X", "x@escola.edu.br", "1234567", "1", "ALUNO")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.senha").value("deve ter entre 8 e 72 caracteres"));
        cadastrar("X", "x@escola.edu.br", "a".repeat(73), "1", "ALUNO").andExpect(status().isBadRequest());
        // 72 caracteres, mas mais de 72 bytes (limite real do BCrypt).
        cadastrar("X", "x@escola.edu.br", "é".repeat(40), "1", "ALUNO").andExpect(status().isBadRequest());
        cadastrar("X", "x@escola.edu.br", "12345678", "1", "ALUNO").andExpect(status().isOk());
        cadastrar("Y", "y@escola.edu.br", "a".repeat(72), "2", "ALUNO").andExpect(status().isOk());
        login("y@escola.edu.br", "a".repeat(72));
    }

    @Test
    void emailDuplicadoIgnorandoMaiusculasRetorna409() throws Exception {
        aluno("Aluno Um", "M1");
        cadastrar("Outro", "ALUNO.UM@escola.edu.br", SENHA, "M2", "ALUNO")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("CONFLITO"));
        cadastrar("Outro", EMAIL_ADMIN, SENHA, "M3", "ALUNO").andExpect(status().isConflict());
    }

    @Test
    void matriculaDuplicadaRetorna409() throws Exception {
        aluno("Aluno Um", "M1");
        cadastrar("Outro", "outro@escola.edu.br", SENHA, "M1", "DOCENTE").andExpect(status().isConflict());
    }

    // ---------- login ----------

    @Test
    void loginComSenhaCorretaAbreSessao() throws Exception {
        long id = aluno("Aluno", "M1").id();
        Sessao s = sessaoDe(tentarLogin(" ALUNO@escola.edu.br ", SENHA)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andReturn(), json);
        executar(get("/api/auth/me"), s).andExpect(jsonPath("$.email").value("aluno@escola.edu.br"));
    }

    @Test
    void senhaErradaEEmailInexistenteDaoA_MesmaResposta401() throws Exception {
        aluno("Aluno", "M1");
        String errada = corpo(tentarLogin("aluno@escola.edu.br", "senha-errada-xyz")
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("Set-Cookie"))).toString();
        String inexistente = corpo(tentarLogin("ninguem@escola.edu.br", "senha-errada-xyz")
                .andExpect(status().isUnauthorized())).toString();
        assertThat(errada).isEqualTo(inexistente)
                .contains("E-mail ou senha incorretos.").contains("NAO_AUTENTICADO");
    }

    @Test
    void contaAntigaSemSenhaNaoEntra() throws Exception {
        jdbc.update("insert into usuario (email, nome, matricula, papel, status) "
                + "values ('antigo@escola.edu.br', 'Antigo', 'A0', 'ALUNO', 'ATIVO')");
        tentarLogin("antigo@escola.edu.br", "qualquer-coisa").andExpect(status().isUnauthorized());
        tentarLogin("antigo@escola.edu.br", "").andExpect(status().isUnauthorized());
    }

    @Test
    void loginValidaCampos() throws Exception {
        enviar(post("/api/auth/login"), null, Map.of("email", "")).andExpect(status().isBadRequest());
        // Senha enorme não quebra o BCrypt: é só credencial errada.
        aluno("Aluno", "M1");
        tentarLogin("aluno@escola.edu.br", "x".repeat(150)).andExpect(status().isUnauthorized());
    }

    // ---------- docentes ----------

    @Test
    void docentePendenteEntraLogadoMasNaoAcessaTurmasAteAprovacao() throws Exception {
        Sessao d = sessaoDe(cadastrar("Professora", "prof@escola.edu.br", SENHA, "D1", "DOCENTE")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDENTE_APROVACAO"))
                .andReturn(), json);
        executar(get("/api/auth/me"), d).andExpect(jsonPath("$.status").value("PENDENTE_APROVACAO"));
        enviar(post("/api/turmas"), d, Map.of("nome", "T")).andExpect(status().isForbidden());
        // Login posterior também funciona (vê a tela de espera).
        login("prof@escola.edu.br", SENHA);

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
        Sessao d = docentePendente("Professor", "D1");
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

    // ---------- admin fixo ----------

    @Test
    void adminFixoExisteComSenhaPadraoENaoGerenciaVotacoes() throws Exception {
        Sessao adm = admin();
        executar(get("/api/auth/me"), adm)
                .andExpect(jsonPath("$.email").value("adm@gmail.com"))
                .andExpect(jsonPath("$.papel").value("ADMIN"))
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.matricula").value(nullValue()));
        executar(get("/api/votacoes"), adm).andExpect(status().isForbidden());
        executar(get("/api/turmas"), adm).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("select count(*) from usuario where papel = 'ADMIN'", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void adminFixoNaoESobrescritoNaInicializacao() throws Exception {
        String hash = jdbc.queryForObject("select senha_hash from usuario where email = ?", String.class, EMAIL_ADMIN);
        jdbc.update("update usuario set nome = 'Admin renomeado' where email = ?", EMAIL_ADMIN);
        adminFixo.garantir();
        assertThat(jdbc.queryForObject("select count(*) from usuario where email = ?", Integer.class, EMAIL_ADMIN))
                .isEqualTo(1);
        assertThat(jdbc.queryForMap("select nome, senha_hash from usuario where email = ?", EMAIL_ADMIN))
                .containsEntry("nome", "Admin renomeado").containsEntry("senha_hash", hash);
    }

    @Test
    void adminNaoPodeSerAprovadoNemRejeitado() throws Exception {
        Sessao adm = admin();
        executar(post("/api/admin/usuarios/" + adm.id() + "/aprovar"), adm).andExpect(status().isUnprocessableEntity());
        executar(post("/api/admin/usuarios/" + adm.id() + "/rejeitar"), adm).andExpect(status().isUnprocessableEntity());
        executar(get("/api/auth/me"), adm).andExpect(jsonPath("$.status").value("ATIVO"));
    }

    @Test
    void adminNaoTrocaSenha() throws Exception {
        Sessao adm = admin();
        enviar(put("/api/auth/senha"), adm, Map.of("senhaAtual", SENHA_ADMIN, "novaSenha", "nova-senha-123"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("SEM_PERMISSAO"));
        login(EMAIL_ADMIN, SENHA_ADMIN);
    }

    @Test
    void somenteAdminAcessaRotasDeAdmin() throws Exception {
        Sessao a = aluno("Aluno", "M1");
        executar(get("/api/admin/usuarios"), a)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("SEM_PERMISSAO"));
        executar(get("/api/admin/dominios"), a).andExpect(status().isForbidden());
    }
}
