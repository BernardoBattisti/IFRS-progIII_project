package br.edu.ifrs.votacoes.usuario;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.edu.ifrs.votacoes.email.EmailService;
import br.edu.ifrs.votacoes.seguranca.CookieSessao;
import br.edu.ifrs.votacoes.seguranca.UsuarioAutenticado;
import br.edu.ifrs.votacoes.usuario.AuthDtos.CadastroRequest;
import br.edu.ifrs.votacoes.usuario.AuthDtos.EsqueciSenhaRequest;
import br.edu.ifrs.votacoes.usuario.AuthDtos.LoginRequest;
import br.edu.ifrs.votacoes.usuario.AuthDtos.RedefinirSenhaRequest;
import br.edu.ifrs.votacoes.usuario.AuthDtos.TrocaSenhaRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

/** Rotas de autenticação (seção 5.1). */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AutenticacaoService auth;
    private final RecuperacaoSenhaService recuperacao;
    private final EmailService emails;
    private final UsuarioService usuarios;
    private final CookieSessao cookie;

    public AuthController(AutenticacaoService auth, RecuperacaoSenhaService recuperacao, EmailService emails,
            UsuarioService usuarios, CookieSessao cookie) {
        this.auth = auth;
        this.recuperacao = recuperacao;
        this.emails = emails;
        this.usuarios = usuarios;
        this.cookie = cookie;
    }

    @PostMapping("/cadastro")
    public UsuarioDto cadastro(@Valid @RequestBody CadastroRequest req, HttpServletResponse resp) {
        Usuario u = auth.cadastrar(req);
        cookie.abrir(resp, u.getId());
        return UsuarioDto.de(u);
    }

    @PostMapping("/login")
    public UsuarioDto login(@Valid @RequestBody LoginRequest req, HttpServletResponse resp) {
        Usuario u = auth.login(req.email(), req.senha());
        cookie.abrir(resp, u.getId());
        return UsuarioDto.de(u);
    }

    @GetMapping("/me")
    public UsuarioDto me(@AuthenticationPrincipal UsuarioAutenticado eu) {
        return UsuarioDto.de(usuarios.buscar(eu.id()));
    }

    /** Público: apenas apaga o cookie (funciona também com sessão já recusada pelo domínio). */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse resp) {
        cookie.fechar(resp);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/senha")
    public ResponseEntity<Void> trocarSenha(@AuthenticationPrincipal UsuarioAutenticado eu,
            @Valid @RequestBody TrocaSenhaRequest req) {
        auth.trocarSenha(eu.id(), req.senhaAtual(), req.novaSenha());
        return ResponseEntity.noContent().build();
    }

    /** Sempre 204, exista ou não a conta; o e-mail sai em segundo plano. */
    @PostMapping("/esqueci-senha")
    public ResponseEntity<Void> esqueciSenha(@Valid @RequestBody EsqueciSenhaRequest req) {
        recuperacao.solicitar(req.email())
                .ifPresent(p -> emails.enviarRedefinicaoSenha(p.usuarioId(), p.email(), p.nome(), p.token()));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/redefinir-senha")
    public ResponseEntity<Void> redefinirSenha(@Valid @RequestBody RedefinirSenhaRequest req) {
        recuperacao.redefinir(req.token(), req.novaSenha());
        return ResponseEntity.noContent().build();
    }
}
