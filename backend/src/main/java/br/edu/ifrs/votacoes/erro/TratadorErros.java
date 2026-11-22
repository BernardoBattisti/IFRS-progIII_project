package br.edu.ifrs.votacoes.erro;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class TratadorErros {

    private static final Logger log = LoggerFactory.getLogger(TratadorErros.class);

    public static ResponseEntity<ErroResposta> resposta(HttpStatus status, String erro, String mensagem,
            Map<String, String> campos) {
        return ResponseEntity.status(status).body(new ErroResposta(status.value(), erro, mensagem, campos));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErroResposta> api(ApiException e) {
        if (e.getStatus() == HttpStatus.TOO_MANY_REQUESTS) {
            return ResponseEntity.status(e.getStatus()).header("Retry-After", "60")
                    .body(new ErroResposta(e.getStatus().value(), e.getErro(), e.getMessage(), null));
        }
        return resposta(e.getStatus(), e.getErro(), e.getMessage(), e.getCampos());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResposta> validacao(MethodArgumentNotValidException e) {
        Map<String, String> campos = new LinkedHashMap<>();
        for (FieldError fe : e.getBindingResult().getFieldErrors()) {
            campos.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        e.getBindingResult().getGlobalErrors()
                .forEach(ge -> campos.putIfAbsent(ge.getObjectName(), ge.getDefaultMessage()));
        return resposta(HttpStatus.BAD_REQUEST, "VALIDACAO", "Dados inválidos.", campos);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErroResposta> validacaoMetodo(HandlerMethodValidationException e) {
        return resposta(HttpStatus.BAD_REQUEST, "VALIDACAO", "Dados inválidos.", null);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroResposta> jsonInvalido(HttpMessageNotReadableException e) {
        return resposta(HttpStatus.BAD_REQUEST, "VALIDACAO",
                "Corpo da requisição inválido ou mal formatado.", null);
    }

    @ExceptionHandler({ MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class })
    public ResponseEntity<ErroResposta> parametroInvalido(Exception e) {
        return resposta(HttpStatus.BAD_REQUEST, "VALIDACAO", "Parâmetro inválido na requisição.", null);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErroResposta> arquivoGrande(MaxUploadSizeExceededException e) {
        return resposta(HttpStatus.BAD_REQUEST, "VALIDACAO", "Arquivo inválido.",
                Map.of("arquivo", "o arquivo excede o limite de 5 MB"));
    }

    @ExceptionHandler({ MissingServletRequestPartException.class, MultipartException.class })
    public ResponseEntity<ErroResposta> multipart(Exception e) {
        return resposta(HttpStatus.BAD_REQUEST, "VALIDACAO", "Arquivo inválido.",
                Map.of("arquivo", "obrigatório"));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErroResposta> tipoNaoSuportado(HttpMediaTypeNotSupportedException e) {
        return resposta(HttpStatus.BAD_REQUEST, "VALIDACAO", "Tipo de conteúdo não suportado.", null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErroResposta> acessoNegado(AccessDeniedException e) {
        return resposta(HttpStatus.FORBIDDEN, "SEM_PERMISSAO", "Você não tem permissão para esta ação.", null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErroResposta> naoEncontrado(NoResourceFoundException e) {
        return resposta(HttpStatus.NOT_FOUND, "NAO_ENCONTRADO", "Recurso não encontrado.", null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErroResposta> metodo(HttpRequestMethodNotSupportedException e) {
        return resposta(HttpStatus.METHOD_NOT_ALLOWED, "METODO_NAO_PERMITIDO",
                "Método HTTP não permitido para esta rota.", null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroResposta> integridade(DataIntegrityViolationException e) {
        log.warn("Violação de integridade: {}", e.getMostSpecificCause().getMessage());
        return resposta(HttpStatus.CONFLICT, "CONFLITO",
                "A operação conflita com dados existentes.", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErroResposta> inesperado(Exception e) {
        log.error("Erro inesperado", e);
        return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "ERRO_INTERNO",
                "Erro interno no servidor.", null);
    }
}
