package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

/**
 * Limites de tentativas (seção 5.1): login 10/min e "esqueci minha senha" 5/min POR E-MAIL,
 * independentes do IP; cadastro e redefinição 30/min por IP (freio grosseiro).
 */
class LimiteTentativasTest extends TesteIntegracao {

    private ResultActions loginDe(String ip, String email, String senha) throws Exception {
        return enviar(post("/api/auth/login").header("X-Forwarded-For", ip), null,
                Map.of("email", email, "senha", senha));
    }

    private ResultActions esqueciDe(String ip, String email) throws Exception {
        return enviar(post("/api/auth/esqueci-senha").header("X-Forwarded-For", ip), null, Map.of("email", email));
    }

    private static void esperar429(ResultActions r) throws Exception {
        r.andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.erro").value("MUITAS_TENTATIVAS"))
                .andExpect(jsonPath("$.mensagem").value("Muitas tentativas. Aguarde um minuto."))
                .andExpect(header().string("Retry-After", "60"))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void decimaPrimeiraTentativaDeLoginNoMesmoEmailRecebe429MesmoVariandoOIp() throws Exception {
        aluno("Aluno", "A1");
        for (int i = 0; i < 9; i++) {
            loginDe("203.0.113." + i, "aluno@escola.edu.br", "senha-errada-" + i).andExpect(status().isUnauthorized());
        }
        // Sucesso também conta e não zera o contador.
        loginDe("203.0.113.9", "aluno@escola.edu.br", SENHA).andExpect(status().isOk());
        // 11ª, com senha certa, outro IP e o e-mail em outra grafia: 429.
        esperar429(loginDe("198.51.100.77", "  ALUNO@Escola.edu.BR ", SENHA));
        // Sem cabeçalho de IP também.
        esperar429(enviar(post("/api/auth/login"), null, Map.of("email", "aluno@escola.edu.br", "senha", SENHA)));

        // Outro e-mail não é afetado.
        aluno("Outro", "A2");
        loginDe("198.51.100.77", "outro@escola.edu.br", SENHA).andExpect(status().isOk());

        // Passado um minuto, a janela recomeça.
        relogio.avancar(Duration.ofSeconds(59));
        esperar429(loginDe("203.0.113.1", "aluno@escola.edu.br", SENHA));
        relogio.avancar(Duration.ofSeconds(1));
        loginDe("203.0.113.1", "aluno@escola.edu.br", SENHA).andExpect(status().isOk());
    }

    @Test
    void loginsDeEmailsDiferentesDoMesmoIpNaoGeram429() throws Exception {
        for (int i = 0; i < 15; i++) {
            loginDe("192.0.2.1", "aluno" + i + "@escola.edu.br", "senha-qualquer").andExpect(status().isUnauthorized());
        }
        for (int i = 0; i < 12; i++) {
            enviar(post("/api/auth/login"), null, Map.of("email", "sem-ip" + i + "@escola.edu.br", "senha", "x"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void loginComCorpoInvalidoSegueParaValidacao() throws Exception {
        for (int i = 0; i < 12; i++) {
            enviar(post("/api/auth/login").header("X-Forwarded-For", "192.0.2.9"), null, Map.of("senha", "x"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void sextoEsqueciSenhaNoMesmoEmailRecebe429() throws Exception {
        aluno("Aluno", "A1");
        for (int i = 0; i < 5; i++) {
            esqueciDe("203.0.113." + i, "aluno@escola.edu.br").andExpect(status().isNoContent());
        }
        esperar429(esqueciDe("198.51.100.1", "Aluno@Escola.edu.br"));
        // Para e-mail inexistente vale o mesmo limite (não revela se a conta existe).
        for (int i = 0; i < 5; i++) {
            esqueciDe("203.0.113." + i, "ninguem@escola.edu.br").andExpect(status().isNoContent());
        }
        esperar429(esqueciDe("198.51.100.2", "ninguem@escola.edu.br"));
        // Outro e-mail, mesmo IP: segue normal.
        esqueciDe("198.51.100.1", "outro@escola.edu.br").andExpect(status().isNoContent());
        // Pedidos recusados não geraram token: só os 5 primeiros (o último invalidou os anteriores).
        assertThat(jdbc.queryForObject("select count(*) from token_redefinicao_senha", Integer.class)).isEqualTo(5);
    }

    @Test
    void cadastroERedefinicaoTem30PorMinutoPorIp() throws Exception {
        for (String rota : new String[] { "/api/auth/cadastro", "/api/auth/redefinir-senha" }) {
            for (int i = 0; i < 30; i++) {
                int s = mvc.perform(post(rota).header("X-Forwarded-For", "203.0.113.50")
                        .contentType("application/json").content("{}")).andReturn().getResponse().getStatus();
                assertThat(s).as(rota).isEqualTo(400);
            }
            esperar429(mvc.perform(post(rota).header("X-Forwarded-For", "203.0.113.50")
                    .contentType("application/json").content("{}")));
            // Outro IP (primeiro valor do X-Forwarded-For): não afetado.
            mvc.perform(post(rota).header("X-Forwarded-For", "203.0.113.51, 203.0.113.50")
                    .contentType("application/json").content("{}")).andExpect(status().isBadRequest());
        }
        // As rotas autenticadas não têm limite.
        Sessao a = aluno("Aluno", "A1");
        for (int i = 0; i < 35; i++) {
            executar(get("/api/auth/me"), a).andExpect(status().isOk());
        }
    }
}
