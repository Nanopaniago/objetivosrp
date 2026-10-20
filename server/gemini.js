// Image reading with Google Gemini. The API key never leaves the server.
import { HTTPException } from 'hono/http-exception';

const MODELS = () => [...new Set([process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-flash-latest'].filter(Boolean))];
const TIMEOUT_MS = () => Number(process.env.GEMINI_TIMEOUT_MS || 150000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const COLUMN_HINTS = {
  plus_master: 'colunas "OBJ VDS (plus + master)" (meta) e "REAL VDS (plus + master)" (realizado)',
  plus: 'colunas "OBJ VDS PLUS" (meta) e "REAL VDS PLUS" (realizado)',
  megas_total: 'colunas "OBJ MEGAS TOTAL" (meta) e "Real MEGAS TOTAL" (realizado)',
  dm_classicas: 'colunas "OBJ MG DM CLASSIC" (meta) e "Real MG DM CLASSIC" (realizado), em euros',
  dimobilli: 'colunas "OBJ DIMO" (meta) e "Real DIMO" (realizado), em unidades',
  peliculas: 'colunas "OBJ PELIC" (meta) e "REAL PEL" (realizado), em unidades',
};

// Calls Gemini with automatic retries (network errors, 429, 5xx) and model fallback (404).
// Accepts images and PDFs (inline_data). Logs the real cause so problems can be diagnosed.
async function callGemini(file, prompt, schema) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new HTTPException(503, { message: 'A leitura de imagens não está configurada (falta GEMINI_API_KEY no servidor).' });
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: file.type || 'image/jpeg', data: Buffer.from(file.bytes).toString('base64') } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
  });

  let lastCause = 'desconhecido';
  for (const model of MODELS()) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      let res;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS()),
        });
      } catch (e) {
        const code = e?.name === 'TimeoutError' ? 'tempo esgotado' : e?.cause?.code || e?.cause?.message || e?.message || 'rede';
        console.error(`Gemini fetch failed [${model} #${attempt}]`, e?.name, e?.message, e?.cause?.code || e?.cause?.message || '');
        lastCause = code;
        if (e?.name === 'TimeoutError' && attempt >= 2) break;
        await sleep(1500 * attempt);
        continue;
      }
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
        try {
          return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
        } catch {
          console.error(`Gemini resposta não-JSON [${model}]`, data?.candidates?.[0]?.finishReason, text.slice(0, 300));
          throw new HTTPException(502, { message: 'Não consegui ler a tabela neste ficheiro. Tenta uma captura mais nítida.' });
        }
      }
      const txt = await res.text().catch(() => '');
      console.error(`Gemini error ${res.status} [${model} #${attempt}]`, txt.slice(0, 500));
      lastCause = `HTTP ${res.status}`;
      if (res.status === 404) break; // model not available → try next model
      if (res.status === 400 && /API key/i.test(txt)) throw new HTTPException(502, { message: 'A chave do Gemini (GEMINI_API_KEY) não é válida.' });
      if (res.status === 429 || res.status >= 500) { await sleep(3000 * attempt); continue; }
      throw new HTTPException(502, { message: `O serviço de leitura devolveu um erro (HTTP ${res.status}). Tenta de novo ou lança à mão.` });
    }
  }
  throw new HTTPException(502, { message: `Não foi possível ler o ficheiro (${lastCause}). Tenta de novo ou lança à mão.` });
}

const valueItem = (slugs) => ({
  type: 'OBJECT',
  properties: {
    category: { type: 'STRING', enum: slugs },
    goal: { type: 'NUMBER', nullable: true },
    actual: { type: 'NUMBER', nullable: true },
    uncertain: { type: 'BOOLEAN' },
  },
  required: ['category', 'actual', 'uncertain'],
});

export async function readResultsImage(image, { categories }) {
  const slugs = categories.map((c) => c.slug);
  const schema = {
    type: 'OBJECT',
    properties: {
      report_date: { type: 'STRING', nullable: true, description: 'Data do relatório em YYYY-MM-DD, só se estiver visível' },
      sellers: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { name: { type: 'STRING' }, values: { type: 'ARRAY', items: valueItem(slugs) } },
          required: ['name', 'values'],
        },
      },
      totals: { type: 'ARRAY', items: valueItem(slugs) },
    },
    required: ['sellers', 'totals'],
  };
  const lines = categories
    .map((c) => `- ${c.slug} (${c.name}, ${c.unit === 'eur' ? 'euros' : 'unidades'}): ${COLUMN_HINTS[c.slug] || `colunas de objetivo e realizado de "${c.name}"`}`)
    .join('\n');
  const prompt = `És um leitor de relatórios comerciais de uma loja em Portugal.
Lê a tabela de objetivos por vendedor desta imagem ou PDF (se o PDF tiver várias páginas, procura a página com a tabela) (normalmente a tabela de baixo, "OBJETIVOS OBRIGATÓRIOS").
Para cada linha de vendedor, devolve o nome completo tal como aparece e, para cada categoria, a meta (goal) e o realizado (actual):
${lines}
Regras:
- Valores em euros: "€19 214" significa 19214. Usa ponto como separador decimal se houver casas decimais.
- Ignora colunas de desvio, peso, percentagens e a secção "INFORMATIVO" (VM, Nº tal, Art/Tal, Meg/Ta, %Fidelizadas, NPS, taxas).
- Ignora a tabela de resumo por secção da loja.
- Se uma célula estiver vazia, actual = 0.
- Em "totals", devolve os valores da linha "Total Geral".
- Marca uncertain = true sempre que algum dígito não estiver perfeitamente legível. Não inventes números.`;
  return callGemini(image, prompt, schema);
}

export async function readScheduleImage(image, { year, month }) {
  const schema = {
    type: 'OBJECT',
    properties: {
      year: { type: 'INTEGER', nullable: true },
      month: { type: 'INTEGER', nullable: true },
      rows: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            days: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  day: { type: 'INTEGER' },
                  code: { type: 'STRING', description: 'FO, FC, FERS ou vazio quando a célula tem horário' },
                  start: { type: 'STRING', nullable: true, description: 'HH:MM' },
                  end: { type: 'STRING', nullable: true, description: 'HH:MM' },
                  uncertain: { type: 'BOOLEAN' },
                },
                required: ['day', 'uncertain'],
              },
            },
          },
          required: ['name', 'days'],
        },
      },
    },
    required: ['rows'],
  };
  const prompt = `Esta imagem (ou PDF) é a escala mensal de uma loja (pode ser uma fotografia de uma folha impressa).
Mês esperado: ${month}/${year}.
Cada linha é uma pessoa (nome possivelmente cortado, às vezes precedido de um número de funcionário — devolve só o nome).
Cada coluna é um dia do mês. Cada célula tem:
- um horário com hora de entrada e hora de saída (ex.: "09:30" em cima e "18:30" em baixo) → start e end, code vazio;
- ou um código: FO ou FC (folga) ou FERS (férias) → code, sem horário.
Devolve todas as pessoas e todos os dias visíveis. Marca uncertain = true quando a célula não estiver legível. Não inventes valores.`;
  return callGemini(image, prompt, schema);
}
