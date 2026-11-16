package br.edu.ifrs.votacoes.config;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;

import br.edu.ifrs.votacoes.seguranca.CookieSessao;
import br.edu.ifrs.votacoes.seguranca.FiltroCookieJwt;
import br.edu.ifrs.votacoes.seguranca.JwtService;
import br.edu.ifrs.votacoes.seguranca.OAuthHandlers;
import br.edu.ifrs.votacoes.seguranca.RespostasSeguranca;
import br.edu.ifrs.votacoes.usuario.UsuarioRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, CookieSessao cookie, JwtService jwt,
            UsuarioRepository usuarios, RespostasSeguranca respostas, OAuthHandlers oauthHandlers,
            ObjectProvider<ClientRegistrationRepository> registrosGoogle) throws Exception {

        http
            // CSRF desabilitado conscientemente: o cookie de sessão é SameSite=Lax (o navegador não o
            // envia em POST/PUT/DELETE vindos de outro site), a API só é acessada na mesma origem via
            // proxy do Next.js, não há CORS liberado e nenhuma rota GET altera estado.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .requestCache(AbstractHttpConfigurer::disable)
            // A autenticação nunca é guardada em sessão HTTP: vem sempre do JWT no cookie.
            // A sessão só pode ser criada pelo handshake OAuth (para guardar o "state").
            .securityContext(c -> c.securityContextRepository(new RequestAttributeSecurityContextRepository()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .exceptionHandling(e -> e.authenticationEntryPoint(respostas).accessDeniedHandler(respostas))
            .addFilterBefore(new FiltroCookieJwt(cookie, jwt, usuarios), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(a -> a
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/config").permitAll()
                .requestMatchers("/api/oauth2/**", "/api/login/oauth2/**").permitAll()
                // O controlador só existe com o perfil "dev"; fora dele a rota responde 404.
                .requestMatchers(HttpMethod.POST, "/api/dev/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/arquivos/**").permitAll()
                .requestMatchers("/api/auth/**").authenticated()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/uploads/**", "/api/uploads").hasRole("DOCENTE")
                .requestMatchers("/api/turmas/**", "/api/turmas", "/api/votacoes/**", "/api/votacoes")
                    .hasAnyRole("DOCENTE", "ALUNO")
                .anyRequest().denyAll());

        if (registrosGoogle.getIfAvailable() != null) {
            http.oauth2Login(o -> o
                .authorizationEndpoint(ae -> ae.baseUri(GoogleOAuthConfig.BASE_AUTORIZACAO))
                .redirectionEndpoint(re -> re.baseUri(GoogleOAuthConfig.BASE_CALLBACK))
                .successHandler(oauthHandlers)
                .failureHandler(oauthHandlers));
        }
        return http.build();
    }
}
