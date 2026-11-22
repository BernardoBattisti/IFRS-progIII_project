import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";

export function ErroCarregar({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div className="space-y-3">
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
