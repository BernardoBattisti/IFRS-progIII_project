import type { Metadata } from "next";
import { Protegido } from "@/components/Sessao";
import { TelaSimples } from "@/components/TelaSimples";
import { Alert } from "@/components/ui/Alert";
import styles from "@/components/FormPublico.module.css";

export const metadata: Metadata = { title: "Acesso não aprovado" };

export default function Page() {
  return (
    <Protegido status="REJEITADO">
      <TelaSimples titulo="Acesso não aprovado">
        <Alert tom="erro" titulo="Seu cadastro como docente foi recusado">
          <p>Um administrador recusou o pedido de acesso desta conta. Por isso, ela não pode usar o sistema.</p>
        </Alert>
        <p className={styles.texto}>
          Se você acha que isso é um engano, procure a coordenação do sistema no seu campus.
        </p>
      </TelaSimples>
    </Protegido>
  );
}
