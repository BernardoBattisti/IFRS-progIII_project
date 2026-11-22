package br.edu.ifrs.votacoes.usuario;

/** Representação {@code Usuario} da API. */
public record UsuarioDto(
        Long id,
        String nome,
        String email,
        String matricula,
        Papel papel,
        StatusConta status) {

    public static UsuarioDto de(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNome(), u.getEmail(), u.getMatricula(),
                u.getPapel(), u.getStatus());
    }
}
