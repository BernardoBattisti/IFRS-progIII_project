package br.edu.ifrs.votacoes.erro;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Formato de erro da API: {@code { status, erro, mensagem, campos? }}. */
public record ErroResposta(
        int status,
        String erro,
        String mensagem,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) Map<String, String> campos) {
}
