package br.edu.ifrs.votacoes.votacao;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

import br.edu.ifrs.votacoes.config.AppProperties;

/** HMAC-SHA256(APP_JWT_SECRET, "votacao:aluno:opcao") para a tabela de guarda de anonimato. */
@Component
public class GuardaHmac {

    private final SecretKeySpec chave;

    public GuardaHmac(AppProperties props) {
        this.chave = new SecretKeySpec(props.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public String calcular(Long votacaoId, Long alunoId, Long opcaoId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(chave);
            byte[] h = mac.doFinal((votacaoId + ":" + alunoId + ":" + opcaoId).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC indisponível", e);
        }
    }
}
