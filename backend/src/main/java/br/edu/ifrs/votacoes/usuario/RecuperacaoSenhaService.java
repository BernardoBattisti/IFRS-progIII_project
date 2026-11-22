package br.edu.ifrs.votacoes.usuario;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.seguranca.LimiteTentativas;

/**
 * "Esqueci minha senha" (seção 2.4): token aleatório de 32 bytes (base64url), guardado só como hash
 * SHA-256, válido por 1 hora e uma única vez. Um novo pedido invalida os tokens anteriores.
 */
@Service
public class RecuperacaoSenhaService {

    static final Duration VALIDADE = Duration.ofHours(1);
    static final String MSG_TOKEN_INVALIDO = "Este link de redefinição é inválido ou expirou.";

    /** Dados para o e-mail, devolvidos só quando a conta existe e pode recuperar a senha. */
    public record Pedido(Long usuarioId, String email, String nome, String token) {
    }

    private final UsuarioRepository usuarios;
    private final TokenRedefinicaoRepository tokens;
    private final Senhas senhas;
    private final LimiteTentativas limite;
    private final Clock clock;
    private final SecureRandom aleatorio = new SecureRandom();

    public RecuperacaoSenhaService(UsuarioRepository usuarios, TokenRedefinicaoRepository tokens, Senhas senhas,
            LimiteTentativas limite, Clock clock) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.senhas = senhas;
        this.limite = limite;
        this.clock = clock;
    }

    /** Gera um token para a conta (se existir e não for o admin). Vazio caso contrário. */
    @Transactional
    public Optional<Pedido> solicitar(String emailBruto) {
        String email = Senhas.normalizarEmail(emailBruto);
        // Por e-mail (exista ou não a conta): impede encher a caixa de alguém de e-mails.
        limite.exigir("esqueci:" + email, LimiteTentativas.ESQUECI_POR_EMAIL);
        Instant agora = clock.instant();
        tokens.apagarExpiradosAntesDe(agora.minus(Duration.ofDays(1)));
        Optional<Usuario> conta = usuarios.findByEmail(email);
        if (conta.isEmpty() || conta.get().isAdmin()) {
            return Optional.empty();
        }
        Usuario u = conta.get();
        tokens.invalidarDoUsuario(u.getId(), agora);
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.save(new TokenRedefinicao(usuarios.getReferenceById(u.getId()), hash(token), agora,
                agora.plus(VALIDADE)));
        return Optional.of(new Pedido(u.getId(), u.getEmail(), u.getNome(), token));
    }

    @Transactional
    public void redefinir(String token, String novaSenha) {
        String novoHash = senhas.gerarHash(novaSenha, "novaSenha");
        Instant agora = clock.instant();
        TokenRedefinicao t = tokens.buscarParaUso(hash(token))
                .filter(x -> x.valido(agora))
                .orElseThrow(() -> ApiException.regraNegocio(MSG_TOKEN_INVALIDO));
        Usuario u = t.getUsuario();
        if (u.isAdmin()) {
            throw ApiException.regraNegocio(MSG_TOKEN_INVALIDO);
        }
        u.setSenhaHash(novoHash);
        t.marcarUsado(agora);
        tokens.invalidarDoUsuario(u.getId(), agora);
    }

    static String hash(String token) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
