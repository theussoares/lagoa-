# Termo do lojista: rascunho para revisão jurídica

**Status:** RASCUNHO. Não é texto final e não pode ir para a tela de aceite nem ligar o gate (`MERCHANT_TERMS_REQUIRED=1`) antes da revisão de advogado humano.
**Versão proposta:** `MERCHANT_TERMS_VERSION` = `2026-10-draft` (trocar quando o texto final for aprovado).
**Marcações:** `[LACUNA]` = dado ou decisão que falta. `[REVISÃO JURÍDICA]` = ponto que precisa de parecer de advogado.

---

## 1. Objeto

O Lagoa+ é uma plataforma de fidelidade para o comércio local. Ela permite que o cliente junte carimbos ou pontos em lojas parceiras numa carteira única, e que o lojista lance visitas e resgates pelo Balcão.

## 2. Papel do Lagoa+

2.1. O Lagoa+ fornece a tecnologia do programa de fidelidade. **Não vende produtos nem serviços das lojas**, não é parte nas vendas feitas pelo lojista e não garante disponibilidade, qualidade ou entrega de prêmios.

2.2. Cada prêmio é oferecido e cumprido exclusivamente pelo lojista, conforme o programa que ele definiu.

## 3. Obrigações do lojista

3.1. Manter cadastro verdadeiro (responsável, endereço, dados da loja).

3.2. Gerar o QR da visita **somente no momento de uma venda real** ao cliente presente. É vedado gerar QR para si mesmo, para a própria conta ou para terceiros sem venda.

3.3. Não usar o programa para cobrar, expor ou constranger cliente.

3.4. Cumprir os prêmios anunciados e honrar os resgates validados pelo Balcão.

3.5. Manter o cartaz do QR da loja no balcão, sem alterá-lo.

3.6. **[REVISÃO JURÍDICA]** Responsabilidade por tributos, notas fiscais e relação de consumo com o cliente (CDC) referente ao prêmio.

## 4. Dados pessoais dos clientes (LGPD)

4.1. **Papel dos agentes.** `[REVISÃO JURÍDICA]` O Lagoa+ e o lojista tratam dados do cliente para o mesmo programa. Definir se são **controladores independentes**, **controlador e operador** ou **controladores conjuntos**. Esta é a decisão que muda as demais cláusulas.

4.2. **Finalidade.** Os dados dos clientes tratados pelo lojista servem somente para operar o programa de fidelidade da loja: lançar visitas, validar e entregar prêmios, e mostrar o histórico de visitas e saldo.

4.3. **Minimização.** O lojista vê o celular do cliente **mascarado** (ex.: `(67) 9••••-0374`). Não há acesso a outros dados do cliente além do necessário para o programa.

4.4. **Proibições.** É vedado ao lojista: exportar, copiar ou guardar listas de clientes fora do painel; usar os dados para outras campanhas, mensagens ou finalidades; compartilhar com terceiros; tentar identificar o cliente por outros meios.

4.5. **Avisos e campanhas.** Mensagens fora do uso do cartão (campanhas, lembretes) só chegam a quem deu consentimento explícito e revogável. Sem consentimento, não há campanha. `[REVISÃO JURÍDICA]` Redação do consentimento e do texto de revogação.

4.6. **Segurança.** O lojista adota medidas proporcionais (acesso restrito à conta do dono, sem compartilhar login) e comunica incidentes ao Lagoa+ em até `[LACUNA: prazo, sugestão 24 h]`.

4.7. **Direitos do titular.** Pedidos de acesso, correção, anonimização ou eliminação são encaminhados ao Lagoa+ pelo canal `[LACUNA: canal de atendimento]`. `[REVISÃO JURÍDICA]` Prazo de resposta (LGPD: 15 dias, art. 19, para o acesso simplificado).

4.8. **Encarregado (DPO).** `[LACUNA: nome e contato do encarregado do Lagoa+]`. Obrigatório pela LGPD (art. 41).

4.9. **Término.** Ao encerrar a relação, o lojista deixa de usar os dados e os devolve ou elimina, salvo obrigação legal de guarda.

## 5. Regras antifraude e de uso dos QRs

5.1. O QR da visita é de uso único, com validade de 5 minutos. A recusa de validação não consome o QR.

5.2. No máximo uma visita que rende por cliente e loja a cada janela configurada pela loja (ex.: 4 h ou 1 dia).

5.3. Pelo mesmo QR, o próprio emissor e o dono da loja não ganham pontos.

5.4. A rede pode cancelar ou recusar lançamentos com indício de fraude, com comunicação ao lojista.

## 6. Plano, preço e cobrança

6.1. A loja escolhe um plano. `[LACUNA: confirmar nomes, preços e condições]`:
- Fundador: R$ 79,90/mês (preço de tabela R$ 119,90). Para as 10 primeiras lojas, com preço travado e sem fidelidade.
- Fundador Pro: R$ 89,90/mês (tabela R$ 249,90). Inclui clientes sumidos, campanhas e destaque no Descobrir.

6.2. `[REVISÃO JURÍDICA]` Forma de cobrança, reajuste, inadimplência e cancelamento. Confirmar se o plano Fundador é realmente "sem fidelidade" e como isso aparece no contrato.

6.3. A loja pode mudar de plano ou cancelar `[LACUNA: prazo e efeitos do cancelamento]`.

## 7. Aprovação, suspensão e cancelamento da loja

7.1. A loja só fica ativa no Descobrir e recebe clientes após aprovação do admin da rede.

7.2. A rede pode suspender a loja por descumprimento deste termo, por inadimplência ou por indício de fraude, com aviso `[LACUNA: prazo de aviso prévio]`.

7.3. Loja suspensa só consulta os próprios dados. Não emite QR nem valida resgates.

## 8. Alterações deste termo

8.1. Mudanças de texto geram nova versão. O lojista aceita a nova versão para continuar emitindo QR e validando resgates.

8.2. `[REVISÃO JURÍDICA]` Prazo de comunicação antes de a mudança valer.

## 9. Disposições gerais

9.1. `[REVISÃO JURÍDICA]` Foro. Sugestão de base: comarca de Três Lagoas/MS.

9.2. Aceite. O lojista aceita este termo ao criar o clube e a cada nova versão. O aceite fica registrado com a versão e a data (campos `merchant_terms_version` e `merchant_terms_accepted_at`).

---

## Pontos para a advogada ou o advogado (resumo)

| # | Ponto | Por quê |
|---|---|---|
| 1 | Papel LGPD: controladores independentes, operador ou conjuntos (4.1) | Define quase todas as outras cláusulas de dados |
| 2 | Consentimento para campanhas e lembretes (4.5) | Sem consentimento válido, a M5 não pode ir ao ar |
| 3 | Plano Fundador "sem fidelidade" e cobrança (6.2) | Afirmação comercial que precisa bater com o contrato |
| 4 | Responsabilidade pelo prêmio e CDC (3.6, 2.2) | Limita a responsabilidade do Lagoa+ |
| 5 | Prazos: incidente, direitos do titular, cancelamento (4.6, 4.7, 6.3, 7.2) | Valores em aberto |
| 6 | Foro e versão do termo (8.2, 9.1) | Decisão jurídica |
