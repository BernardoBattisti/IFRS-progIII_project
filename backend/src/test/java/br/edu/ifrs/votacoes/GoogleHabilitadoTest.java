package br.edu.ifrs.votacoes;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import br.edu.ifrs.votacoes.suporte.BancoEmbutido;
import br.edu.ifrs.votacoes.suporte.TesteIntegracao;

/** Com GOOGLE_CLIENT_ID preenchido, o início do OAuth fica sob /api e o redirect-uri usa APP_BASE_URL. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class GoogleHabilitadoTest {

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", BancoEmbutido::jdbcUrl);
        r.add("spring.datasource.username", () -> "postgres");
        r.add("spring.datasource.password", () -> "postgres");
        r.add("app.jwt-secret", () -> TesteIntegracao.SEGREDO);
        r.add("app.base-url", () -> "https://votacoes.exemplo.edu.br");
        r.add("app.google.client-id", () -> "id-de-teste.apps.googleusercontent.com");
        r.add("app.google.client-secret", () -> "segredo");
        r.add("app.upload-dir", () -> System.getProperty("java.io.tmpdir") + "/votacoes-google");
    }

    @Autowired
    MockMvc mvc;

    @org.springframework.boot.test.web.server.LocalServerPort
    int porta;

    /** Item 9 da revisão: o JSESSIONID do handshake OAuth é Secure (base https), HttpOnly e SameSite=Lax. */
    @Test
    void cookieDaSessaoDoHandshakeEhSeguro() throws Exception {
        var cliente = java.net.http.HttpClient.newBuilder()
                .followRedirects(java.net.http.HttpClient.Redirect.NEVER).build();
        var resp = cliente.send(java.net.http.HttpRequest.newBuilder(
                java.net.URI.create("http://localhost:" + porta + "/api/oauth2/authorization/google")).build(),
                java.net.http.HttpResponse.BodyHandlers.discarding());
        String setCookie = resp.headers().allValues("Set-Cookie").stream()
                .filter(c -> c.startsWith("JSESSIONID=")).findFirst().orElseThrow();
        org.assertj.core.api.Assertions.assertThat(setCookie)
                .contains("Secure").contains("HttpOnly").contains("SameSite=Lax");
    }

    @Test
    void configInformaGoogleHabilitado() throws Exception {
        mvc.perform(get("/api/auth/config")).andExpect(jsonPath("$.googleHabilitado").value(true));
    }

    @Test
    void iniciaOAuthComRedirectUriBaseadoEmAppBaseUrl() throws Exception {
        mvc.perform(get("/api/oauth2/authorization/google"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", allOf(
                        startsWith("https://accounts.google.com/o/oauth2/v2/auth"),
                        containsString("redirect_uri=https://votacoes.exemplo.edu.br/api/login/oauth2/code/google"),
                        containsString("client_id=id-de-teste.apps.googleusercontent.com"))));
    }

    @Test
    void rotasDeNegocioContinuamExigindoCookie() throws Exception {
        mvc.perform(get("/api/votacoes")).andExpect(status().isUnauthorized());
    }
}
