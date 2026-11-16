package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import br.edu.ifrs.votacoes.suporte.BancoEmbutido;
import br.edu.ifrs.votacoes.suporte.TesteIntegracao;
import br.edu.ifrs.votacoes.usuario.DevLoginController;
import br.edu.ifrs.votacoes.usuario.LoginNegadoException;
import br.edu.ifrs.votacoes.usuario.UsuarioService;

/** Sem o perfil "dev": não existe login de desenvolvimento. Também testa APP_ALLOWED_DOMAINS. */
@SpringBootTest
@AutoConfigureMockMvc
class SemPerfilDevTest {

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", BancoEmbutido::jdbcUrl);
        r.add("spring.datasource.username", () -> "postgres");
        r.add("spring.datasource.password", () -> "postgres");
        r.add("app.jwt-secret", () -> TesteIntegracao.SEGREDO);
        r.add("app.allowed-domains", () -> "escola.edu.br, @aluno.escola.edu.br");
        r.add("app.upload-dir", () -> System.getProperty("java.io.tmpdir") + "/votacoes-sem-dev");
    }

    @Autowired
    MockMvc mvc;
    @Autowired
    ApplicationContext ctx;
    @Autowired
    UsuarioService usuarios;

    @Test
    void loginDeDesenvolvimentoNaoExiste() throws Exception {
        assertThat(ctx.getBeanNamesForType(DevLoginController.class)).isEmpty();
        mvc.perform(post("/api/dev/login").contentType("application/json")
                .content("{\"email\":\"a@escola.edu.br\",\"nome\":\"A\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("NAO_ENCONTRADO"));
        mvc.perform(get("/api/auth/config"))
                .andExpect(jsonPath("$.devLogin").value(false))
                .andExpect(jsonPath("$.googleHabilitado").value(false));
    }

    @Test
    void googleDesabilitadoNaoTemRotaOAuth() throws Exception {
        mvc.perform(get("/api/oauth2/authorization/google")).andExpect(status().isNotFound());
    }

    @Test
    void dominioNaoAceitoNegaLogin() {
        assertThatThrownBy(() -> usuarios.login("fulano@gmail.com", "Fulano", null, "sub-1"))
                .isInstanceOf(LoginNegadoException.class);
        assertThat(usuarios.login("Ciclano@Escola.edu.br", "Ciclano", null, "sub-2").getEmail())
                .isEqualTo("ciclano@escola.edu.br");
        assertThat(usuarios.login("beltrano@aluno.escola.edu.br", "Beltrano", null, "sub-3").getId()).isNotNull();
    }
}
