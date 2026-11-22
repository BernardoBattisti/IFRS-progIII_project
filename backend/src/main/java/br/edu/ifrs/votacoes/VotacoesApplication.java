package br.edu.ifrs.votacoes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

// Sem usuário em memória gerado pelo Spring Boot: as contas ficam no banco (AutenticacaoService).
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class VotacoesApplication {

    public static void main(String[] args) {
        SpringApplication.run(VotacoesApplication.class, args);
    }
}
