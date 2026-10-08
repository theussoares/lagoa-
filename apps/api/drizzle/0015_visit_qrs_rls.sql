-- RLS ligado sem policy pública (como as demais): só a credencial de servidor do Nest lê/escreve.
ALTER TABLE "visit_qrs" ENABLE ROW LEVEL SECURITY;
