import type { Metadata } from "next";
import { Protegido } from "@/components/Sessao";
import { TelaSimples } from "@/components/TelaSimples";
import { Alert } from "@/components/ui/Alert";
import { BotaoVerificar } from "./BotaoVerificar";
import styles from "@/components/FormPublico.module.css";

export const metadata: Metadata = { title: "Aguardando aprovação" };

export default function Page() {
  return (
    <Protegido status="PENDENTE_APROVACAO">
      <TelaSimples titulo="Seu acesso está em análise">
        <Alert tom="aviso" titulo="Aguardando aprovação de um administrador">
          <p>
            Recebemos seu cadastro como docente. Assim que um administrador aprovar, você poderá criar turmas e
            votações.
          </p>
        </Alert>
        <p className={styles.texto}>Você não precisa fazer mais nada. Volte mais tarde ou verifique agora.</p>
        <BotaoVerificar />
      </TelaSimples>
    </Protegido>
  );
}
