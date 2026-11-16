package br.edu.ifrs.votacoes.turma;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

/** Códigos de entrada de 8 caracteres sem caracteres ambíguos (sem 0/O, 1/I/L). */
@Component
public class GeradorCodigo {

    public static final String ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    public static final int TAMANHO = 8;

    private final SecureRandom random = new SecureRandom();

    public String gerar() {
        StringBuilder sb = new StringBuilder(TAMANHO);
        for (int i = 0; i < TAMANHO; i++) {
            sb.append(ALFABETO.charAt(random.nextInt(ALFABETO.length())));
        }
        return sb.toString();
    }
}
