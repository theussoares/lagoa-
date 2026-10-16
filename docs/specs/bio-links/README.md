# Link da bio (`/links`, apps/site)

Tela única para o tráfego do Instagram. Dois públicos, duas ações principais acima da dobra no celular (375×812):

| Ordem | Link | Destino | Evento (`bio_link_click`, `link=`) |
| --- | --- | --- | --- |
| 1 | Quero ser loja parceira (sol, lojista) | LP `/` (apresentação comercial; cadastro é pelo Balcão) | `partner` |
| 2 | Acessar minha carteira (tinta, cliente) | `app.` `/carteira` direto; sem sessão, o middleware leva ao login e volta | `wallet` |
| 3 | Falar com nossa equipe | WhatsApp da rede (número e mensagem inalterados) | `whatsapp` |
| 4 | Entenda como funciona | `/guia` (lojistas) + 2 posts mais novos do blog | `guide`, `post-<slug>` |
| rodapé | Já sou parceiro: entrar no Balcão | `balcao/entrar` | — (só UTM) |

## Métricas

- Já existia só o Vercel Analytics (`plugins/vercel-analytics.client.ts`): visitas e UTM. Não há GTM/GA.
- Cada destino próprio recebe `utm_source=instagram&utm_medium=bio&utm_campaign=<link>` (`utils/bioUrl.ts`). WhatsApp não aceita UTM.
- Novo: `composables/useBioTracking.ts` envia `track('bio_link_click', { link })` do mesmo pacote já instalado. Eventos personalizados exigem plano Pro do Vercel Analytics; sem ele a chamada é inofensiva.
- Clique não é conversão final. Para medir o que importa, cruzar por `utm_campaign`: lojas criadas (`signUp` concluído no Balcão) e clientes com primeira visita/carimbo vindos de `wallet`. Falta propagar o UTM até o cadastro (hoje se perde ao sair do `/` da LP); é a próxima etapa recomendada.

## Fora desta etapa (sem destino válido hoje)

- **Encontrar lojas participantes:** `/descobrir` existe, mas exige login (`customer-auth`); não há lista pública. Para entrar na bio, criar uma página pública de lojas aprovadas.
- **Como funciona para consumidores?** Não há conteúdo para o cliente (guia e blog são para lojistas).
- **Instagram do Lagoa+:** a URL do perfil não está no repositório. Informar para adicionar.
