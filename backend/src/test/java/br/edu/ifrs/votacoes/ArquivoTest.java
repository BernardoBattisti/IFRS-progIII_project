package br.edu.ifrs.votacoes;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

class ArquivoTest extends TesteIntegracao {

    static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R' };

    @Test
    void docenteEnviaImagemELeituraEPublica() throws Exception {
        Sessao d = docente("Prof", "D1");
        String url = corpo(executar(multipart("/api/uploads")
                .file(new MockMultipartFile("arquivo", "foto.exe", "application/octet-stream", PNG)), d)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(matchesPattern("^/api/arquivos/[0-9a-f-]{36}\\.png$"))))
                .get("url").asText();

        mvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(PNG));

        // A URL devolvida é aceita como imagemUrl de opção.
        Map<String, Object> in = votacaoInput(1, false, false, "SEMPRE", List.of(), 2);
        in.put("opcoes", List.of(Map.of("titulo", "A", "imagemUrl", url), Map.of("titulo", "B")));
        enviar(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/votacoes"), d, in)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.opcoes[0].imagemUrl").value(url));
    }

    @Test
    void tipoValidadoPeloConteudo() throws Exception {
        Sessao d = docente("Prof", "D1");
        executar(multipart("/api/uploads").file(new MockMultipartFile("arquivo", "falso.png", "image/png",
                "<script>alert(1)</script>".getBytes())), d)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.arquivo").exists());
        executar(multipart("/api/uploads"), d).andExpect(status().isBadRequest());
    }

    @Test
    void arquivoMaiorQue5MbRecusado() throws Exception {
        Sessao d = docente("Prof", "D1");
        byte[] grande = new byte[5 * 1024 * 1024 + 1];
        System.arraycopy(PNG, 0, grande, 0, PNG.length);
        executar(multipart("/api/uploads").file(new MockMultipartFile("arquivo", "g.png", "image/png", grande)), d)
                .andExpect(status().isBadRequest());
    }

    @Test
    void somenteDocenteEnvia() throws Exception {
        Sessao a = aluno("Aluno", "A1");
        executar(multipart("/api/uploads").file(new MockMultipartFile("arquivo", "x.png", "image/png", PNG)), a)
                .andExpect(status().isForbidden());
    }

    @Test
    void leituraBloqueiaNomesForaDoPadrao() throws Exception {
        // Barra codificada é rejeitada já pelo firewall do Spring Security (400).
        mvc.perform(get("/api/arquivos/..%2F..%2Fetc%2Fpasswd")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/arquivos/..")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/arquivos/application.yml")).andExpect(status().isNotFound());
        mvc.perform(get("/api/arquivos/00000000-0000-0000-0000-000000000000.png")).andExpect(status().isNotFound());
    }

    @Test
    void imagemUrlExternaRecusada() throws Exception {
        Sessao d = docente("Prof", "D1");
        Map<String, Object> in = votacaoInput(1, false, false, "SEMPRE", List.of(), 2);
        in.put("opcoes", List.of(Map.of("titulo", "A", "imagemUrl", "https://evil.example/x.png"), Map.of("titulo", "B")));
        enviar(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/votacoes"), d, in)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos['opcoes[0].imagemUrl']").exists());
    }
}
