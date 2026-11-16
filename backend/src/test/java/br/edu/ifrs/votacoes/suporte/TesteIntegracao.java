package br.edu.ifrs.votacoes.suporte;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.edu.ifrs.votacoes.seguranca.CookieSessao;
import jakarta.servlet.http.Cookie;

/**
 * Base dos testes de integração: aplicação completa (perfil dev) + MockMvc + PostgreSQL 16 embutido
 * com as migrations Flyway reais + relógio controlável. O banco é limpo antes de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Import(TesteIntegracao.ConfigTeste.class)
public abstract class TesteIntegracao {

    public static final Instant T0 = Instant.parse("2026-11-20T12:00:00Z");
    public static final String SEGREDO = "segredo-de-teste-com-mais-de-32-bytes-0123456789";
    public static final String EMAIL_ADMIN = "admin@escola.edu.br";

    @TestConfiguration
    public static class ConfigTeste {
        @Bean
        @Primary
        public RelogioTeste relogioTeste() {
            return new RelogioTeste(T0);
        }
    }

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry r) throws Exception {
        r.add("spring.datasource.url", BancoEmbutido::jdbcUrl);
        r.add("spring.datasource.username", () -> "postgres");
        r.add("spring.datasource.password", () -> "postgres");
        r.add("app.jwt-secret", () -> SEGREDO);
        r.add("app.admin-emails", () -> EMAIL_ADMIN);
        r.add("app.upload-dir", () -> PASTA_UPLOADS.toString());
    }

    protected static final Path PASTA_UPLOADS = criarPasta();

    private static Path criarPasta() {
        try {
            return Files.createTempDirectory("votacoes-uploads");
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected JdbcTemplate jdbc;
    @Autowired
    protected RelogioTeste relogio;
    @Autowired
    protected ObjectMapper json;

    /** Usuário logado nos testes: cookie de sessão + id. */
    public record Sessao(Cookie cookie, long id) {
    }

    @BeforeEach
    void limparBanco() {
        jdbc.execute("TRUNCATE usuario, turma, turma_aluno, votacao, votacao_turma, opcao, participacao, "
                + "voto, guarda_anonima RESTART IDENTITY CASCADE");
        relogio.definir(T0);
    }

    // ---------- sessões ----------

    protected Sessao login(String email, String nome) throws Exception {
        MvcResult r = mvc.perform(post("/api/dev/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "nome", nome))))
                .andExpect(status().isOk()).andReturn();
        Cookie c = r.getResponse().getCookie(CookieSessao.NOME);
        return new Sessao(c, json.readTree(r.getResponse().getContentAsString()).get("id").asLong());
    }

    protected Sessao aluno(String nome, String matricula) throws Exception {
        Sessao s = login(nome.toLowerCase().replace(' ', '.') + "@escola.edu.br", nome);
        cadastro(s, "ALUNO", matricula).andExpect(status().isOk());
        return s;
    }

    protected Sessao admin() throws Exception {
        return login(EMAIL_ADMIN, "Administração");
    }

    protected Sessao docente(String nome, String matricula) throws Exception {
        Sessao d = login(nome.toLowerCase().replace(' ', '.') + "@escola.edu.br", nome);
        cadastro(d, "DOCENTE", matricula).andExpect(status().isOk());
        Sessao adm = admin();
        executar(post("/api/admin/usuarios/" + d.id() + "/aprovar"), adm).andExpect(status().isOk());
        return d;
    }

    protected ResultActions cadastro(Sessao s, String papel, String matricula) throws Exception {
        return enviar(post("/api/auth/cadastro"), s, Map.of("papel", papel, "matricula", matricula));
    }

    // ---------- requisições ----------

    protected ResultActions executar(MockHttpServletRequestBuilder req, Sessao s) throws Exception {
        if (s != null) {
            req.cookie(s.cookie());
        }
        return mvc.perform(req);
    }

    protected ResultActions enviar(MockHttpServletRequestBuilder req, Sessao s, Object corpo) throws Exception {
        req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(corpo));
        return executar(req, s);
    }

    protected JsonNode corpo(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    protected static MockHttpServletRequestBuilder get(String url) {
        return MockMvcRequestBuilders.get(url);
    }

    // ---------- fábricas de dados ----------

    protected long criarTurma(Sessao docente, String nome) throws Exception {
        return corpo(enviar(post("/api/turmas"), docente, Map.of("nome", nome, "descricao", "desc"))
                .andExpect(status().isOk())).get("id").asLong();
    }

    protected String codigoDaTurma(Sessao docente, long turmaId) throws Exception {
        for (JsonNode t : corpo(executar(get("/api/turmas"), docente))) {
            if (t.get("id").asLong() == turmaId) {
                return t.get("codigo").asText();
            }
        }
        throw new IllegalStateException("turma não encontrada");
    }

    protected void entrarNaTurma(Sessao aluno, String codigo) throws Exception {
        enviar(post("/api/turmas/entrar"), aluno, Map.of("codigo", codigo)).andExpect(status().isOk());
    }

    /** Monta um VotacaoInput; por padrão abre em T0+1h e fecha em T0+1d, com 3 opções. */
    protected Map<String, Object> votacaoInput(int votosPorAluno, boolean repetir, boolean anonima,
            String visibilidade, List<Long> turmaIds, int nOpcoes) {
        var opcoes = new java.util.ArrayList<Map<String, Object>>();
        for (int i = 1; i <= nOpcoes; i++) {
            opcoes.add(Map.of("titulo", "Opção " + i));
        }
        var m = new java.util.HashMap<String, Object>();
        m.put("titulo", "Representante de turma");
        m.put("descricao", "Escolha do representante");
        m.put("inicio", T0.plusSeconds(3600).toString());
        m.put("fim", T0.plusSeconds(86400).toString());
        m.put("votosPorAluno", votosPorAluno);
        m.put("permiteRepetirOpcao", repetir);
        m.put("anonima", anonima);
        m.put("visibilidadeResultado", visibilidade);
        m.put("turmaIds", turmaIds);
        m.put("opcoes", opcoes);
        return m;
    }

    protected JsonNode criarVotacao(Sessao docente, Map<String, Object> input) throws Exception {
        return corpo(enviar(post("/api/votacoes"), docente, input).andExpect(status().isOk()));
    }

    /** Cria, publica e abre (avança o relógio até o início) uma votação. Devolve o JSON publicado. */
    protected JsonNode votacaoAberta(Sessao docente, Map<String, Object> input) throws Exception {
        JsonNode v = criarVotacao(docente, input);
        long id = v.get("id").asLong();
        executar(post("/api/votacoes/" + id + "/publicar"), docente).andExpect(status().isOk());
        relogio.definir(Instant.parse((String) input.get("inicio")));
        return v;
    }

    protected ResultActions votar(Sessao aluno, long votacaoId, Object... pares) throws Exception {
        var votos = new java.util.ArrayList<Map<String, Object>>();
        for (int i = 0; i < pares.length; i += 2) {
            votos.add(Map.of("opcaoId", pares[i], "quantidade", pares[i + 1]));
        }
        return enviar(post("/api/votacoes/" + votacaoId + "/votos"), aluno, Map.of("votos", votos));
    }

    protected static long opcaoId(JsonNode votacao, int indice) {
        return votacao.get("opcoes").get(indice).get("id").asLong();
    }
}
