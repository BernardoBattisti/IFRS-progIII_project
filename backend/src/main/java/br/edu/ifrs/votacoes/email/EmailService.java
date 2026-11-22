package br.edu.ifrs.votacoes.email;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import br.edu.ifrs.votacoes.config.AppProperties;
import jakarta.annotation.PreDestroy;

/**
 * Envio dos e-mails do sistema. O envio é feito em segundo plano: a resposta HTTP não espera o
 * servidor SMTP (o tempo de resposta de "esqueci minha senha" não revela se a conta existe) e uma
 * falha de envio só é registrada em log. O token e o link nunca vão para o log.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final AppProperties props;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "envio-email");
        t.setDaemon(true);
        return t;
    });

    public EmailService(JavaMailSender mailSender, AppProperties props) {
        this.mailSender = mailSender;
        this.props = props;
    }

    /** Envia o link de redefinição de senha ({@code APP_BASE_URL/redefinir-senha?token=...}). */
    public void enviarRedefinicaoSenha(Long usuarioId, String email, String nome, String token) {
        String link = props.baseUrl() + "/redefinir-senha?token=" + token;
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(props.mailFrom());
        msg.setTo(email);
        msg.setSubject("Redefinição de senha - Sistema de Votações Escolares");
        msg.setText("""
                Olá, %s.

                Recebemos um pedido para redefinir a senha da sua conta no Sistema de Votações Escolares.
                Para criar uma nova senha, acesse o link abaixo. Ele vale por 1 hora e pode ser usado uma única vez:

                %s

                Se você não pediu a redefinição, ignore este e-mail: sua senha continua a mesma.
                """.formatted(nome, link));
        executor.execute(() -> {
            try {
                mailSender.send(msg);
            } catch (RuntimeException e) {
                // Só a causa raiz (ex.: conexão recusada, resposta do SMTP); nunca o corpo nem o link.
                Throwable causa = NestedExceptionUtils.getMostSpecificCause(e);
                log.warn("Falha ao enviar e-mail de redefinição de senha (usuário id={}): {}: {}", usuarioId,
                        causa.getClass().getSimpleName(), causa.getMessage());
            }
        });
    }

    @PreDestroy
    void encerrar() {
        executor.shutdown();
    }
}
