package br.edu.ifrs.votacoes.usuario;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Rotas de administração (ADMIN ativo, exigido em SecurityConfig). */
@RestController
@RequestMapping("/api/admin/usuarios")
public class AdminController {

    private final UsuarioService usuarios;

    public AdminController(UsuarioService usuarios) {
        this.usuarios = usuarios;
    }

    @GetMapping
    public List<UsuarioDto> listar(@RequestParam(required = false) StatusConta status,
            @RequestParam(required = false) Papel papel) {
        return usuarios.listar(status, papel).stream().map(UsuarioDto::de).toList();
    }

    @PostMapping("/{id}/aprovar")
    public UsuarioDto aprovar(@PathVariable Long id) {
        return UsuarioDto.de(usuarios.decidirDocente(id, true));
    }

    @PostMapping("/{id}/rejeitar")
    public UsuarioDto rejeitar(@PathVariable Long id) {
        return UsuarioDto.de(usuarios.decidirDocente(id, false));
    }
}
