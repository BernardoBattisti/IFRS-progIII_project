package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.Test;

import br.edu.ifrs.votacoes.arquivo.TipoImagem;
import br.edu.ifrs.votacoes.dominio.DominioService;
import br.edu.ifrs.votacoes.seguranca.LimiteTentativas;
import br.edu.ifrs.votacoes.suporte.RelogioTeste;
import br.edu.ifrs.votacoes.turma.GeradorCodigo;
import br.edu.ifrs.votacoes.votacao.EstadoVotacao;

/** Testes de unidade das partes puras (sem Spring). */
class UnidadesTest {

    static final Instant INICIO = Instant.parse("2026-11-20T13:00:00Z");
    static final Instant FIM = Instant.parse("2026-11-21T13:00:00Z");

    @Test
    void estadoDerivadoDasDatas() {
        assertThat(EstadoVotacao.derivar(false, INICIO, FIM, INICIO)).isEqualTo(EstadoVotacao.RASCUNHO);
        assertThat(EstadoVotacao.derivar(true, INICIO, FIM, INICIO.minusMillis(1))).isEqualTo(EstadoVotacao.AGENDADA);
        assertThat(EstadoVotacao.derivar(true, INICIO, FIM, INICIO)).isEqualTo(EstadoVotacao.ABERTA);
        assertThat(EstadoVotacao.derivar(true, INICIO, FIM, FIM.minusMillis(1))).isEqualTo(EstadoVotacao.ABERTA);
        assertThat(EstadoVotacao.derivar(true, INICIO, FIM, FIM)).isEqualTo(EstadoVotacao.ENCERRADA);
    }

    @Test
    void codigoDeTurmaSemCaracteresAmbiguos() {
        GeradorCodigo g = new GeradorCodigo();
        Set<String> vistos = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            String c = g.gerar();
            assertThat(c).hasSize(8).doesNotContain("0", "O", "1", "I", "L").matches("[A-Z2-9]{8}");
            vistos.add(c);
        }
        assertThat(vistos).hasSizeGreaterThan(495);
    }

    @Test
    void detectaImagemPelosMagicBytes() {
        assertThat(TipoImagem.detectar(new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0 }))
                .contains(TipoImagem.JPEG);
        assertThat(TipoImagem.detectar(new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A }))
                .contains(TipoImagem.PNG);
        assertThat(TipoImagem.detectar("RIFF\0\0\0\0WEBPVP8 ".getBytes())).contains(TipoImagem.WEBP);
        assertThat(TipoImagem.detectar("RIFF\0\0\0\0WAVEfmt ".getBytes())).isEmpty();
        assertThat(TipoImagem.detectar("GIF89a".getBytes())).isEmpty();
        assertThat(TipoImagem.detectar(new byte[] { (byte) 0xFF })).isEmpty();
        assertThat(TipoImagem.detectar(new byte[0])).isEmpty();
    }

    @Test
    void normalizacaoDeDominio() {
        assertThat(DominioService.normalizar("  @IFRS.edu.BR ")).isEqualTo("ifrs.edu.br");
        assertThat(DominioService.normalizar("ifrs. edu.br")).isEqualTo("ifrs.edu.br");
        assertThat(DominioService.normalizar(null)).isEmpty();
        assertThat(DominioService.dominioDoEmail("Fulano@Aluno.IFRS.edu.br")).isEqualTo("aluno.ifrs.edu.br");
    }

    @Test
    void limiteDeTentativasPorChaveEJanela() {
        RelogioTeste relogio = new RelogioTeste(INICIO);
        LimiteTentativas limite = new LimiteTentativas(relogio);
        for (int i = 0; i < 10; i++) {
            assertThat(limite.permitir("login:a@x.com", 10)).isTrue();
        }
        assertThat(limite.permitir("login:a@x.com", 10)).isFalse();
        assertThat(limite.permitir("esqueci:a@x.com", 5)).isTrue();
        assertThat(limite.permitir("login:b@x.com", 10)).isTrue();
        relogio.avancar(java.time.Duration.ofSeconds(59));
        assertThat(limite.permitir("login:a@x.com", 10)).isFalse();
        relogio.avancar(java.time.Duration.ofSeconds(1));
        assertThat(limite.permitir("login:a@x.com", 10)).isTrue();
    }
}
