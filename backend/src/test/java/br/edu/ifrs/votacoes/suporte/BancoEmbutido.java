package br.edu.ifrs.votacoes.suporte;

import java.io.IOException;
import java.io.UncheckedIOException;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;

/** Um único PostgreSQL 16 embutido (binários do zonky) por JVM de testes; dispensa Docker. */
public final class BancoEmbutido {

    private static EmbeddedPostgres instancia;

    private BancoEmbutido() {
    }

    public static synchronized EmbeddedPostgres obter() {
        if (instancia == null) {
            try {
                instancia = EmbeddedPostgres.builder().start();
            } catch (IOException e) {
                throw new UncheckedIOException("Falha ao iniciar o PostgreSQL embutido", e);
            }
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    instancia.close();
                } catch (IOException ignorada) {
                    // encerrando a JVM
                }
            }));
        }
        return instancia;
    }

    public static String jdbcUrl() {
        return obter().getJdbcUrl("postgres", "postgres");
    }
}
