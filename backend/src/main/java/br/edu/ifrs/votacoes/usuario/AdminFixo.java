package br.edu.ifrs.votacoes.usuario;

import java.time.Clock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Conta fixa de administrador (seção 2.3): {@code adm@gmail.com} / {@code admin}. Criada na
 * inicialização, antes de o servidor aceitar requisições, se ainda não existir. Uma conta já
 * existente nunca é sobrescrita; a única exceção é um admin sem senha (vindo da época do login
 * Google), que recebe a senha padrão porque não teria outro jeito de entrar.
 */
@Component
public class AdminFixo implements InitializingBean {

    public static final String EMAIL = "adm@gmail.com";
    static final String SENHA_PADRAO = "admin";

    private static final Logger log = LoggerFactory.getLogger(AdminFixo.class);

    private final UsuarioRepository repo;
    private final TransactionTemplate tx;
    private final Clock clock;
    private final String hashPadrao;

    public AdminFixo(UsuarioRepository repo, TransactionTemplate tx, Clock clock, PasswordEncoder encoder) {
        this.repo = repo;
        this.tx = tx;
        this.clock = clock;
        this.hashPadrao = encoder.encode(SENHA_PADRAO);
    }

    @Override
    public void afterPropertiesSet() {
        garantir();
    }

    /** Cria o admin se não existir (idempotente). */
    public void garantir() {
        try {
            tx.executeWithoutResult(s -> {
                var existente = repo.findByEmail(EMAIL);
                if (existente.isEmpty()) {
                    repo.saveAndFlush(new Usuario(EMAIL, "Administrador", null, Papel.ADMIN, StatusConta.ATIVO,
                            hashPadrao, clock.instant()));
                    log.info("Conta de administrador {} criada com a senha padrão.", EMAIL);
                    return;
                }
                Usuario u = existente.get();
                if (!u.isAdmin()) {
                    log.error("O e-mail {} pertence a uma conta que não é de administrador; nada foi alterado.", EMAIL);
                } else if (u.getSenhaHash() == null) {
                    u.setSenhaHash(hashPadrao);
                    log.warn("Conta de administrador {} estava sem senha; senha padrão definida.", EMAIL);
                }
            });
        } catch (DataIntegrityViolationException e) {
            // Outra instância criou a conta ao mesmo tempo.
            log.info("Conta de administrador {} já foi criada por outra instância.", EMAIL);
        }
    }
}
