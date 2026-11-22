package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.JsonNode;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.suporte.TesteIntegracao;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotarRequest;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotoItem;
import br.edu.ifrs.votacoes.votacao.VotacaoService;
import br.edu.ifrs.votacoes.votacao.VotoService;

/** Regressões da revisão de segurança (itens 1 a 7; o item 5, do OAuth Google, saiu com o login Google). */
class RevisaoSegurancaTest extends TesteIntegracao {

    @Autowired
    VotoService votoService;
    @Autowired
    VotacaoService votacaoService;
    @Autowired
    TransactionTemplate tx;

    // ---------- 1. overflow de quantidade ----------

    @Test
    void somaDeQuantidadesNaoTransborda() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(1, true, false, "SEMPRE", List.of(), 3));
        votar(a, v.get("id").asLong(), opcaoId(v, 0), Integer.MAX_VALUE, opcaoId(v, 1), Integer.MAX_VALUE,
                opcaoId(v, 2), 3)
                .andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("select count(*) from voto", Integer.class)).isZero();
    }

    @Test
    void quantidadeMaiorQueNEhRegraDeNegocio() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(3, true, false, "SEMPRE", List.of(), 2));
        votar(a, v.get("id").asLong(), opcaoId(v, 0), 4).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void bancoImpedeExcederVotosPorAluno() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(2, true, false, "SEMPRE", List.of(), 2));
        long id = v.get("id").asLong();
        votar(a, id, opcaoId(v, 0), 1).andExpect(status().isOk());
        assertThatThrownBy(() -> jdbc.update("update participacao set votos_usados = 3"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update(
                "insert into voto (votacao_id, opcao_id, quantidade) values (?, ?, 3)", id, opcaoId(v, 0)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ---------- 2. voto x encerrar ----------

    @Test
    void votoConcorrenteComEncerramentoNaoEhAceitoDepoisDoFim() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2));
        long id = v.get("id").asLong();
        long opcao = opcaoId(v, 0);

        CountDownLatch encerrouSemCommit = new CountDownLatch(1);
        CountDownLatch liberarCommit = new CountDownLatch(1);
        CompletableFuture<Void> encerramento = CompletableFuture.runAsync(() -> tx.executeWithoutResult(s -> {
            votacaoService.encerrar(d.id(), id);
            encerrouSemCommit.countDown();
            try {
                liberarCommit.await(20, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }));
        assertThat(encerrouSemCommit.await(20, TimeUnit.SECONDS)).isTrue();

        CompletableFuture<HttpStatus> voto = CompletableFuture.supplyAsync(() -> {
            try {
                votoService.votar(a.id(), id, new VotarRequest(List.of(new VotoItem(opcao, 1))));
                return HttpStatus.OK;
            } catch (ApiException e) {
                return e.getStatus();
            }
        });
        // Espera o voto terminar ou ficar bloqueado esperando lock no banco.
        long limite = System.currentTimeMillis() + 15_000;
        while (!voto.isDone() && System.currentTimeMillis() < limite) {
            Integer esperando = jdbc.queryForObject(
                    "select count(*) from pg_stat_activity where wait_event_type = 'Lock'", Integer.class);
            if (esperando != null && esperando > 0) {
                break;
            }
            Thread.sleep(20);
        }
        liberarCommit.countDown();
        encerramento.get(20, TimeUnit.SECONDS);

        assertThat(voto.get(20, TimeUnit.SECONDS)).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(jdbc.queryForObject("select count(*) from voto", Integer.class)).isZero();
    }

    // ---------- 3. CSRF de mesmo site ----------

    @Test
    void metodoNaoSeguroDeOutraOrigemEhRecusado() throws Exception {
        Sessao a = aluno("Aluno", "A1");
        executar(post("/api/auth/logout").header("Origin", "https://evil.example"), a)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("SEM_PERMISSAO"));
        executar(post("/api/auth/logout").header("Origin", "http://localhost:3001"), a)
                .andExpect(status().isForbidden());
        executar(post("/api/auth/logout").header("Sec-Fetch-Site", "same-site"), a)
                .andExpect(status().isForbidden());
        executar(post("/api/auth/logout").header("Sec-Fetch-Site", "cross-site"), a)
                .andExpect(status().isForbidden());
        executar(post("/api/auth/logout").header("Origin", "null"), a).andExpect(status().isForbidden());
    }

    @Test
    void uploadMultipartDeOutraOrigemEhRecusado() throws Exception {
        Sessao d = docente("Prof", "D1");
        byte[] png = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A };
        executar(multipart("/api/uploads").file(new MockMultipartFile("arquivo", "x.png", "image/png", png))
                .header("Origin", "https://sub.escola.edu.br").header("Sec-Fetch-Site", "same-site"), d)
                .andExpect(status().isForbidden());
    }

    @Test
    void mesmaOrigemSemCabecalhosEGetContinuamPassando() throws Exception {
        Sessao a = aluno("Aluno", "A1");
        executar(post("/api/auth/logout").header("Origin", "http://localhost:3000")
                .header("Sec-Fetch-Site", "same-origin"), a).andExpect(status().isNoContent());
        executar(post("/api/auth/logout").header("Sec-Fetch-Site", "none"), a).andExpect(status().isNoContent());
        executar(post("/api/auth/logout"), a).andExpect(status().isNoContent());
        executar(get("/api/auth/me").header("Origin", "https://evil.example")
                .header("Sec-Fetch-Site", "cross-site"), a).andExpect(status().isOk());
    }

    // ---------- 4. oráculo de anonimato ----------

    @Test
    void erroEmVotacaoAnonimaNaoRevelaEmQualOpcaoOAlunoVotou() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAnonimaSemRepeticao(d);
        long id = v.get("id").asLong();
        votar(a, id, opcaoId(v, 0), 1).andExpect(status().isOk());

        // Quantidade > 1 é verificada antes da guarda: a resposta não depende do que já foi votado.
        votar(a, id, opcaoId(v, 0), 1, opcaoId(v, 1), 2)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem").value("Esta votação permite no máximo 1 voto por opção."));
        votar(a, id, opcaoId(v, 0), 1)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem", not(containsString("Opção 1"))));
    }

    private JsonNode votacaoAnonimaSemRepeticao(Sessao d) throws Exception {
        return votacaoAberta(d, votacaoInput(4, false, true, "SEMPRE", List.of(), 4));
    }

    // ---------- 6. tamanho e nulos ----------

    @Test
    void elementoNuloEmOpcoesDa400() throws Exception {
        Sessao d = docente("Prof", "D1");
        Map<String, Object> in = votacaoInput(1, false, false, "SEMPRE", List.of(), 0);
        in.put("opcoes", Arrays.asList(Map.of("titulo", "A"), null));
        enviar(post("/api/votacoes"), d, in).andExpect(status().isBadRequest());
        Map<String, Object> in2 = votacaoInput(1, false, false, "SEMPRE", List.of(), 2);
        in2.put("turmaIds", Arrays.asList((Long) null));
        enviar(post("/api/votacoes"), d, in2).andExpect(status().isBadRequest());
    }

    @Test
    void listasTemLimiteDe50() throws Exception {
        Sessao d = docente("Prof", "D1");
        enviar(post("/api/votacoes"), d, votacaoInput(1, false, false, "SEMPRE", List.of(), 51))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.opcoes").exists());
        long t = criarTurma(d, "T");
        List<Long> turmas = new ArrayList<>(Collections.nCopies(51, t));
        enviar(post("/api/votacoes"), d, votacaoInput(1, false, false, "SEMPRE", turmas, 2))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.turmaIds").exists());

        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(100, true, false, "SEMPRE", List.of(), 2));
        Object[] pares = new Object[102];
        for (int i = 0; i < 102; i += 2) {
            pares[i] = opcaoId(v, 0);
            pares[i + 1] = 1;
        }
        votar(a, v.get("id").asLong(), pares)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.votos").exists());
        enviar(post("/api/votacoes/" + v.get("id").asLong() + "/votos"), a,
                Map.of("votos", Arrays.asList((Object) null))).andExpect(status().isBadRequest());
    }

    // ---------- 7. integridade opção x votação ----------

    @Test
    void bancoGaranteQueOpcaoDoVotoPertenceAVotacao() throws Exception {
        Sessao d = docente("Prof", "D1");
        JsonNode v1 = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2));
        JsonNode v2 = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2));
        assertThatThrownBy(() -> jdbc.update("insert into voto (votacao_id, opcao_id, quantidade) values (?, ?, 1)",
                v1.get("id").asLong(), opcaoId(v2, 0)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
