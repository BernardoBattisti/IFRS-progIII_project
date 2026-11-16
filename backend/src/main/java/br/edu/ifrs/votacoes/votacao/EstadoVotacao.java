package br.edu.ifrs.votacoes.votacao;

import java.time.Instant;

/** Estado derivado de publicação + datas + relógio (nunca é gravado no banco). */
public enum EstadoVotacao {
    RASCUNHO, AGENDADA, ABERTA, ENCERRADA;

    public static EstadoVotacao derivar(boolean publicada, Instant inicio, Instant fim, Instant agora) {
        if (!publicada) {
            return RASCUNHO;
        }
        if (agora.isBefore(inicio)) {
            return AGENDADA;
        }
        if (agora.isBefore(fim)) {
            return ABERTA;
        }
        return ENCERRADA;
    }
}
