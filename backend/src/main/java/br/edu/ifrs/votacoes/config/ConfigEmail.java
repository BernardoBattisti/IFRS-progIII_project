package br.edu.ifrs.votacoes.config;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * Ajuste do JavaMailSender criado pelo Spring Boot a partir de MAIL_*: liga a autenticação SMTP
 * somente quando MAIL_USERNAME foi preenchido (o Mailpit do Compose não usa autenticação).
 */
@Configuration
public class ConfigEmail {

    @Bean
    public static BeanPostProcessor autenticacaoSmtpQuandoHouverUsuario() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String nome) {
                if (bean instanceof JavaMailSenderImpl sender) {
                    boolean temUsuario = sender.getUsername() != null && !sender.getUsername().isBlank();
                    sender.getJavaMailProperties().setProperty("mail.smtp.auth", Boolean.toString(temUsuario));
                }
                return bean;
            }
        };
    }
}
