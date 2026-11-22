-- Revisão de segurança: garantias no banco que não dependem só do serviço.

-- (a) A opção de um voto pertence à mesma votação do voto (FK composta).
ALTER TABLE opcao ADD CONSTRAINT uq_opcao_id_votacao UNIQUE (id, votacao_id);
ALTER TABLE voto ADD CONSTRAINT fk_voto_opcao_da_votacao
    FOREIGN KEY (opcao_id, votacao_id) REFERENCES opcao (id, votacao_id) ON DELETE CASCADE;

-- (b) Nenhum aluno usa mais que votos_por_aluno e nenhum voto isolado excede esse limite.
--     CHECK não pode consultar outra tabela, então a regra é imposta por triggers.
CREATE FUNCTION fn_limite_votos_por_aluno() RETURNS trigger AS $$
DECLARE
    limite INTEGER;
    valor  INTEGER;
BEGIN
    SELECT votos_por_aluno INTO limite FROM votacao WHERE id = NEW.votacao_id;
    IF TG_TABLE_NAME = 'participacao' THEN
        valor := NEW.votos_usados;
    ELSE
        valor := NEW.quantidade;
    END IF;
    IF valor > limite THEN
        RAISE EXCEPTION 'limite de % votos por aluno excedido (%)', limite, valor
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_participacao_limite BEFORE INSERT OR UPDATE ON participacao
    FOR EACH ROW EXECUTE FUNCTION fn_limite_votos_por_aluno();
CREATE TRIGGER tg_voto_limite BEFORE INSERT OR UPDATE ON voto
    FOR EACH ROW EXECUTE FUNCTION fn_limite_votos_por_aluno();
