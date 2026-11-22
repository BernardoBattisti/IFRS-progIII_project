package br.edu.ifrs.votacoes.arquivo;

import java.util.Arrays;
import java.util.Optional;

/** Tipos de imagem aceitos, identificados pelos primeiros bytes do arquivo (magic bytes). */
public enum TipoImagem {
    JPEG("jpg", "image/jpeg"),
    PNG("png", "image/png"),
    WEBP("webp", "image/webp");

    private final String extensao;
    private final String mime;

    TipoImagem(String extensao, String mime) {
        this.extensao = extensao;
        this.mime = mime;
    }

    public String extensao() {
        return extensao;
    }

    public String mime() {
        return mime;
    }

    public static Optional<TipoImagem> detectar(byte[] b) {
        if (b == null) {
            return Optional.empty();
        }
        if (comeca(b, 0, 0xFF, 0xD8, 0xFF)) {
            return Optional.of(JPEG);
        }
        if (comeca(b, 0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return Optional.of(PNG);
        }
        if (comeca(b, 0, 'R', 'I', 'F', 'F') && comeca(b, 8, 'W', 'E', 'B', 'P')) {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    public static Optional<TipoImagem> porExtensao(String ext) {
        return Arrays.stream(values()).filter(t -> t.extensao.equals(ext)).findFirst();
    }

    private static boolean comeca(byte[] b, int desloc, int... esperado) {
        if (b.length < desloc + esperado.length) {
            return false;
        }
        for (int i = 0; i < esperado.length; i++) {
            if ((b[desloc + i] & 0xFF) != esperado[i]) {
                return false;
            }
        }
        return true;
    }
}
