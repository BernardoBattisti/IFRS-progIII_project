package br.edu.ifrs.votacoes.suporte;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** Relógio controlável pelos testes. */
public class RelogioTeste extends Clock {

    private volatile Instant agora;

    public RelogioTeste(Instant agora) {
        this.agora = agora;
    }

    public void definir(Instant instante) {
        this.agora = instante;
    }

    public void avancar(Duration d) {
        this.agora = agora.plus(d);
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }

    @Override
    public Instant instant() {
        return agora;
    }
}
