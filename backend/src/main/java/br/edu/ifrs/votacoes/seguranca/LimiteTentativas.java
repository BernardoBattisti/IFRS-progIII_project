package br.edu.ifrs.votacoes.seguranca;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import br.edu.ifrs.votacoes.erro.ApiException;

/**
 * Contador em memória de tentativas por chave, em janelas fixas de 1 minuto. Vale por instância do
 * backend (o projeto roda uma só). Chaves usadas:
 * <ul>
 * <li>{@code login:<e-mail>} — {@value #LOGIN_POR_EMAIL} por minuto (todas as tentativas contam);</li>
 * <li>{@code esqueci:<e-mail>} — {@value #ESQUECI_POR_EMAIL} por minuto;</li>
 * <li>{@code <IP> <rota>} para cadastro e redefinição — {@value #POR_IP} por minuto
 * ({@link FiltroLimiteTentativas}).</li>
 * </ul>
 * Limite por e-mail (e não por IP) porque o IP vem de X-Forwarded-For, que o proxy do Next repassa
 * do navegador sem alterar (forjável), e porque numa escola com NAT a turma inteira tem o mesmo IP.
 * <p>
 * Memória: janelas vencidas são expurgadas quando o mapa passa de {@value #EXPURGAR_ACIMA_DE}
 * entradas (no máximo uma varredura por segundo).
 */
@Component
public class LimiteTentativas {

    public static final int LOGIN_POR_EMAIL = 10;
    public static final int ESQUECI_POR_EMAIL = 5;
    public static final int POR_IP = 30;
    public static final Duration JANELA = Duration.ofMinutes(1);
    static final int EXPURGAR_ACIMA_DE = 10_000;

    private record Janela(Instant inicio, int contagem) {
    }

    private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();
    private final Clock clock;
    private volatile Instant ultimoExpurgo = Instant.EPOCH;

    public LimiteTentativas(Clock clock) {
        this.clock = clock;
    }

    /** Registra uma tentativa; devolve false se a chave passou de {@code maximo} na janela atual. */
    public boolean permitir(String chave, int maximo) {
        Instant agora = clock.instant();
        expurgarSePreciso(agora);
        Janela j = janelas.compute(chave, (k, atual) -> (atual == null || expirada(atual, agora))
                ? new Janela(agora, 1)
                : new Janela(atual.inicio(), atual.contagem() + 1));
        return j.contagem() <= maximo;
    }

    /** Como {@link #permitir}, mas lança 429 (MUITAS_TENTATIVAS, Retry-After: 60). */
    public void exigir(String chave, int maximo) {
        if (!permitir(chave, maximo)) {
            throw ApiException.muitasTentativas();
        }
    }

    /** Apaga todos os contadores (usado pelos testes). */
    public void limpar() {
        janelas.clear();
    }

    int tamanho() {
        return janelas.size();
    }

    private void expurgarSePreciso(Instant agora) {
        if (janelas.size() > EXPURGAR_ACIMA_DE && !agora.isBefore(ultimoExpurgo.plusSeconds(1))) {
            ultimoExpurgo = agora;
            janelas.values().removeIf(j -> expirada(j, agora));
        }
    }

    private static boolean expirada(Janela j, Instant agora) {
        return !agora.isBefore(j.inicio().plus(JANELA));
    }
}
