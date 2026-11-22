package br.edu.ifrs.votacoes.seguranca;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import br.edu.ifrs.votacoes.config.AppProperties;

/**
 * Emite e valida o JWT (HS256, segredo APP_JWT_SECRET) guardado no cookie de sessão.
 * Usa o relógio do sistema (e não o Clock injetável das votações) para a validade do token.
 */
@Service
public class JwtService {

    private static final String EMISSOR = "votacoes-ifrs";

    private final byte[] segredo;
    private final AppProperties props;
    private final Clock relogio = Clock.systemUTC();

    public JwtService(AppProperties props) {
        this.props = props;
        this.segredo = props.jwtSecret().getBytes(StandardCharsets.UTF_8);
    }

    public String emitir(Long usuarioId) {
        Instant agora = relogio.instant();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(EMISSOR)
                .subject(usuarioId.toString())
                .issueTime(Date.from(agora))
                .expirationTime(Date.from(agora.plus(props.jwtValidade())))
                .jwtID(UUID.randomUUID().toString())
                .build();
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(segredo));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Falha ao assinar o token de sessão", e);
        }
    }

    /** Devolve o id do usuário se o token for válido (assinatura, emissor e validade). */
    public Optional<Long> validar(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!JWSAlgorithm.HS256.equals(jwt.getHeader().getAlgorithm())
                    || !jwt.verify(new MACVerifier(segredo))) {
                return Optional.empty();
            }
            JWTClaimsSet c = jwt.getJWTClaimsSet();
            if (!EMISSOR.equals(c.getIssuer()) || c.getExpirationTime() == null
                    || !c.getExpirationTime().toInstant().isAfter(relogio.instant())) {
                return Optional.empty();
            }
            return Optional.of(Long.valueOf(c.getSubject()));
        } catch (ParseException | JOSEException | NumberFormatException e) {
            return Optional.empty();
        }
    }
}
