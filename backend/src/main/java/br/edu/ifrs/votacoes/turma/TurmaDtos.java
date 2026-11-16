package br.edu.ifrs.votacoes.turma;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class TurmaDtos {

    private TurmaDtos() {
    }

    public record TurmaInput(
            @NotBlank(message = "obrigatório") @Size(max = 150, message = "deve ter no máximo 150 caracteres") String nome,
            @Size(max = 1000, message = "deve ter no máximo 1000 caracteres") String descricao) {
    }

    public record EntrarRequest(@NotBlank(message = "obrigatório") String codigo) {
    }

    /** {@code codigo} é null quando quem consulta é aluno. */
    public record TurmaDto(Long id, String nome, String descricao, String codigo, String docenteNome,
            long totalAlunos) {
    }

    public record AlunoDto(Long id, String nome, String matricula, String email) {
    }
}
