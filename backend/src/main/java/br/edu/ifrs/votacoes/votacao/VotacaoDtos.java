package br.edu.ifrs.votacoes.votacao;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class VotacaoDtos {

    private VotacaoDtos() {
    }

    /** Padrão das URLs devolvidas por POST /api/uploads. */
    public static final String PADRAO_IMAGEM_URL =
            "^/api/arquivos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$";

    public record OpcaoInput(
            @NotBlank(message = "obrigatório") @Size(max = 200, message = "deve ter no máximo 200 caracteres") String titulo,
            @Size(max = 2000, message = "deve ter no máximo 2000 caracteres") String descricao,
            @Pattern(regexp = PADRAO_IMAGEM_URL, message = "deve ser uma imagem enviada por /api/uploads") String imagemUrl) {
    }

    public record VotacaoInput(
            @NotBlank(message = "obrigatório") @Size(max = 200, message = "deve ter no máximo 200 caracteres") String titulo,
            @Size(max = 4000, message = "deve ter no máximo 4000 caracteres") String descricao,
            @NotNull(message = "obrigatório") Instant inicio,
            @NotNull(message = "obrigatório") Instant fim,
            @NotNull(message = "obrigatório") @Min(value = 1, message = "deve ser no mínimo 1") Integer votosPorAluno,
            @NotNull(message = "obrigatório") Boolean permiteRepetirOpcao,
            @NotNull(message = "obrigatório") Boolean anonima,
            @NotNull(message = "obrigatório") VisibilidadeResultado visibilidadeResultado,
            List<Long> turmaIds,
            List<@Valid OpcaoInput> opcoes) {
    }

    public record ProrrogarRequest(@NotNull(message = "obrigatório") Instant fim) {
    }

    public record VotoItem(
            @NotNull(message = "obrigatório") Long opcaoId,
            @NotNull(message = "obrigatório") @Min(value = 1, message = "deve ser no mínimo 1") Integer quantidade) {
    }

    public record VotarRequest(@NotEmpty(message = "informe ao menos um voto") List<@Valid @NotNull VotoItem> votos) {
    }

    public record DocenteResumo(Long id, String nome) {
    }

    public record TurmaResumo(Long id, String nome) {
    }

    public record OpcaoDto(Long id, String titulo, String descricao, String imagemUrl, int ordem) {
    }

    public record MeuVoto(Long opcaoId, int quantidade) {
    }

    public record VotacaoDto(
            Long id, String titulo, String descricao, Instant inicio, Instant fim,
            int votosPorAluno, boolean permiteRepetirOpcao, boolean anonima,
            VisibilidadeResultado visibilidadeResultado, EstadoVotacao estado,
            DocenteResumo docente, List<TurmaResumo> turmas, List<OpcaoDto> opcoes,
            boolean podeVerResultado,
            Integer votosUsados, Integer votosRestantes, List<MeuVoto> meusVotos) {
    }

    public record Votante(String nome, String matricula, int quantidade) {
    }

    public record ResultadoOpcao(Long opcaoId, String titulo, long votos, double percentual, List<Votante> votantes) {
    }

    public record Resultado(long totalVotos, long totalParticipantes, List<ResultadoOpcao> opcoes) {
    }
}
