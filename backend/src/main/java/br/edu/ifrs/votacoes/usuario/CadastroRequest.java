package br.edu.ifrs.votacoes.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CadastroRequest(
        @NotNull(message = "obrigatório") Papel papel,
        @NotBlank(message = "obrigatório") @Size(max = 30, message = "deve ter no máximo 30 caracteres") String matricula) {
}
