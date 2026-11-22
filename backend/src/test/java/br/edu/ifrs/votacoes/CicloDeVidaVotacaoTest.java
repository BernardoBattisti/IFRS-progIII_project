package br.edu.ifrs.votacoes;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

class CicloDeVidaVotacaoTest extends TesteIntegracao {

    @Test
    void criaRascunhoComTodosOsCamposDoContrato() throws Exception {
        Sessao d = docente("Prof", "D1");
        long t = criarTurma(d, "Turma A");
        enviar(post("/api/votacoes"), d, votacaoInput(2, false, true, "APOS_ENCERRAR", List.of(t), 3))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("RASCUNHO"))
                .andExpect(jsonPath("$.titulo").value("Representante de turma"))
                .andExpect(jsonPath("$.inicio").value("2026-11-20T13:00:00Z"))
                .andExpect(jsonPath("$.fim").value("2026-11-21T12:00:00Z"))
                .andExpect(jsonPath("$.votosPorAluno").value(2))
                .andExpect(jsonPath("$.permiteRepetirOpcao").value(false))
                .andExpect(jsonPath("$.anonima").value(true))
                .andExpect(jsonPath("$.visibilidadeResultado").value("APOS_ENCERRAR"))
                .andExpect(jsonPath("$.docente.nome").value("Prof"))
                .andExpect(jsonPath("$.turmas[0].id").value(t))
                .andExpect(jsonPath("$.turmas[0].nome").value("Turma A"))
                .andExpect(jsonPath("$.opcoes", hasSize(3)))
                .andExpect(jsonPath("$.opcoes[0].ordem").value(1))
                .andExpect(jsonPath("$.opcoes[0].imagemUrl").value(nullValue()))
                .andExpect(jsonPath("$.podeVerResultado").value(false))
                .andExpect(jsonPath("$.votosUsados").value(nullValue()))
                .andExpect(jsonPath("$.votosRestantes").value(nullValue()))
                .andExpect(jsonPath("$.meusVotos").value(nullValue()));
    }

    @Test
    void rascunhoAceitaDadosIncompletosMasTituloEObrigatorio() throws Exception {
        Sessao d = docente("Prof", "D1");
        Map<String, Object> in = votacaoInput(5, false, false, "SEMPRE", List.of(), 1);
        in.put("inicio", T0.minus(Duration.ofDays(3)).toString());
        in.put("fim", T0.minus(Duration.ofDays(2)).toString());
        // 1 opção, fim no passado e N > opções: aceito como rascunho
        criarVotacao(d, in);

        in.put("titulo", " ");
        enviar(post("/api/votacoes"), d, in)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("VALIDACAO"))
                .andExpect(jsonPath("$.campos.titulo").value("obrigatório"));
    }

    @Test
    void fimDeveSerPosteriorAoInicio() throws Exception {
        Sessao d = docente("Prof", "D1");
        Map<String, Object> in = votacaoInput(1, false, false, "SEMPRE", List.of(), 2);
        in.put("fim", in.get("inicio"));
        enviar(post("/api/votacoes"), d, in)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.fim").exists());
    }

    @Test
    void votosPorAlunoDeveSerAoMenosUm() throws Exception {
        Sessao d = docente("Prof", "D1");
        enviar(post("/api/votacoes"), d, votacaoInput(0, false, false, "SEMPRE", List.of(), 2))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.votosPorAluno").exists());
    }

    @Test
    void turmaDeOutroDocenteNaoPodeSerUsada() throws Exception {
        Sessao d1 = docente("Prof Um", "D1");
        Sessao d2 = docente("Prof Dois", "D2");
        long alheia = criarTurma(d2, "Alheia");
        enviar(post("/api/votacoes"), d1, votacaoInput(1, false, false, "SEMPRE", List.of(alheia), 2))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void publicarValidaTudo() throws Exception {
        Sessao d = docente("Prof", "D1");
        long poucas = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 1)).get("id").asLong();
        executar(post("/api/votacoes/" + poucas + "/publicar"), d)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.erro").value("REGRA_NEGOCIO"))
                .andExpect(jsonPath("$.mensagem", containsString("2 opções")));

        Map<String, Object> passado = votacaoInput(1, false, false, "SEMPRE", List.of(), 2);
        passado.put("inicio", T0.minus(Duration.ofDays(2)).toString());
        passado.put("fim", T0.minus(Duration.ofDays(1)).toString());
        long p = criarVotacao(d, passado).get("id").asLong();
        executar(post("/api/votacoes/" + p + "/publicar"), d)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensagem", containsString("futuro")));

        long excede = criarVotacao(d, votacaoInput(3, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        executar(post("/api/votacoes/" + excede + "/publicar"), d).andExpect(status().isUnprocessableEntity());

        // Com repetição permitida, N pode exceder o número de opções.
        long repete = criarVotacao(d, votacaoInput(3, true, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        executar(post("/api/votacoes/" + repete + "/publicar"), d).andExpect(status().isOk());
    }

    @Test
    void publicarAntesDoInicioAgendaEDepoisAbre() throws Exception {
        Sessao d = docente("Prof", "D1");
        long id = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        executar(post("/api/votacoes/" + id + "/publicar"), d)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("AGENDADA"));

        relogio.avancar(Duration.ofHours(1)); // inicio
        executar(get("/api/votacoes/" + id), d).andExpect(jsonPath("$.estado").value("ABERTA"));
        relogio.avancar(Duration.ofHours(23)); // fim
        executar(get("/api/votacoes/" + id), d).andExpect(jsonPath("$.estado").value("ENCERRADA"));
    }

    @Test
    void publicarComInicioNoPassadoAbreImediatamente() throws Exception {
        Sessao d = docente("Prof", "D1");
        Map<String, Object> in = votacaoInput(1, false, false, "SEMPRE", List.of(), 2);
        in.put("inicio", T0.minus(Duration.ofHours(1)).toString());
        long id = criarVotacao(d, in).get("id").asLong();
        executar(post("/api/votacoes/" + id + "/publicar"), d).andExpect(jsonPath("$.estado").value("ABERTA"));
    }

    @Test
    void despublicarSoQuandoAgendada() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        long id = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        executar(post("/api/votacoes/" + id + "/despublicar"), d).andExpect(status().isUnprocessableEntity());
        executar(post("/api/votacoes/" + id + "/publicar"), d);
        executar(get("/api/votacoes/" + id), a).andExpect(jsonPath("$.estado").value("AGENDADA"));

        executar(post("/api/votacoes/" + id + "/despublicar"), d)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("RASCUNHO"));
        // Rascunho é invisível ao aluno.
        executar(get("/api/votacoes/" + id), a).andExpect(status().isNotFound());
        executar(get("/api/votacoes"), a).andExpect(jsonPath("$", hasSize(0)));

        executar(post("/api/votacoes/" + id + "/publicar"), d);
        relogio.avancar(Duration.ofHours(2));
        executar(post("/api/votacoes/" + id + "/despublicar"), d).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void rascunhoEditavelEExcluivelDepoisTravado() throws Exception {
        Sessao d = docente("Prof", "D1");
        long id = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        Map<String, Object> novo = votacaoInput(2, false, false, "NUNCA", List.of(), 4);
        novo.put("titulo", "Novo título");
        enviar(put("/api/votacoes/" + id), d, novo)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titulo").value("Novo título"))
                .andExpect(jsonPath("$.opcoes", hasSize(4)))
                .andExpect(jsonPath("$.visibilidadeResultado").value("NUNCA"));

        executar(post("/api/votacoes/" + id + "/publicar"), d).andExpect(status().isOk());
        // AGENDADA: não editável nem excluível (precisa despublicar).
        enviar(put("/api/votacoes/" + id), d, novo).andExpect(status().isUnprocessableEntity());
        executar(delete("/api/votacoes/" + id), d).andExpect(status().isUnprocessableEntity());

        relogio.avancar(Duration.ofHours(2)); // ABERTA: regras travadas
        enviar(put("/api/votacoes/" + id), d, novo).andExpect(status().isUnprocessableEntity());
        executar(delete("/api/votacoes/" + id), d).andExpect(status().isUnprocessableEntity());

        long outro = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        executar(delete("/api/votacoes/" + outro), d).andExpect(status().isNoContent());
        executar(get("/api/votacoes/" + outro), d).andExpect(status().isNotFound());
    }

    @Test
    void encerrarAntecipadamente() throws Exception {
        Sessao d = docente("Prof", "D1");
        JsonNode v = votacaoAberta(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2));
        long id = v.get("id").asLong();
        relogio.avancar(Duration.ofMinutes(30));
        executar(post("/api/votacoes/" + id + "/encerrar"), d)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ENCERRADA"))
                .andExpect(jsonPath("$.fim").value("2026-11-20T13:30:00Z"));
        // ENCERRADA é imutável
        executar(post("/api/votacoes/" + id + "/encerrar"), d).andExpect(status().isUnprocessableEntity());
        enviar(post("/api/votacoes/" + id + "/prorrogar"), d, Map.of("fim", "2026-12-01T00:00:00Z"))
                .andExpect(status().isUnprocessableEntity());
        executar(post("/api/votacoes/" + id + "/publicar"), d).andExpect(status().isUnprocessableEntity());
        executar(delete("/api/votacoes/" + id), d).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void encerrarSoQuandoAberta() throws Exception {
        Sessao d = docente("Prof", "D1");
        long id = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        executar(post("/api/votacoes/" + id + "/encerrar"), d).andExpect(status().isUnprocessableEntity());
        executar(post("/api/votacoes/" + id + "/publicar"), d);
        executar(post("/api/votacoes/" + id + "/encerrar"), d).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void prorrogarExigeNovoFimPosterior() throws Exception {
        Sessao d = docente("Prof", "D1");
        long id = votacaoAberta(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        enviar(post("/api/votacoes/" + id + "/prorrogar"), d, Map.of("fim", "2026-11-21T12:00:00Z"))
                .andExpect(status().isUnprocessableEntity());
        enviar(post("/api/votacoes/" + id + "/prorrogar"), d, Map.of("fim", "2026-11-21T11:00:00Z"))
                .andExpect(status().isUnprocessableEntity());
        enviar(post("/api/votacoes/" + id + "/prorrogar"), d, Map.of())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.fim").exists());
        enviar(post("/api/votacoes/" + id + "/prorrogar"), d, Map.of("fim", "2026-11-22T12:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fim").value("2026-11-22T12:00:00Z"))
                .andExpect(jsonPath("$.estado").value("ABERTA"));
        relogio.definir(java.time.Instant.parse("2026-11-21T18:00:00Z"));
        executar(get("/api/votacoes/" + id), d).andExpect(jsonPath("$.estado").value("ABERTA"));
    }

    @Test
    void somenteDonoGerenciaEVe() throws Exception {
        Sessao d1 = docente("Prof Um", "D1");
        Sessao d2 = docente("Prof Dois", "D2");
        Sessao a = aluno("Aluno", "A1");
        long id = criarVotacao(d1, votacaoInput(1, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        executar(get("/api/votacoes/" + id), d2).andExpect(status().isNotFound());
        executar(post("/api/votacoes/" + id + "/publicar"), d2).andExpect(status().isNotFound());
        executar(post("/api/votacoes/" + id + "/publicar"), a).andExpect(status().isForbidden());
        enviar(post("/api/votacoes"), a, votacaoInput(1, false, false, "SEMPRE", List.of(), 2))
                .andExpect(status().isForbidden());
        executar(get("/api/votacoes"), d2).andExpect(jsonPath("$", hasSize(0)));
        executar(get("/api/votacoes"), d1).andExpect(jsonPath("$", hasSize(1)));
        executar(get("/api/votacoes/12345"), d1).andExpect(status().isNotFound());
    }
}
