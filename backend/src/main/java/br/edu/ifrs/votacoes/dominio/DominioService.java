package br.edu.ifrs.votacoes.dominio;

import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.erro.ApiException;

/**
 * Lista de domínios de e-mail aceitos (seção 2.2): conferida no cadastro, em todo login e a cada
 * requisição autenticada. Lista vazia = qualquer domínio. Comparação exata, em minúsculas.
 */
@Service
public class DominioService {

    /** Rótulos DNS (letras, dígitos e hífen, sem hífen nas pontas), ao menos dois, separados por ponto. */
    private static final Pattern FORMATO = Pattern.compile(
            "^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$");

    private final DominioRepository repo;
    private final Clock clock;

    public DominioService(DominioRepository repo, Clock clock) {
        this.repo = repo;
        this.clock = clock;
    }

    /** Minúsculas, sem espaços (em qualquer posição) e sem "@" inicial. */
    public static String normalizar(String bruto) {
        String d = bruto == null ? "" : bruto.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
        return d.startsWith("@") ? d.substring(1) : d;
    }

    /** Domínio (parte após o último "@") de um e-mail já normalizado. */
    public static String dominioDoEmail(String email) {
        return email.substring(email.lastIndexOf('@') + 1).toLowerCase(Locale.ROOT);
    }

    public static String mensagemRecusa(String dominio) {
        return "O domínio de e-mail \"" + dominio + "\" não é aceito por este sistema.";
    }

    @Transactional(readOnly = true)
    public boolean aceita(String dominio) {
        return repo.count() == 0 || repo.existsByDominio(dominio.toLowerCase(Locale.ROOT));
    }

    /** Lança 403 (DOMINIO_NAO_ACEITO) se o domínio do e-mail não for aceito. */
    @Transactional(readOnly = true)
    public void exigirAceito(String email) {
        String dominio = dominioDoEmail(email);
        if (!aceita(dominio)) {
            throw ApiException.dominioNaoAceito(mensagemRecusa(dominio));
        }
    }

    @Transactional(readOnly = true)
    public List<DominioAceito> listar() {
        return repo.findAllByOrderByDominioAsc();
    }

    @Transactional
    public DominioAceito adicionar(String bruto) {
        String dominio = normalizar(bruto);
        if (!FORMATO.matcher(dominio).matches()) {
            throw ApiException.validacao("dominio", "formato de domínio inválido (ex.: ifrs.edu.br)");
        }
        if (repo.existsByDominio(dominio)) {
            throw ApiException.conflito("Este domínio já está na lista.");
        }
        try {
            return repo.saveAndFlush(new DominioAceito(dominio, clock.instant()));
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflito("Este domínio já está na lista.");
        }
    }

    @Transactional
    public void remover(Long id) {
        DominioAceito d = repo.findById(id)
                .orElseThrow(() -> ApiException.naoEncontrado("Domínio não encontrado."));
        repo.delete(d);
    }
}
