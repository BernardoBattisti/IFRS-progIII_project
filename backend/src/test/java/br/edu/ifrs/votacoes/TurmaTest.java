package br.edu.ifrs.votacoes;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

class TurmaTest extends TesteIntegracao {

    @Test
    void docenteCriaTurmaComCodigoDe8CaracteresSemAmbiguos() throws Exception {
        Sessao d = docente("Prof Ana", "D1");
        enviar(post("/api/turmas"), d, Map.of("nome", "INF-3A", "descricao", "Terceiro ano"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("INF-3A"))
                .andExpect(jsonPath("$.codigo").value(matchesPattern("^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$")))
                .andExpect(jsonPath("$.docenteNome").value("Prof Ana"))
                .andExpect(jsonPath("$.totalAlunos").value(0));
    }

    @Test
    void nomeEObrigatorio() throws Exception {
        Sessao d = docente("Prof", "D1");
        enviar(post("/api/turmas"), d, Map.of("descricao", "x"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").value("obrigatório"));
    }

    @Test
    void alunoEntraPorCodigoEVeTurmaSemCodigo() throws Exception {
        Sessao d = docente("Prof", "D1");
        long t = criarTurma(d, "Turma A");
        String codigo = codigoDaTurma(d, t);
        Sessao a = aluno("Aluno", "A1");

        enviar(post("/api/turmas/entrar"), a, Map.of("codigo", " " + codigo.toLowerCase() + " "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(t))
                .andExpect(jsonPath("$.codigo").value(nullValue()))
                .andExpect(jsonPath("$.totalAlunos").value(1));
        executar(get("/api/turmas"), a)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].codigo").value(nullValue()));

        // já é membro
        enviar(post("/api/turmas/entrar"), a, Map.of("codigo", codigo)).andExpect(status().isConflict());
        // código inválido
        enviar(post("/api/turmas/entrar"), a, Map.of("codigo", "ZZZZZZZZ")).andExpect(status().isNotFound());
    }

    @Test
    void docenteNaoEntraEmTurmaEAlunoNaoCriaTurma() throws Exception {
        Sessao d = docente("Prof", "D1");
        long t = criarTurma(d, "Turma A");
        Sessao a = aluno("Aluno", "A1");
        enviar(post("/api/turmas/entrar"), d, Map.of("codigo", codigoDaTurma(d, t))).andExpect(status().isForbidden());
        enviar(post("/api/turmas"), a, Map.of("nome", "X")).andExpect(status().isForbidden());
    }

    @Test
    void docenteListaERemoveAlunos() throws Exception {
        Sessao d = docente("Prof", "D1");
        long t = criarTurma(d, "Turma A");
        Sessao a = aluno("Bruno", "A1");
        Sessao b = aluno("Ana", "A2");
        entrarNaTurma(a, codigoDaTurma(d, t));
        entrarNaTurma(b, codigoDaTurma(d, t));

        executar(get("/api/turmas/" + t + "/alunos"), d)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].nome").value("Ana"))
                .andExpect(jsonPath("$[0].matricula").value("A2"))
                .andExpect(jsonPath("$[0].email").value("ana@escola.edu.br"));

        executar(delete("/api/turmas/" + t + "/alunos/" + a.id()), d).andExpect(status().isNoContent());
        executar(get("/api/turmas/" + t + "/alunos"), d).andExpect(jsonPath("$", hasSize(1)));
        executar(delete("/api/turmas/" + t + "/alunos/" + a.id()), d).andExpect(status().isNotFound());
    }

    @Test
    void outroDocenteNaoGerenciaTurmaAlheia() throws Exception {
        Sessao d1 = docente("Prof Um", "D1");
        Sessao d2 = docente("Prof Dois", "D2");
        long t = criarTurma(d1, "Turma A");
        executar(get("/api/turmas/" + t + "/alunos"), d2).andExpect(status().isForbidden());
        enviar(put("/api/turmas/" + t), d2, Map.of("nome", "Hack")).andExpect(status().isForbidden());
        executar(delete("/api/turmas/" + t), d2).andExpect(status().isForbidden());
        executar(post("/api/turmas/" + t + "/codigo"), d2).andExpect(status().isForbidden());
        executar(get("/api/turmas"), d2).andExpect(jsonPath("$", hasSize(0)));
        executar(get("/api/turmas/999/alunos"), d1).andExpect(status().isNotFound());
    }

    @Test
    void editarERegenerarCodigo() throws Exception {
        Sessao d = docente("Prof", "D1");
        long t = criarTurma(d, "Turma A");
        String antigo = codigoDaTurma(d, t);
        enviar(put("/api/turmas/" + t), d, Map.of("nome", "Turma B"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Turma B"))
                .andExpect(jsonPath("$.descricao").value(nullValue()));
        String novo = corpo(executar(post("/api/turmas/" + t + "/codigo"), d).andExpect(status().isOk()))
                .get("codigo").asText();
        assertThat(novo).isNotEqualTo(antigo).hasSize(8);
        Sessao a = aluno("Aluno", "A1");
        enviar(post("/api/turmas/entrar"), a, Map.of("codigo", antigo)).andExpect(status().isNotFound());
        enviar(post("/api/turmas/entrar"), a, Map.of("codigo", novo)).andExpect(status().isOk());
    }

    @Test
    void turmaVinculadaAVotacaoNaoPodeSerExcluida() throws Exception {
        Sessao d = docente("Prof", "D1");
        long vinculada = criarTurma(d, "Vinculada");
        long livre = criarTurma(d, "Livre");
        criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(vinculada), 2));

        executar(delete("/api/turmas/" + vinculada), d)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("CONFLITO"));
        executar(delete("/api/turmas/" + livre), d).andExpect(status().isNoContent());
        executar(get("/api/turmas"), d).andExpect(jsonPath("$", hasSize(1)));
    }
}
