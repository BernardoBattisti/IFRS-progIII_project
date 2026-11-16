package br.edu.ifrs.votacoes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class VotacoesApplication {

    public static void main(String[] args) {
        SpringApplication.run(VotacoesApplication.class, args);
    }
}
