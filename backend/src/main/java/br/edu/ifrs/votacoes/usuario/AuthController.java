package br.edu.ifrs.votacoes.usuario;

import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.edu.ifrs.votacoes.config.AppProperties;
import br.edu.ifrs.votacoes.seguranca.CookieSessao;
import br.edu.ifrs.votacoes.seguranca.UsuarioAutenticado;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record ConfigAuth(boolean devLogin, boolean googleHabilitado) {
    }

    private final UsuarioService usuarios;
    private final CookieSessao cookie;
    private final AppProperties props;
    private final Environment env;

    public AuthController(UsuarioService usuarios, CookieSessao cookie, AppProperties props, Environment env) {
        this.usuarios = usuarios;
        this.cookie = cookie;
        this.props = props;
        this.env = env;
    }

    @GetMapping("/config")
    public ConfigAuth config() {
        return new ConfigAuth(env.acceptsProfiles(Profiles.of("dev")), props.google().habilitado());
    }

    @GetMapping("/me")
    public UsuarioDto me(@AuthenticationPrincipal UsuarioAutenticado eu) {
        return UsuarioDto.de(usuarios.buscar(eu.id()));
    }

    @PostMapping("/cadastro")
    public UsuarioDto cadastro(@AuthenticationPrincipal UsuarioAutenticado eu,
            @Valid @RequestBody CadastroRequest req) {
        return UsuarioDto.de(usuarios.concluirCadastro(eu.id(), req));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse resp) {
        cookie.fechar(resp);
        return ResponseEntity.noContent().build();
    }
}
