package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.test.web.servlet.ResultActions;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

/** Troca de senha e recuperação por e-mail (seções 2.1 e 2.4). */
class SenhaTest extends TesteIntegracao {

    static final String MSG_TOKEN = "Este link de redefinição é inválido ou expirou.";
    static final Pattern LINK = Pattern.compile("http://localhost:3000/redefinir-senha\\?token=([A-Za-z0-9_-]+)");

    // ---------- troca de senha ----------

    @Test
    void trocaSenhaComSenhaAtualCorreta() throws Exception {
        Sessao a = aluno("Aluno", "A1");
        trocar(a, SENHA, "nova-senha-456").andExpect(status().isNoContent());
        tentarLogin(emailDe("Aluno"), SENHA).andExpect(status().isUnauthorized());
        login(emailDe("Aluno"), "nova-senha-456");
    }

    @Test
    void senhaAtualIncorretaRetorna422() throws Exception {
        Sessao a = aluno("Aluno", "A1");
        trocar(a, "nao-e-a-senha", "nova-senha-456")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.erro").value("REGRA_NEGOCIO"));
        login(emailDe("Aluno"), SENHA);
    }

    @Test
    void novaSenhaCurtaRetorna400ESemSessao401() throws Exception {
        Sessao a = aluno("Aluno", "A1");
        trocar(a, SENHA, "curta").andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.novaSenha").exists());
        trocar(null, SENHA, "nova-senha-456").andExpect(status().isUnauthorized());
    }

    @Test
    void docentePendenteTambemTrocaSenha() throws Exception {
        Sessao d = docentePendente("Prof", "D1");
        trocar(d, SENHA, "nova-senha-456").andExpect(status().isNoContent());
    }

    private ResultActions trocar(Sessao s, String atual, String nova) throws Exception {
        return enviar(put("/api/auth/senha"), s, Map.of("senhaAtual", atual, "novaSenha", nova));
    }

    // ---------- esqueci minha senha ----------

    @Test
    void fluxoCompletoDeRedefinicao() throws Exception {
        aluno("Aluno", "A1");
        esqueci("  ALUNO@escola.edu.br ").andExpect(status().isNoContent()).andExpect(content().string(""));
        SimpleMailMessage msg = emailEnviado();
        assertThat(msg.getTo()).containsExactly("aluno@escola.edu.br");
        assertThat(msg.getFrom()).isEqualTo("nao-responda@votacoes.local");
        assertThat(msg.getSubject()).contains("Redefinição de senha");
        assertThat(msg.getText()).contains("Olá, Aluno.").contains("1 hora");
        String token = token(msg);
        assertThat(token.length()).isGreaterThanOrEqualTo(43); // 32 bytes em base64url

        redefinir(token, "senha-nova-789").andExpect(status().isNoContent());
        tentarLogin("aluno@escola.edu.br", SENHA).andExpect(status().isUnauthorized());
        login("aluno@escola.edu.br", "senha-nova-789");
    }

    @Test
    void tokenEGuardadoSoComoHash() throws Exception {
        aluno("Aluno", "A1");
        esqueci("aluno@escola.edu.br");
        String token = token(emailEnviado());
        Map<String, Object> linha = jdbc.queryForMap("select token_hash, expira_em, usado_em from token_redefinicao_senha");
        assertThat((String) linha.get("token_hash")).hasSize(64).isNotEqualTo(token).doesNotContain(token);
        assertThat(linha.get("usado_em")).isNull();
        assertThat(((java.sql.Timestamp) linha.get("expira_em")).toInstant()).isEqualTo(T0.plus(Duration.ofHours(1)));
    }

    @Test
    void contaAntigaSemSenhaPassaAEntrarDepoisDeRedefinir() throws Exception {
        jdbc.update("insert into usuario (email, nome, matricula, papel, status) "
                + "values ('antigo@escola.edu.br', 'Antigo', 'A0', 'ALUNO', 'ATIVO')");
        tentarLogin("antigo@escola.edu.br", "senha-nova-789").andExpect(status().isUnauthorized());
        esqueci("antigo@escola.edu.br");
        redefinir(token(emailEnviado()), "senha-nova-789").andExpect(status().isNoContent());
        login("antigo@escola.edu.br", "senha-nova-789");
    }

    @Test
    void emailInexistenteTemAMesmaRespostaENaoEnviaNada() throws Exception {
        aluno("Aluno", "A1");
        String existente = esqueci("aluno@escola.edu.br").andExpect(status().isNoContent())
                .andReturn().getResponse().getContentAsString();
        String inexistente = esqueci("ninguem@escola.edu.br").andExpect(status().isNoContent())
                .andReturn().getResponse().getContentAsString();
        assertThat(inexistente).isEqualTo(existente);
        verify(mailSender, timeout(5000).times(1)).send(any(SimpleMailMessage.class));
        verify(mailSender, after(300).times(1)).send(any(SimpleMailMessage.class));
        assertThat(jdbc.queryForObject("select count(*) from token_redefinicao_senha", Integer.class)).isEqualTo(1);
    }

