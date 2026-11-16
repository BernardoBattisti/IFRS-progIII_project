package br.edu.ifrs.votacoes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

class AnonimatoTest extends TesteIntegracao {

    @Test
    void votoAnonimoNaoGuardaAlunoNemDataEUsaGuardaHmac() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(2, false, true, "SEMPRE", List.of(), 3));
        long id = v.get("id").asLong();
        long o1 = opcaoId(v, 0);

        votar(a, id, o1, 1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.votosUsados").value(1))
                .andExpect(jsonPath("$.votosRestantes").value(1))
                .andExpect(jsonPath("$.meusVotos").value(nullValue()));

        var votos = jdbc.queryForList("select aluno_id, registrado_em from voto");
        assertThat(votos).hasSize(1);
        assertThat(votos.get(0).get("aluno_id")).isNull();
        assertThat(votos.get(0).get("registrado_em")).isNull();

        // Participação guarda só aluno, votação e votos usados.
        var part = jdbc.queryForMap("select * from participacao");
        assertThat(part).containsOnlyKeys("votacao_id", "aluno_id", "votos_usados");
        assertThat(part.get("votos_usados")).isEqualTo(1);

        String esperado = hmac(id + ":" + a.id() + ":" + o1);
        assertThat(jdbc.queryForList("select hash from guarda_anonima", String.class)).containsExactly(esperado);

        // O mesmo aluno não consegue votar de novo na mesma opção (regra imposta pela guarda).
        votar(a, id, o1, 1).andExpect(status().isUnprocessableEntity());
        votar(a, id, opcaoId(v, 1), 1).andExpect(status().isOk());

        // Nem o próprio aluno vê em que votou.
        executar(get("/api/votacoes/" + id), a)
                .andExpect(jsonPath("$.votosUsados").value(2))
                .andExpect(jsonPath("$.meusVotos").value(nullValue()));
    }

    @Test
    void resultadoAnonimoSoTemTotais() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        Sessao b = aluno("Bia", "A2");
        JsonNode v = votacaoAberta(d, votacaoInput(1, false, true, "SEMPRE", List.of(), 2));
        long id = v.get("id").asLong();
        votar(a, id, opcaoId(v, 0), 1).andExpect(status().isOk());
        votar(b, id, opcaoId(v, 0), 1).andExpect(status().isOk());

        for (Sessao s : List.of(d, a)) {
            executar(get("/api/votacoes/" + id + "/resultados"), s)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalVotos").value(2))
                    .andExpect(jsonPath("$.totalParticipantes").value(2))
                    .andExpect(jsonPath("$.opcoes[0].votos").value(2))
                    .andExpect(jsonPath("$.opcoes[0].percentual").value(100.0))
                    .andExpect(jsonPath("$.opcoes[0].votantes").value(nullValue()))
                    .andExpect(jsonPath("$.opcoes[1].votantes").value(nullValue()));
        }
    }

    @Test
    void anonimaComRepeticaoNaoPrecisaDeGuarda() throws Exception {
        Sessao d = docente("Prof", "D1");
        Sessao a = aluno("Aluno", "A1");
        JsonNode v = votacaoAberta(d, votacaoInput(3, true, true, "SEMPRE", List.of(), 2));
        votar(a, v.get("id").asLong(), opcaoId(v, 0), 2).andExpect(status().isOk());
        votar(a, v.get("id").asLong(), opcaoId(v, 0), 1).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from guarda_anonima", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from voto where aluno_id is not null", Integer.class)).isZero();
    }

    private static String hmac(String msg) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SEGREDO.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(msg.getBytes(StandardCharsets.UTF_8)));
    }
}
