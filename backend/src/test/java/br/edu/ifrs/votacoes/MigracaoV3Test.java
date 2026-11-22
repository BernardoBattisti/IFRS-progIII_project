package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import br.edu.ifrs.votacoes.suporte.BancoEmbutido;

/** A migration V3 sobre dados da época do login Google (banco próprio, sem Spring). */
class MigracaoV3Test {

    @Test
    void v3PreservaContasERemoveSoCadastrosIncompletosSemVinculo() {
        String banco = "migracao_v3_" + System.nanoTime();
        new JdbcTemplate(BancoEmbutido.obter().getPostgresDatabase()).execute("CREATE DATABASE " + banco);
        DataSource ds = BancoEmbutido.obter().getDatabase("postgres", banco);
        JdbcTemplate jdbc = new JdbcTemplate(ds);

        Flyway.configure().dataSource(ds).target("2").load().migrate();
        jdbc.update("insert into usuario (email, nome, foto_url, google_sub, matricula, papel, status) values "
                + "('aluno@escola.edu.br', 'Aluno', 'http://foto', 'sub-1', 'A1', 'ALUNO', 'ATIVO'), "
                + "('prof@escola.edu.br', 'Prof', null, 'sub-2', 'D1', 'DOCENTE', 'PENDENTE_APROVACAO'), "
                + "('incompleto@escola.edu.br', 'Incompleto', null, 'sub-3', null, null, 'CADASTRO_INCOMPLETO'), "
                + "('velho-admin@escola.edu.br', 'Admin antigo', null, 'sub-4', null, 'ADMIN', 'ATIVO')");

        Flyway.configure().dataSource(ds).load().migrate();

        List<Map<String, Object>> linhas = jdbc.queryForList("select email, status, senha_hash from usuario order by email");
        assertThat(linhas).extracting(l -> l.get("email"))
                .containsExactly("aluno@escola.edu.br", "prof@escola.edu.br", "velho-admin@escola.edu.br");
        assertThat(linhas).allSatisfy(l -> assertThat(l.get("senha_hash")).isNull());
        assertThat(jdbc.queryForObject("select count(*) from information_schema.columns where table_name = 'usuario' "
                + "and column_name in ('google_sub', 'foto_url')", Integer.class)).isZero();
        // O status antigo não é mais aceito pelo banco.
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(
                "update usuario set status = 'CADASTRO_INCOMPLETO' where email = 'aluno@escola.edu.br'"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("select count(*) from dominio_aceito", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from token_redefinicao_senha", Integer.class)).isZero();
    }
}
