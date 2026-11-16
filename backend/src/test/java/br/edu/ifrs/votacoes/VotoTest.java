package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

class VotoTest extends TesteIntegracao {

    @Test
    void alunoGastaVotosAosPoucosAteN() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(3, true, false, "SEMPRE", List.of(), 2));
        long id = v.get("id").asLong();
        long o1 = opcaoId(v, 0);
        long o2 = opcaoId(v, 1);

        executar(get("/api/votacoes/" + id), a)
                .andExpect(jsonPath("$.votosUsados").value(0))
                .andExpect(jsonPath("$.votosRestantes").value(3))
                .andExpect(jsonPath("$.meusVotos", hasSize(0)));

        votar(a, id, o1, 2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.votosUsados").value(2))
                .andExpect(jsonPath("$.votosRestantes").value(1))
                .andExpect(jsonPath("$.meusVotos[0].opcaoId").value(o1))
                .andExpect(jsonPath("$.meusVotos[0].quantidade").value(2));

        votar(a, id, o2, 2)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.erro").value("REGRA_NEGOCIO"))
                .andExpect(jsonPath("$.mensagem").value("Você só tem 1 voto restante."));

        votar(a, id, o1, 1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.votosRestantes").value(0))
                .andExpect(jsonPath("$.meusVotos[0].quantidade").value(3));

        votar(a, id, o2, 1).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("select coalesce(sum(quantidade),0) from voto", Integer.class)).isEqualTo(3);
    }

    @Test
    void envioQueExcedeEhRejeitadoPorInteiro() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(2, true, false, "SEMPRE", List.of(), 2));
        long id = v.get("id").asLong();
        votar(a, id, opcaoId(v, 0), 1, opcaoId(v, 1), 2).andExpect(status().isUnprocessableEntity());
        assertThat(jdbc.queryForObject("select count(*) from voto", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from participacao where votos_usados > 0", Integer.class)).isZero();
        executar(get("/api/votacoes/" + id), a).andExpect(jsonPath("$.votosUsados").value(0));
    }

    @Test
    void semRepeticaoNoMaximoUmVotoPorOpcaoConsiderandoEnviosAnteriores() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(3, false, false, "SEMPRE", List.of(), 3));
        long id = v.get("id").asLong();
        long o1 = opcaoId(v, 0);
        long o2 = opcaoId(v, 1);

        votar(a, id, o1, 2).andExpect(status().isUnprocessableEntity());
        votar(a, id, o1, 1, o1, 1).andExpect(status().isUnprocessableEntity()); // mesma opção duas vezes no envio
        votar(a, id, o1, 1).andExpect(status().isOk());
        votar(a, id, o1, 1)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("Opção 1")));
        votar(a, id, o2, 1, o1, 1).andExpect(status().isUnprocessableEntity()); // rejeitado por inteiro
        votar(a, id, o2, 1).andExpect(status().isOk()).andExpect(jsonPath("$.votosUsados").value(2));
    }

    @Test
    void comRepeticaoPodeConcentrarVotos() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(5, true, false, "SEMPRE", List.of(), 2));
        votar(a, v.get("id").asLong(), opcaoId(v, 0), 5).andExpect(status().isOk())
                .andExpect(jsonPath("$.votosRestantes").value(0));
    }

    @Test
    void soVotaDentroDaJanela() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2));
        long id = v.get("id").asLong();
        long o1 = opcaoId(v, 0);

        executar(post("/api/votacoes/" + id + "/publicar"), d);
        relogio.definir(T0.plus(Duration.ofMinutes(59)));
        votar(a, id, o1, 1)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem").value("A votação ainda não começou."));

        relogio.definir(T0.plus(Duration.ofHours(1))); // inicio ≤ agora
        votar(a, id, o1, 1).andExpect(status().isOk());

        Sessao b = aluno("Outro", "A2");
        relogio.definir(T0.plus(Duration.ofDays(1))); // agora = fim → encerrada
        votar(b, id, o1, 1)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem").value("A votação já foi encerrada."));
    }

    @Test
    void naoVotaEmRascunho() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        Map<String, Object> in = votacaoInput(1, false, false, "SEMPRE", List.of(), 2);
        in.put("inicio", T0.minus(Duration.ofHours(1)).toString());
        JsonNode v = criarVotacao(d, in);
        votar(a, v.get("id").asLong(), opcaoId(v, 0), 1).andExpect(status().isNotFound());
    }

    @Test
    void elegibilidadePorTurma() throws Exception {
        Sessao d = docente("Prof", "D1");
        long t1 = criarTurma(d, "T1");
        long t2 = criarTurma(d, "T2");
        Sessao membro = aluno("Membro", "A1");
        Sessao membroT2 = aluno("Membro Dois", "A2");
        Sessao fora = aluno("Fora", "A3");
        entrarNaTurma(membro, codigoDaTurma(d, t1));
        entrarNaTurma(membroT2, codigoDaTurma(d, t2));

        JsonNode v = votacaoAberta(d, votacaoInput(1, false, false, "SEMPRE", List.of(t1, t2), 2));
        long id = v.get("id").asLong();

        votar(membro, id, opcaoId(v, 0), 1).andExpect(status().isOk());
        votar(membroT2, id, opcaoId(v, 0), 1).andExpect(status().isOk());
        votar(fora, id, opcaoId(v, 0), 1).andExpect(status().isForbidden());
        executar(get("/api/votacoes/" + id), fora).andExpect(status().isForbidden());
        executar(get("/api/votacoes"), fora).andExpect(jsonPath("$", hasSize(0)));
        executar(get("/api/votacoes"), membro).andExpect(jsonPath("$", hasSize(1)));

        // Removido da turma, deixa de ser elegível.
        executar(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .delete("/api/turmas/" + t2 + "/alunos/" + membroT2.id()), d).andExpect(status().isNoContent());
        executar(get("/api/votacoes/" + id), membroT2).andExpect(status().isForbidden());
    }

    @Test
    void semTurmasTodosOsAlunosAtivosSaoElegiveis() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Qualquer", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2));
        votar(a, v.get("id").asLong(), opcaoId(v, 1), 1).andExpect(status().isOk());

        Sessao incompleto = login("incompleto@escola.edu.br", "Sem cadastro");
        votar(incompleto, v.get("id").asLong(), opcaoId(v, 1), 1).andExpect(status().isForbidden());
    }

    @Test
    void docenteNaoVota() throws Exception {
        Sessao d = docente("Prof", "D1");
        JsonNode v = votacaoAberta(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2));
        votar(d, v.get("id").asLong(), opcaoId(v, 0), 1).andExpect(status().isForbidden());
    }

    @Test
    void opcaoDeOutraVotacaoEQuantidadeInvalida() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v1 = votacaoAberta(d, votacaoInput(2, true, false, "SEMPRE", List.of(), 2));
        JsonNode v2 = criarVotacao(d, votacaoInput(1, true, false, "SEMPRE", List.of(), 2));
        long id = v1.get("id").asLong();
        votar(a, id, opcaoId(v2, 0), 1).andExpect(status().isUnprocessableEntity());
        votar(a, id, opcaoId(v1, 0), 0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos['votos[0].quantidade']").exists());
        enviar(post("/api/votacoes/" + id + "/votos"), a, Map.of("votos", List.of()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void votoNaoAnonimoGuardaAlunoEDataEMeusVotosAparecem() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(2, false, false, "SEMPRE", List.of(), 2));
        votar(a, v.get("id").asLong(), opcaoId(v, 1), 1).andExpect(status().isOk());
        var linha = jdbc.queryForMap("select aluno_id, registrado_em from voto");
        assertThat(linha.get("aluno_id")).isEqualTo(a.id());
        assertThat(linha.get("registrado_em")).isNotNull();
        executar(get("/api/votacoes/" + v.get("id").asLong()), a)
                .andExpect(jsonPath("$.meusVotos[0].opcaoId").value(opcaoId(v, 1)));
        executar(get("/api/votacoes/" + v.get("id").asLong()), d)
                .andExpect(jsonPath("$.meusVotos").value(nullValue()));
    }
}
