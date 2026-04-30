// Diagnóstico por Jornada do Cliente — 7 etapas.
// Recebe o mapa de respostas do funil e retorna o status de cada etapa.

import { classifyConversion, computeConversion } from "./conversion";

export type JourneyStage =
  | "ve_loja"
  | "entra_loja"
  | "clica_produto"
  | "adiciona_carrinho"
  | "compra"
  | "recebe"
  | "recompra";

export interface JourneyItem {
  stage: JourneyStage;
  title: string;
  status: "ok" | "atencao" | "critico";
  bottleneck: string;
  evidence: string;
  cause: string;
  impact: string;
  solution: string;
}

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};
const yes = (v: any) => v === true || v === "sim" || v === "yes";

export function buildJourney(answers: Record<string, Record<string, any>>): JourneyItem[] {
  const basic = answers.basic || {};
  const front = answers.storefront || {};
  const menu = answers.menu || {};
  const products: any[] = answers.products?.items || [];
  const reviews = answers.reviews || {};
  const delivery = answers.delivery || {};
  const loyalty = answers.loyalty || {};
  const conversion = answers.conversion || {};

  const rating = num(front.rating) ?? num(reviews.avg_rating);
  const reviewsCount = num(front.reviews_count);
  const promised = num(front.promised_delivery_time) ?? num(delivery.promised_time);

  const visits = num(conversion.visits);
  const clicks = num(conversion.clicks);
  const orders = num(conversion.orders);
  const convRate = num(conversion.conversion_rate) ?? computeConversion(visits, orders);
  const convLevel = classifyConversion(convRate);

  // 1. Vê a loja
  const veStatus: JourneyItem["status"] =
    (rating != null && rating < 4.3) || (reviewsCount != null && reviewsCount < 150) || (promised != null && promised > 35)
      ? rating != null && rating < 4 ? "critico" : "atencao"
      : "ok";

  // 2. Entra na loja
  const entraStatus: JourneyItem["status"] =
    front.has_cover === false || front.has_logo === false || front.looks_professional === "ruim"
      ? "critico"
      : front.looks_professional === "atencao" ? "atencao" : "ok";

  // 3. Clica em produto
  const noPhotoMenu = num(menu.without_photo) ?? 0;
  const totalMenu = num(menu.products_total) ?? products.length;
  const noPhotoPct = totalMenu ? noPhotoMenu / totalMenu : 0;
  const clicaStatus: JourneyItem["status"] =
    noPhotoPct > 0.3 ? "critico" : noPhotoPct > 0.15 ? "atencao" : "ok";

  // 4. Adiciona ao carrinho — descrição + nome
  const noDesc = num(menu.without_description) ?? 0;
  const noDescPct = totalMenu ? noDesc / totalMenu : 0;
  const adicionaStatus: JourneyItem["status"] =
    noDescPct > 0.3 ? "critico" : noDescPct > 0.15 ? "atencao" : "ok";

  // 5. Compra (conversão)
  const compraStatus: JourneyItem["status"] =
    convLevel === "critico" ? "critico" : convLevel === "atencao" ? "atencao" : "ok";

  // 6. Recebe
  const recebeStatus: JourneyItem["status"] =
    yes(reviews.complaint_late) || yes(reviews.complaint_cold) || yes(reviews.complaint_wrong) || yes(delivery.frequent_delays)
      ? "critico"
      : !yes(delivery.food_arrives_hot) ? "atencao" : "ok";

  // 7. Recompra
  const semRecompra = !yes(loyalty.rebuy_strategy) && !yes(loyalty.next_purchase_coupon) && !yes(loyalty.loyalty_card);
  const recompraStatus: JourneyItem["status"] = semRecompra ? "critico" : "atencao";

  return [
    {
      stage: "ve_loja",
      title: "1. Cliente vê a loja na busca",
      status: veStatus,
      bottleneck: veStatus === "ok" ? "Boa visibilidade" :
        rating != null && rating < 4.3 ? `Nota ${rating} reduz ranking` :
        reviewsCount != null && reviewsCount < 150 ? `Apenas ${reviewsCount} avaliações — pouco volume aparente` :
        `Tempo de entrega prometido alto (${promised} min)`,
      evidence: `Nota: ${rating ?? "—"} · Avaliações: ${reviewsCount ?? "—"} · Tempo: ${promised ?? "—"} min`,
      cause: "Algoritmo da plataforma penaliza lojas com nota baixa, poucas avaliações ou tempo alto.",
      impact: "Loja aparece menos na busca → menos visitas.",
      solution: "Pedir avaliação após entrega; reduzir promessa de tempo; trabalhar respostas das negativas.",
    },
    {
      stage: "entra_loja",
      title: "2. Cliente entra na loja",
      status: entraStatus,
      bottleneck: entraStatus === "ok" ? "Vitrine atrativa" : "Vitrine pouco profissional (capa, logo ou descrição)",
      evidence: `Capa: ${front.has_cover ? "sim" : "não"} · Logo: ${front.has_logo ? "sim" : "não"} · Descrição: ${front.clear_description ? "ok" : "fraca"}`,
      cause: "Falta de identidade visual ou descrição confusa reduz a confiança no primeiro segundo.",
      impact: "Cliente sai sem clicar em nenhum produto.",
      solution: "Capa profissional + logo limpo + descrição com proposta de valor em 1 linha.",
    },
    {
      stage: "clica_produto",
      title: "3. Cliente clica em um produto",
      status: clicaStatus,
      bottleneck: clicaStatus === "ok" ? "Cardápio com fotos" : `${Math.round(noPhotoPct * 100)}% dos produtos sem foto`,
      evidence: `Sem foto: ${noPhotoMenu}/${totalMenu || "?"}`,
      cause: "Sem foto, o cliente não clica — vai direto no concorrente.",
      impact: "Conversão visual cai até 30%.",
      solution: "Sessão de fotos em lote dos 10 mais vendidos com luz e fundo padrão.",
    },
    {
      stage: "adiciona_carrinho",
      title: "4. Cliente adiciona ao carrinho",
      status: adicionaStatus,
      bottleneck: adicionaStatus === "ok" ? "Descrições suficientes" : "Nomes genéricos ou descrições curtas reduzem decisão",
      evidence: `Sem descrição: ${noDesc}/${totalMenu || "?"}`,
      cause: "Nome curto (ex.: 'X-Burger') não vende — falta ingrediente, diferencial, palavra-chave.",
      impact: "Cliente abre o produto e fecha sem adicionar.",
      solution: "Reescrever nomes com categoria + ingrediente + diferencial e descrição com 80+ caracteres.",
    },
    {
      stage: "compra",
      title: "5. Cliente conclui a compra",
      status: compraStatus,
      bottleneck: convLevel === "critico" ? `Conversão ${convRate}% (crítico)` :
        convLevel === "atencao" ? `Conversão ${convRate}% (atenção)` :
        convRate != null ? `Conversão ${convRate}% (ok)` : "Sem dados de conversão",
      evidence: visits != null ? `${visits} visitas · ${orders ?? "?"} pedidos` : "Cadastre visitas/pedidos para ver",
      cause: "Preço alto, taxa de entrega cara, falta de combo ou cupom no checkout.",
      impact: "Loja é vista, mas não converte.",
      solution: "Testar combo no topo, cupom de 1ª compra e revisar taxa de entrega no horário de pico.",
    },
    {
      stage: "recebe",
      title: "6. Cliente recebe o pedido",
      status: recebeStatus,
      bottleneck: recebeStatus === "ok" ? "Entrega dentro do esperado" : "Reclamações de atraso, comida fria ou pedido errado",
      evidence: `Frio: ${yes(reviews.complaint_cold) ? "sim" : "não"} · Atraso: ${yes(reviews.complaint_late) ? "sim" : "não"} · Errado: ${yes(reviews.complaint_wrong) ? "sim" : "não"}`,
      cause: "Embalagem inadequada, tempo de preparo + entrega acima do prometido, separação do pedido sem checklist.",
      impact: "Avaliação baixa + 0% recompra desse cliente.",
      solution: "Checklist de fechamento + embalagem térmica + revisar prazo prometido.",
    },
    {
      stage: "recompra",
      title: "7. Cliente recompra",
      status: recompraStatus,
      bottleneck: semRecompra ? "Sem nenhuma estratégia ativa de recompra" : "Recompra parcial — sem ação consistente",
      evidence: `Cupom retorno: ${yes(loyalty.next_purchase_coupon) ? "sim" : "não"} · Fidelidade: ${yes(loyalty.loyalty_card) ? "sim" : "não"} · Mensagem embalagem: ${yes(loyalty.packaging_message) ? "sim" : "não"}`,
      cause: "Foco apenas em aquisição. Cliente novo é caro, e ele não volta sozinho.",
      impact: "CAC alto + LTV baixo. Cresce, mas não escala.",
      solution: "Cupom automático de 15% válido 14 dias após o pedido + mensagem na embalagem.",
    },
  ];
}
