package br.edu.ifrs.votacoes.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;

import br.edu.ifrs.votacoes.dominio.DominioService;
import br.edu.ifrs.votacoes.seguranca.CookieSessao;
import br.edu.ifrs.votacoes.seguranca.FiltroCookieJwt;
import br.edu.ifrs.votacoes.seguranca.FiltroLimiteTentativas;
import br.edu.ifrs.votacoes.seguranca.FiltroOrigem;
import br.edu.ifrs.votacoes.seguranca.JwtService;
import br.edu.ifrs.votacoes.seguranca.LimiteTentativas;
import br.edu.ifrs.votacoes.seguranca.RespostasSeguranca;
import br.edu.ifrs.votacoes.usuario.UsuarioRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /** BCrypt (custo padrão 10) para as senhas guardadas no banco. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, CookieSessao cookie, JwtService jwt,
            UsuarioRepository usuarios, DominioService dominios, RespostasSeguranca respostas, AppProperties props,
            LimiteTentativas limite) throws Exception {

        http
            // CSRF: sem token sincronizador, por decisão. Camadas usadas no lugar dele:
            //  - cookie de sessão SameSite=Lax: navegador não o envia em POST/PUT/DELETE de outro SITE;
            //  - FiltroOrigem: recusa métodos não seguros cujo Sec-Fetch-Site não seja same-origin/none
            //    ou cujo Origin difira de APP_BASE_URL — cobre ataques de outra origem do MESMO site
            //    (ex.: subdomínio), inclusive POSTs sem corpo e multipart, que o SameSite não barra;
            //  - API só na mesma origem via proxy do Next.js, sem CORS, e nenhum GET altera estado.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .requestCache(AbstractHttpConfigurer::disable)
            // A autenticação nunca é guardada em sessão HTTP: vem sempre do JWT no cookie.
            .securityContext(c -> c.securityContextRepository(new RequestAttributeSecurityContextRepository()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e.authenticationEntryPoint(respostas).accessDeniedHandler(respostas))
            .addFilterBefore(new FiltroCookieJwt(cookie, jwt, usuarios, dominios),
                    UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new FiltroLimiteTentativas(limite, respostas), FiltroCookieJwt.class)
            .addFilterBefore(new FiltroOrigem(props, respostas), FiltroLimiteTentativas.class)
            .authorizeHttpRequests(a -> a
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/cadastro", "/api/auth/login", "/api/auth/logout",
                        "/api/auth/esqueci-senha", "/api/auth/redefinir-senha").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/arquivos/**").permitAll()
                .requestMatchers("/api/auth/**").authenticated()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/uploads/**", "/api/uploads").hasRole("DOCENTE")
                .requestMatchers("/api/turmas/**", "/api/turmas", "/api/votacoes/**", "/api/votacoes")
                    .hasAnyRole("DOCENTE", "ALUNO")
                .anyRequest().denyAll());
        return http.build();
    }
}
