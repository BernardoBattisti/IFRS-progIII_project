package br.edu.ifrs.votacoes.seguranca;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import br.edu.ifrs.votacoes.suporte.RelogioTeste;

/** O mapa de janelas não cresce sem limite: janelas vencidas são expurgadas. */
class LimiteTentativasMemoriaTest {

    @Test
    void janelasVencidasSaoExpurgadas() {
        RelogioTeste relogio = new RelogioTeste(Instant.parse("2026-11-20T12:00:00Z"));
        LimiteTentativas limite = new LimiteTentativas(relogio);
        for (int i = 0; i <= LimiteTentativas.EXPURGAR_ACIMA_DE + 500; i++) {
            limite.permitir("login:u" + i + "@x.com", 10);
        }
        assertThat(limite.tamanho()).isGreaterThan(LimiteTentativas.EXPURGAR_ACIMA_DE);
        relogio.avancar(Duration.ofMinutes(1));
        limite.permitir("login:novo@x.com", 10);
        assertThat(limite.tamanho()).isEqualTo(1);
    }
}
