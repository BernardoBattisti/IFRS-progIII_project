package br.edu.ifrs.votacoes.votacao;

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
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.ProrrogarRequest;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.Resultado;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotacaoDto;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotacaoInput;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotarRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/votacoes")
public class VotacaoController {

    private final VotacaoService votacoes;
    private final VotoService votos;
    private final ResultadoService resultados;

    public VotacaoController(VotacaoService votacoes, VotoService votos, ResultadoService resultados) {
        this.votacoes = votacoes;
        this.votos = votos;
        this.resultados = resultados;
    }

    @GetMapping
    public List<VotacaoDto> listar(@AuthenticationPrincipal UsuarioAutenticado eu) {
        return votacoes.listar(eu.id());
    }

    @GetMapping("/{id}")
    public VotacaoDto detalhar(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        return votacoes.detalhar(eu.id(), id);
    }

    @PostMapping
    public VotacaoDto criar(@AuthenticationPrincipal UsuarioAutenticado eu, @Valid @RequestBody VotacaoInput in) {
        return votacoes.criar(eu.id(), in);
    }

    @PutMapping("/{id}")
    public VotacaoDto atualizar(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id,
            @Valid @RequestBody VotacaoInput in) {
        return votacoes.atualizar(eu.id(), id, in);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        votacoes.excluir(eu.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/publicar")
    public VotacaoDto publicar(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        return votacoes.publicar(eu.id(), id);
    }

    @PostMapping("/{id}/despublicar")
    public VotacaoDto despublicar(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        return votacoes.despublicar(eu.id(), id);
    }

    @PostMapping("/{id}/encerrar")
    public VotacaoDto encerrar(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        return votacoes.encerrar(eu.id(), id);
    }

    @PostMapping("/{id}/prorrogar")
    public VotacaoDto prorrogar(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id,
            @Valid @RequestBody ProrrogarRequest req) {
        return votacoes.prorrogar(eu.id(), id, req.fim());
    }

    @PostMapping("/{id}/votos")
    public VotacaoDto votar(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id,
            @Valid @RequestBody VotarRequest req) {
        return votos.votar(eu.id(), id, req);
    }

    @GetMapping("/{id}/resultados")
    public Resultado resultados(@AuthenticationPrincipal UsuarioAutenticado eu, @PathVariable Long id) {
        return resultados.resultado(eu.id(), id);
    }
}
