# Limitações conhecidas — Frontend Intraday V2

## Fluxo de Feedbacks

### FeedbackMgr — formato de dados esperado vs. API atual
O componente `FeedbackMgr.jsx` (visão gerencial de bonificação) foi implementado esperando que cada snapshot do bundle semanal tenha a seguinte estrutura:

```json
{
  "identity": { "store_id": "...", "store_name": "...", "person_id": "...", "name": "...", "role": "...", "shift_id": "..." },
  "summary":  { "bonus_final": 0, "discounts_total": 0, "max_possible_total": 0 },
  "prerequisites": { "store": [...], "individual": [...], "component": [...] }
}
```

Porém a API atual (`/api/intraday/performance/feedback`) retorna snapshots com campos planos:
```json
{ "store_code": "...", "nome": "...", "valor_final_bonus": 0, "taxa_separacao_loja": 0, ... }
```

**Impacto:** O `FeedbackMgr` (visão gerencial) ficará vazio quando o bundle for carregado. O `PerformanceFeedbackPage` (visão individual) funciona normalmente pois usa o formato plano.

**Como corrigir:** O backend deve adaptar o endpoint `/api/intraday/performance/feedback` para incluir a chave `snapshots` com os dados no formato hierárquico acima, em paralelo à chave `snaps` existente.

---

## Tela Intraday — Gerencial

### `fromCache` não exibido
O front recebe `fromCache: true/false` da API mas não exibe esse estado ao usuário. Comportamento intencional na refatoração do design — pode ser reintroduzido adicionando um chip de aviso na datebar.

---

## Tela Supervisor (Loja)

### Tempos médios por tipo de pedido
A tabela "Por tipo de pedido" exibe colunas `T. Iniciar`, `T. Picking`, `T. Packing` e `T. Ciclo`. Esses campos (`avg_iniciar_min`, `avg_picking_min`, `avg_packing_min`, `avg_cycle_min`) chegam via `/api/intraday/loja/:loja` — se o backend não os retornar, aparecerão como `—`.

---

## Feedbacks — PerformanceFeedbackPage

### Drill por personId ainda não implementado
`FeedbacksPage` passa `initialPersonId` e `initialWeekId` para `PerformanceFeedbackPage` ao clicar em "Feedback completo" no `FeedbackMgr`. Contudo, `PerformanceFeedbackPage` ainda não usa esses props para pré-selecionar a pessoa — o usuário precisará selecionar manualmente. Para implementar: adicionar um `useEffect` em `PerformanceFeedbackPage` que, quando `initialPersonId` mudar, atualize o estado interno `selectedPerson`.

### Erros registrados — sem dados reais
A tabela `ErrosTable` ("Erros registrados") é renderizada mas pode aparecer vazia se `bundle.erros_por_pessoa` não for retornado pela API. O front espera a estrutura: `bundle.erros_por_pessoa["{store_code}|{nome}"] = [{data, pedido, produto, considerar, grave, responsabilidade, erro, link}]`.

---

## Hub / Navegação

### PerformanceDarkstore desconectada
A página `PerformanceDarkstore.jsx` existe no código mas não está acessível pela nova navegação (hub com apenas Intraday e Feedbacks). Pode ser reconectada adicionando um terceiro tile ao hub ou como aba dentro da seção de Feedbacks quando necessário.

### Lógica de crachá/role não implementada
O hub sempre mostra a visão gerencial de feedbacks (viewerRole="admin") independente do usuário logado. Quando a lógica de crachá for implementada, o `FeedbacksPage` deve receber o role do usuário e passar para `FeedbackManagerView` — e eventualmente redirecionar para a visão individual se o role for "operador".
