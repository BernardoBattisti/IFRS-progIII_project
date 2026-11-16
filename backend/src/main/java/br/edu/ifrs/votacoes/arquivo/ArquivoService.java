package br.edu.ifrs.votacoes.arquivo;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import br.edu.ifrs.votacoes.config.AppProperties;
import br.edu.ifrs.votacoes.erro.ApiException;

@Service
public class ArquivoService {

    public static final long TAMANHO_MAXIMO = 5L * 1024 * 1024;

    /** Somente nomes gerados por nós: UUID + extensão conhecida. Barra qualquer path traversal. */
    private static final Pattern NOME_VALIDO = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$");

    private final Path pasta;

    public ArquivoService(AppProperties props) {
        this.pasta = Path.of(props.uploadDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(pasta);
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível criar a pasta de uploads " + pasta, e);
        }
    }

    public record Arquivo(Path caminho, TipoImagem tipo) {
    }

    public String salvar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw ApiException.validacao("arquivo", "obrigatório");
        }
        if (arquivo.getSize() > TAMANHO_MAXIMO) {
            throw ApiException.validacao("arquivo", "o arquivo excede o limite de 5 MB");
        }
        byte[] cabecalho = new byte[12];
        int lidos;
        try (InputStream in = arquivo.getInputStream()) {
            lidos = in.readNBytes(cabecalho, 0, cabecalho.length);
        } catch (IOException e) {
            throw ApiException.validacao("arquivo", "não foi possível ler o arquivo");
        }
        byte[] inicio = java.util.Arrays.copyOf(cabecalho, lidos);
        TipoImagem tipo = TipoImagem.detectar(inicio)
                .orElseThrow(() -> ApiException.validacao("arquivo", "tipo não suportado: envie JPEG, PNG ou WebP"));

        String nome = UUID.randomUUID() + "." + tipo.extensao();
        Path destino = pasta.resolve(nome);
        try (InputStream in = arquivo.getInputStream()) {
            Files.copy(in, destino);
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gravar o arquivo enviado", e);
        }
        return "/api/arquivos/" + nome;
    }

    public Optional<Arquivo> abrir(String nome) {
        if (nome == null || !NOME_VALIDO.matcher(nome).matches()) {
            return Optional.empty();
        }
        Path caminho = pasta.resolve(nome).normalize();
        if (!caminho.startsWith(pasta) || !Files.isRegularFile(caminho)) {
            return Optional.empty();
        }
        String ext = nome.substring(nome.lastIndexOf('.') + 1);
        return TipoImagem.porExtensao(ext).map(t -> new Arquivo(caminho, t));
    }

}
