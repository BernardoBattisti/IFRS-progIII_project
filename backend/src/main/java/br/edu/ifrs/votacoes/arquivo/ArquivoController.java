package br.edu.ifrs.votacoes.arquivo;

import java.time.Duration;
import java.util.Map;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.edu.ifrs.votacoes.erro.ApiException;

@RestController
public class ArquivoController {

    private final ArquivoService arquivos;

    public ArquivoController(ArquivoService arquivos) {
        this.arquivos = arquivos;
    }

    /** Upload de imagem (docente ativo, exigido em SecurityConfig). */
    @PostMapping(path = "/api/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(@RequestParam("arquivo") MultipartFile arquivo) {
        return Map.of("url", arquivos.salvar(arquivo));
    }

    /** Leitura pública. Nomes são UUIDs gerados pelo servidor, então o conteúdo é imutável. */
    @GetMapping("/api/arquivos/{nome}")
    public ResponseEntity<Resource> ler(@PathVariable String nome) {
        var arq = arquivos.abrir(nome).orElseThrow(() -> ApiException.naoEncontrado("Arquivo não encontrado."));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(arq.tipo().mime()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(arq.caminho()));
    }
}
