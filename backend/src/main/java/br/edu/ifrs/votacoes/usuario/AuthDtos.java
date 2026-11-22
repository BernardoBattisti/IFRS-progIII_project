package br.edu.ifrs.votacoes.usuario;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Corpos das rotas de /api/auth (seção 5.1). */
public final class AuthDtos {

    static final String MSG_SENHA = "deve ter entre 8 e 72 caracteres";

    private AuthDtos() {
    }

    public record CadastroRequest(
            @NotBlank(message = "obrigatório") @Size(max = 200, message = "deve ter no máximo 200 caracteres") String nome,
            @NotBlank(message = "obrigatório") @Email(message = "e-mail inválido") @Size(max = 320, message = "deve ter no máximo 320 caracteres") String email,
            @NotNull(message = "obrigatório") @Size(min = 8, max = 72, message = MSG_SENHA) String senha,
            @NotBlank(message = "obrigatório") @Size(max = 30, message = "deve ter no máximo 30 caracteres") String matricula,
            @NotNull(message = "obrigatório") Papel papel) {
    }

    public record LoginRequest(
            @NotBlank(message = "obrigatório") @Size(max = 320, message = "deve ter no máximo 320 caracteres") String email,
            @NotNull(message = "obrigatório") @Size(max = 200, message = "deve ter no máximo 200 caracteres") String senha) {
    }

    public record TrocaSenhaRequest(
            @NotNull(message = "obrigatório") @Size(max = 200, message = "deve ter no máximo 200 caracteres") String senhaAtual,
            @NotNull(message = "obrigatório") @Size(min = 8, max = 72, message = MSG_SENHA) String novaSenha) {
    }

    public record EsqueciSenhaRequest(
            @NotBlank(message = "obrigatório") @Size(max = 320, message = "deve ter no máximo 320 caracteres") String email) {
    }

    public record RedefinirSenhaRequest(
            @NotBlank(message = "obrigatório") @Size(max = 200, message = "inválido") String token,
            @NotNull(message = "obrigatório") @Size(min = 8, max = 72, message = MSG_SENHA) String novaSenha) {
    }
}
