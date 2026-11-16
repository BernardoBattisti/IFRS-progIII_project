package br.edu.ifrs.votacoes.usuario;

/** Login recusado (ex.: domínio de e-mail não aceito). */
public class LoginNegadoException extends RuntimeException {

    private final String codigo;

    public LoginNegadoException(String codigo, String mensagem) {
        super(mensagem);
        this.codigo = codigo;
    }

    public String getCodigo() {
        return codigo;
    }
}
