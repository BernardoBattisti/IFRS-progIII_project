package br.edu.ifrs.votacoes.dominio;

import java.time.Instant;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Lista de domínios aceitos (ADMIN ativo, exigido em SecurityConfig). */
@RestController
@RequestMapping("/api/admin/dominios")
public class DominioController {

    public record DominioDto(Long id, String dominio, Instant criadoEm) {
        static DominioDto de(DominioAceito d) {
            return new DominioDto(d.getId(), d.getDominio(), d.getCriadoEm());
        }
    }

    public record DominioRequest(
            @NotNull(message = "obrigatório") @Size(max = 300, message = "formato de domínio inválido (ex.: ifrs.edu.br)") String dominio) {
    }

    private final DominioService dominios;

    public DominioController(DominioService dominios) {
        this.dominios = dominios;
    }

    @GetMapping
    public List<DominioDto> listar() {
        return dominios.listar().stream().map(DominioDto::de).toList();
    }

    @PostMapping
    public DominioDto adicionar(@Valid @RequestBody DominioRequest req) {
        return DominioDto.de(dominios.adicionar(req.dominio()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        dominios.remover(id);
        return ResponseEntity.noContent().build();
    }
}
