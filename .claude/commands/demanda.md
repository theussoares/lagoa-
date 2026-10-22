---
description: Roda uma demanda pelo fluxo oficial da equipe de agentes (triagem do tech lead → papéis necessários).
argument-hint: <descrição da demanda>
---

Demanda: $ARGUMENTS

Siga o fluxo oficial da equipe (veja `EQUIPE.md`). Cada passo é um subagente
(Agent tool com `subagent_type`), para aparecer no escritório 3D
(`tools/office`, preview `lagoa-office`).

1. **Triagem:** chame `tech-lead` com a demanda. Ele devolve Tamanho, Fluxo e Riscos.
2. **Execute exatamente o Fluxo** que ele devolveu, na ordem. Briefing completo
   para cada agente (ele não vê esta conversa): demanda, saída do passo anterior,
   arquivos, critérios de aceite, o que não tocar.
3. Passos independentes (ex.: vários devs, ou `seguranca` + `infra`) rodam em
   paralelo numa mesma mensagem.
4. `seguranca` com `BLOQUEIA` → volta ao dev responsável com o achado; não
   avance.
5. Não suba papel além do que o Tamanho pede (P não passa por PO/arquiteto/CTO).
6. No fim, resuma em poucas linhas: o que mudou, quem participou, pendências.
