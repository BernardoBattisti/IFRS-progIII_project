package br.edu.ifrs.votacoes.usuario;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.seguranca.CookieSessao;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Login de desenvolvimento, sem Google. O bean só existe com o perfil Spring "dev" ativo;
 * fora dele a rota não existe (404). Aplica as mesmas regras do login Google
 * (domínios aceitos, e-mails de administrador).
 */
@Profile("dev")
@RestController
public class DevLoginController {

    public record DevLoginRequest(
            @NotBlank(message = "obrigatório") @Email(message = "e-mail inválido") @Size(max = 320) String email,
            @NotBlank(message = "obrigatório") @Size(max = 200, message = "deve ter no máximo 200 caracteres") String nome) {
    }

    private final UsuarioService usuarios;
    private final CookieSessao cookie;

    public DevLoginController(UsuarioService usuarios, CookieSessao cookie) {
        this.usuarios = usuarios;
        this.cookie = cookie;
    }

    @PostMapping("/api/dev/login")
    public UsuarioDto login(@Valid @RequestBody DevLoginRequest req, HttpServletResponse resp) {
        Usuario u;
        try {
            u = usuarios.login(req.email(), req.nome(), null, null);
        } catch (LoginNegadoException e) {
            throw ApiException.semPermissao(e.getMessage());
        }
        cookie.abrir(resp, u.getId());
        return UsuarioDto.de(u);
    }
}
