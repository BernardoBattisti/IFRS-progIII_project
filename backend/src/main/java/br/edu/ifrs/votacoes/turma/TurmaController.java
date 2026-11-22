package br.edu.ifrs.votacoes.turma;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.edu.ifrs.votacoes.seguranca.UsuarioAutenticado;
import br.edu.ifrs.votacoes.turma.TurmaDtos.AlunoDto;
import br.edu.ifrs.votacoes.turma.TurmaDtos.EntrarRequest;
import br.edu.ifrs.votacoes.turma.TurmaDtos.TurmaDto;
import br.edu.ifrs.votacoes.turma.TurmaDtos.TurmaInput;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/turmas")
public class TurmaController {

    private final TurmaService servico;

    public TurmaController(TurmaService servico) {
        this.servico = servico;
    }

    @GetMapping
    public List<TurmaDto> listar(@AuthenticationPrincipal UsuarioAutenticado eu) {
        return servico.listar(eu.id());
    }

    @PostMapping
    public TurmaDto criar(@AuthenticationPrincipal UsuarioAutenticado eu, @Valid @RequestBody TurmaInput in) {
        return servico.criar(eu.id(), in);
    }

    @PutMapping("/{id}")
    public TurmaDto atualizar(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id,
            @Valid @RequestBody TurmaInput in) {
        return servico.atualizar(eu.id(), id, in);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        servico.excluir(eu.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/codigo")
    public TurmaDto regenerarCodigo(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        return servico.regenerarCodigo(eu.id(), id);
    }

    @GetMapping("/{id}/alunos")
    public List<AlunoDto> alunos(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        return servico.alunos(eu.id(), id);
    }

    @DeleteMapping("/{id}/alunos/{alunoId}")
    public ResponseEntity<Void> removerAluno(@AuthenticationPrincipal UsuarioAutenticado eu,
            @PathVariable Long id, @PathVariable Long alunoId) {
        servico.removerAluno(eu.id(), id, alunoId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/entrar")
    public TurmaDto entrar(@AuthenticationPrincipal UsuarioAutenticado eu, @Valid @RequestBody EntrarRequest req) {
        return servico.entrar(eu.id(), req.codigo());
    }
}
