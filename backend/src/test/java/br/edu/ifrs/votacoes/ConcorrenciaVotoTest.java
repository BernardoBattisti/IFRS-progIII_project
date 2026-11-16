package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.databind.JsonNode;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.suporte.TesteIntegracao;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotarRequest;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotoItem;
import br.edu.ifrs.votacoes.votacao.VotoService;

/**
 * Envios simultâneos do mesmo aluno não podem ultrapassar N: o lock pessimista na linha de
 * participação serializa as transações.
 */
class ConcorrenciaVotoTest extends TesteIntegracao {

    @Autowired
    VotoService votoService;

    @Test
    void enviosConcorrentesNaoUltrapassamN() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(5, true, false, "SEMPRE", List.of(), 2));
        long votacaoId = v.get("id").asLong();
        long opcao = opcaoId(v, 0);

        int threads = 16;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch largada = new CountDownLatch(1);
        AtomicInteger aceitos = new AtomicInteger();
        AtomicInteger recusados = new AtomicInteger();
        List<Future<?>> futuros = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            futuros.add(pool.submit(() -> {
                largada.await();
                try {
                    votoService.votar(a.id(), votacaoId, new VotarRequest(List.of(new VotoItem(opcao, 1))));
                    aceitos.incrementAndGet();
                } catch (ApiException e) {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                    recusados.incrementAndGet();
                }
                return null;
            }));
        }
        largada.countDown();
        for (Future<?> f : futuros) {
            f.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertThat(aceitos.get()).isEqualTo(5);
        assertThat(recusados.get()).isEqualTo(threads - 5);
        assertThat(jdbc.queryForObject("select sum(quantidade) from voto", Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForObject("select votos_usados from participacao", Integer.class)).isEqualTo(5);
    }

    @Test
    void enviosConcorrentesNaMesmaOpcaoSemRepeticaoAnonima() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(2, false, true, "SEMPRE", List.of(), 2));
        long votacaoId = v.get("id").asLong();
        long opcao = opcaoId(v, 0);

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch largada = new CountDownLatch(1);
        AtomicInteger aceitos = new AtomicInteger();
        List<Future<?>> futuros = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            futuros.add(pool.submit(() -> {
                largada.await();
                try {
                    votoService.votar(a.id(), votacaoId, new VotarRequest(List.of(new VotoItem(opcao, 1))));
                    aceitos.incrementAndGet();
                } catch (ApiException e) {
                    // esperado para todos menos um
                }
                return null;
            }));
        }
        largada.countDown();
        for (Future<?> f : futuros) {
            f.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertThat(aceitos.get()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from voto", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select votos_usados from participacao", Integer.class)).isEqualTo(1);
    }
}
