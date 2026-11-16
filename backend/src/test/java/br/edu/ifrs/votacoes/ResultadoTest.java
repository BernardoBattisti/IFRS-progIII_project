package br.edu.ifrs.votacoes;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

class ResultadoTest extends TesteIntegracao {

    private static final Duration ATE_O_FIM = Duration.ofHours(23);

    @Test
    void docenteVeDesdeAPublicacaoMasNaoNoRascunho() throws Exception {
        Sessao d = docente("Prof", "D1");
        long id = criarVotacao(d, votacaoInput(1, false, false, "NUNCA", List.of(), 2)).get("id").asLong();
        executar(get("/api/votacoes/" + id + "/resultados"), d).andExpect(status().isForbidden());
        executar(post("/api/votacoes/" + id + "/publicar"), d).andExpect(jsonPath("$.podeVerResultado").value(true));
        executar(get("/api/votacoes/" + id + "/resultados"), d)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVotos").value(0))
                .andExpect(jsonPath("$.opcoes[0].percentual").value(0.0));
    }

    @Test
    void visibilidadeSempreAPartirDaAbertura() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        long id = criarVotacao(d, votacaoInput(1, false, false, "SEMPRE", List.of(), 2)).get("id").asLong();
        executar(post("/api/votacoes/" + id + "/publicar"), d);
        executar(get("/api/votacoes/" + id), a).andExpect(jsonPath("$.podeVerResultado").value(false));
        executar(get("/api/votacoes/" + id + "/resultados"), a).andExpect(status().isForbidden());

        relogio.avancar(Duration.ofHours(1));
        executar(get("/api/votacoes/" + id), a).andExpect(jsonPath("$.podeVerResultado").value(true));
        executar(get("/api/votacoes/" + id + "/resultados"), a).andExpect(status().isOk());
        relogio.avancar(ATE_O_FIM);
        executar(get("/api/votacoes/" + id + "/resultados"), a).andExpect(status().isOk());
    }

    @Test
    void visibilidadeAposEncerrar() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        long id = votacaoAberta(d, votacaoInput(1, false, false, "APOS_ENCERRAR", List.of(), 2)).get("id").asLong();
        executar(get("/api/votacoes/" + id), a).andExpect(jsonPath("$.podeVerResultado").value(false));
        executar(get("/api/votacoes/" + id + "/resultados"), a).andExpect(status().isForbidden());
        executar(get("/api/votacoes/" + id + "/resultados"), d).andExpect(status().isOk());

        executar(post("/api/votacoes/" + id + "/encerrar"), d).andExpect(status().isOk());
        executar(get("/api/votacoes/" + id), a).andExpect(jsonPath("$.podeVerResultado").value(true));
        executar(get("/api/votacoes/" + id + "/resultados"), a).andExpect(status().isOk());
    }

    @Test
    void visibilidadeNunca() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        long id = votacaoAberta(d, votacaoInput(1, false, false, "NUNCA", List.of(), 2)).get("id").asLong();
        relogio.avancar(Duration.ofDays(2));
        executar(get("/api/votacoes/" + id), a)
                .andExpect(jsonPath("$.estado").value("ENCERRADA"))
                .andExpect(jsonPath("$.podeVerResultado").value(false));
        executar(get("/api/votacoes/" + id + "/resultados"), a)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erro").value("SEM_PERMISSAO"));
        executar(get("/api/votacoes/" + id + "/resultados"), d).andExpect(status().isOk());
    }

    @Test
    void alunoInelegivelEOutroDocenteNaoVeemResultado() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao d2 = docente("Outro Prof", "D2");
        long t = criarTurma(d, "T");
        Sessao fora = aluno("Fora", "A1");
        long id = votacaoAberta(d, votacaoInput(1, false, false, "SEMPRE", List.of(t), 2)).get("id").asLong();
        executar(get("/api/votacoes/" + id + "/resultados"), fora).andExpect(status().isForbidden());
        executar(get("/api/votacoes/" + id + "/resultados"), d2).andExpect(status().isForbidden());
    }

    @Test
    void naoAnonimaMostraQuemVotouEmQue() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao bia = aluno("Bia", "A2");
        Sessao ana = aluno("Ana", "A1");
        Sessao caio = aluno("Caio", "A3");
        JsonNode v = votacaoAberta(d, votacaoInput(3, true, false, "SEMPRE", List.of(), 3));
        long id = v.get("id").asLong();
        long o1 = opcaoId(v, 0);
        long o2 = opcaoId(v, 1);
        votar(bia, id, o1, 2).andExpect(status().isOk());
        votar(bia, id, o1, 1).andExpect(status().isOk()); // somado ao envio anterior
        votar(ana, id, o1, 1, o2, 1).andExpect(status().isOk());
        votar(caio, id, o2, 1).andExpect(status().isOk());

        for (Sessao s : List.of(d, ana)) {
            executar(get("/api/votacoes/" + id + "/resultados"), s)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalVotos").value(6))
                    .andExpect(jsonPath("$.totalParticipantes").value(3))
                    .andExpect(jsonPath("$.opcoes", hasSize(3)))
                    .andExpect(jsonPath("$.opcoes[0].opcaoId").value(o1))
                    .andExpect(jsonPath("$.opcoes[0].titulo").value("Opção 1"))
                    .andExpect(jsonPath("$.opcoes[0].votos").value(4))
                    .andExpect(jsonPath("$.opcoes[0].percentual").value(66.67))
                    .andExpect(jsonPath("$.opcoes[0].votantes", hasSize(2)))
                    .andExpect(jsonPath("$.opcoes[0].votantes[0].nome").value("Ana"))
                    .andExpect(jsonPath("$.opcoes[0].votantes[0].matricula").value("A1"))
                    .andExpect(jsonPath("$.opcoes[0].votantes[0].quantidade").value(1))
                    .andExpect(jsonPath("$.opcoes[0].votantes[1].nome").value("Bia"))
                    .andExpect(jsonPath("$.opcoes[0].votantes[1].quantidade").value(3))
                    .andExpect(jsonPath("$.opcoes[1].votos").value(2))
                    .andExpect(jsonPath("$.opcoes[2].votos").value(0))
                    .andExpect(jsonPath("$.opcoes[2].votantes", hasSize(0)));
        }
    }
}
