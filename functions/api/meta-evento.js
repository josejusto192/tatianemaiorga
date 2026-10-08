// Cloudflare Pages Function — POST /api/meta-evento
// Envia o clique no WhatsApp para a API de Conversões da Meta (pelo servidor), com o mesmo
// event_id do Pixel do navegador: a Meta junta os dois e conta a conversão uma vez só.
//
// Configuração: Cloudflare > Workers e Pages > (projeto) > Configurações > Variáveis e segredos
//   META_PIXEL_ID         ID do Pixel (Conjunto de dados) da Meta
//   META_CAPI_TOKEN       token de acesso da API de Conversões — cadastrar como "Segredo"
//   META_TEST_EVENT_CODE  (opcional) código de "Testar eventos" do Gerenciador de Eventos
// Sem META_PIXEL_ID e META_CAPI_TOKEN a função não faz nada.

const VERSAO_API = 'v24.0'; // versão da API do Facebook (Graph API); atualizar quando a Meta descontinuar
const EVENTOS = { contato_whatsapp: 'Contact' }; // evento do site -> evento padrão da Meta

const resposta = (status) => new Response(null, { status });
const cookieMeta = (v) => (typeof v === 'string' && /^fb\.\d\.\d+\.[\w.-]{1,200}$/.test(v) ? v : undefined);

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return resposta(204);

  const site = new URL(request.url);
  const origem = request.headers.get('Origin');
  if (origem && new URL(origem).host !== site.host) return resposta(403);

  let dados;
  try { dados = JSON.parse(await request.text()); } catch { return resposta(400); }

  const nome = EVENTOS[dados?.evento];
  if (!nome || typeof dados.event_id !== 'string' || dados.event_id.length > 64) return resposta(400);

  let pagina;
  try { pagina = new URL(dados.pagina); } catch { return resposta(400); }
  if (pagina.host !== site.host) return resposta(400);

  const evento = {
    event_name: nome,
    event_time: Math.floor(Date.now() / 1000),
    event_id: dados.event_id,
    action_source: 'website',
    // sem parâmetros de URL (utm, fbclid…): a Meta restringe esses dados em sites de saúde
    event_source_url: pagina.origin + pagina.pathname,
    user_data: {
      client_ip_address: request.headers.get('CF-Connecting-IP') || undefined,
      client_user_agent: request.headers.get('User-Agent') || undefined,
      fbp: cookieMeta(dados.fbp),
      fbc: cookieMeta(dados.fbc),
    },
    custom_data: typeof dados.local === 'string' ? { local: dados.local.slice(0, 40) } : undefined,
  };

  const corpo = { data: [evento] };
  if (env.META_TEST_EVENT_CODE) corpo.test_event_code = env.META_TEST_EVENT_CODE;

  const envio = fetch(
    `https://graph.facebook.com/${VERSAO_API}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) },
  ).then(async (r) => {
    if (!r.ok) console.log('API de Conversões da Meta respondeu', r.status, await r.text());
  });
  waitUntil(envio); // responde na hora; o envio termina em segundo plano
  return resposta(202);
}
