import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import styles from "./ErroCarregar.module.css";

export function ErroCarregar({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div className={styles.erro}>
      <Alert tom="erro" titulo="Não foi possível carregar" anunciar>
        <p>{mensagem}</p>
      </Alert>
      {aoTentar && (
        <Button variante="secondary" onClick={aoTentar}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
