package br.edu.ifrs.votacoes.usuario;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import br.edu.ifrs.votacoes.erro.ApiException;

/**
 * Hash e conferência de senhas (BCrypt). Comparações com conta inexistente (ou sem senha) são feitas
 * contra um hash fictício, para que o tempo de resposta não revele quais e-mails estão cadastrados.
 */
@Component
public class Senhas {

    /** Limite do BCrypt: só os primeiros 72 bytes contam (e o Spring Security recusa senhas maiores). */
    static final int MAX_BYTES = 72;

    private final PasswordEncoder encoder;
    private final String hashFicticio;

    public Senhas(PasswordEncoder encoder) {
        this.encoder = encoder;
        this.hashFicticio = encoder.encode(UUID.randomUUID().toString());
    }

    /** Valida a regra da nova senha (8 a 72 caracteres, até 72 bytes) e devolve o hash. */
    public String gerarHash(String senha, String campo) {
        if (senha == null || senha.length() < 8 || senha.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw ApiException.validacao(campo, AuthDtos.MSG_SENHA);
        }
        return encoder.encode(senha);
    }

    /** Confere a senha; com hash nulo compara contra o hash fictício e devolve false. */
    public boolean confere(String senha, String hash) {
        boolean cabe = senha != null && senha.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES;
        if (hash == null || !cabe) {
            encoder.matches("senha-ficticia", hashFicticio);
            return false;
        }
        return encoder.matches(senha, hash);
    }

    public static String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