    @Test
    void adminNaoRecebeEmailDeRecuperacao() throws Exception {
        esqueci(EMAIL_ADMIN).andExpect(status().isNoContent());
        verify(mailSender, after(300).never()).send(any(SimpleMailMessage.class));
        assertThat(jdbc.queryForObject("select count(*) from token_redefinicao_senha", Integer.class)).isZero();
    }

    @Test
    void tokenSoPodeSerUsadoUmaVez() throws Exception {
        aluno("Aluno", "A1");
        esqueci("aluno@escola.edu.br");
        String token = token(emailEnviado());
        redefinir(token, "senha-nova-789").andExpect(status().isNoContent());
        redefinir(token, "outra-senha-000")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.erro").value("REGRA_NEGOCIO"))
                .andExpect(jsonPath("$.mensagem").value(MSG_TOKEN));
        login("aluno@escola.edu.br", "senha-nova-789");
    }

    @Test
    void tokenExpiraEmUmaHora() throws Exception {
        aluno("Aluno", "A1");
        esqueci("aluno@escola.edu.br");
        String token = token(emailEnviado());
        relogio.avancar(Duration.ofHours(1)); // exatamente 1 h depois: expirado
        redefinir(token, "senha-nova-789")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem").value(MSG_TOKEN));
        login("aluno@escola.edu.br", SENHA);
    }

    @Test
    void tokenValeAteQuaseUmaHora() throws Exception {
        aluno("Aluno", "A1");
        esqueci("aluno@escola.edu.br");
        String token = token(emailEnviado());
        relogio.avancar(Duration.ofMinutes(59).plusSeconds(59));
        redefinir(token, "senha-nova-789").andExpect(status().isNoContent());
    }

    @Test
    void novoPedidoInvalidaTokenAnterior() throws Exception {
        aluno("Aluno", "A1");
        esqueci("aluno@escola.edu.br");
        esqueci("aluno@escola.edu.br");
        ArgumentCaptor<SimpleMailMessage> cap = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, timeout(5000).times(2)).send(cap.capture());
        List<SimpleMailMessage> msgs = cap.getAllValues();
        String antigo = token(msgs.get(0));
        String novo = token(msgs.get(1));
        assertThat(novo).isNotEqualTo(antigo);
        redefinir(antigo, "senha-nova-789").andExpect(status().isUnprocessableEntity());
        redefinir(novo, "senha-nova-789").andExpect(status().isNoContent());
    }

    @Test
    void tokenInventadoOuNovaSenhaCurta() throws Exception {
        redefinir("token-que-nao-existe", "senha-nova-789")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem").value(MSG_TOKEN));
        aluno("Aluno", "A1");
        esqueci("aluno@escola.edu.br");
        String token = token(emailEnviado());
        redefinir(token, "curta").andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.novaSenha").exists());
        // Senha inválida não consome o token.
        redefinir(token, "senha-nova-789").andExpect(status().isNoContent());
        enviar(post("/api/auth/redefinir-senha"), null, Map.of("novaSenha", "senha-nova-789"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void falhaNoEnvioNaoMudaAResposta() throws Exception {
        aluno("Aluno", "A1");
        doThrow(new MailSendException("SMTP fora do ar")).when(mailSender).send(any(SimpleMailMessage.class));
        esqueci("aluno@escola.edu.br").andExpect(status().isNoContent());
        verify(mailSender, timeout(5000)).send(any(SimpleMailMessage.class));
    }

    // ---------- auxiliares ----------

    private ResultActions esqueci(String email) throws Exception {
        return enviar(post("/api/auth/esqueci-senha").header("X-Forwarded-For", ipUnico()), null,
                Map.of("email", email));
    }

    private ResultActions redefinir(String token, String novaSenha) throws Exception {
        return enviar(post("/api/auth/redefinir-senha").header("X-Forwarded-For", ipUnico()), null,
                Map.of("token", token, "novaSenha", novaSenha));
    }

    /** Espera o único e-mail enviado (o envio é assíncrono) e o devolve. */
    private SimpleMailMessage emailEnviado() {
        ArgumentCaptor<SimpleMailMessage> cap = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, timeout(5000).times(1)).send(cap.capture());
        Mockito.clearInvocations(mailSender);
        return cap.getValue();
    }

    private static String token(SimpleMailMessage msg) {
        Matcher m = LINK.matcher(msg.getText());
        assertThat(m.find()).as("link de redefinição no e-mail").isTrue();
        return m.group(1);
    }
}
