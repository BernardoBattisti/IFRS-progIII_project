package br.edu.ifrs.votacoes.erro;

import java.util.Map;

import org.springframework.http.HttpStatus;

/** Exceção de negócio convertida no JSON de erro padrão (seção 5 da especificação). */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String erro;
    private final Map<String, String> campos;

    public ApiException(HttpStatus status, String erro, String mensagem, Map<String, String> campos) {
        super(mensagem);
        this.status = status;
        this.erro = erro;
        this.campos = campos;
    }

    public static ApiException validacao(String mensagem, Map<String, String> campos) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDACAO", mensagem, campos);
    }

    public static ApiException validacao(String campo, String problema) {
        return validacao("Dados inválidos.", Map.of(campo, problema));
    }

    public static ApiException semPermissao(String mensagem) {
        return new ApiException(HttpStatus.FORBIDDEN, "SEM_PERMISSAO", mensagem, null);
    }

    public static ApiException naoEncontrado(String mensagem) {
        return new ApiException(HttpStatus.NOT_FOUND, "NAO_ENCONTRADO", mensagem, null);
    }

    public static ApiException conflito(String mensagem) {
        return new ApiException(HttpStatus.CONFLICT, "CONFLITO", mensagem, null);
    }

    public static ApiException regraNegocio(String mensagem) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REGRA_NEGOCIO", mensagem, null);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErro() {
        return erro;
    }

    public Map<String, String> getCampos() {
        return campos;
    }
}
