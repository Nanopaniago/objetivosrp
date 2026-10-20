// Image reading with Google Gemini. The API key never leaves the server.
import { HTTPException } from 'hono/http-exception';

const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const COLUMN_HINTS = {
  plus_master: 'colunas "OBJ VDS (plus + master)" (meta) e "REAL VDS (plus + master)" (realizado)',
  plus: 'colunas "OBJ VDS PLUS" (meta) e "REAL VDS PLUS" (realizado)',
  megas_total: 'colunas "OBJ MEGAS TOTAL" (meta) e "Real MEGAS TOTAL" (realizado)',
  dm_classicas: 'colunas "OBJ MG DM CLASSIC" (meta) e "Real MG DM CLASSIC" (realizado), em euros',
  dimobilli: 'colunas "OBJ DIMO" (meta) e "Real DIMO" (realizado), em unidades',
  peliculas: 'colunas "OBJ PELIC" (meta) e "REAL PEL" (realizado), em unidades',
};

async function callGemini(image, prompt, schema) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HTTPException(503, { message: 'A leitura de imagens não está configurada (falta GEMINI_API_KEY no servidor).' });
  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: image.type || 'image/jpeg', data: Buffer.from(image.bytes).toString('base64') } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
  };
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    throw new HTTPException(502, { message: 'Não foi possível contactar o serviço de leitura de imagens. Tenta de novo.' });
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('Gemini error', res.status, txt.slice(0, 500));
    throw new HTTPException(502, { message: 'O serviço de leitura de imagens devolveu um erro. Tenta de novo ou lança à mão.' });
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  try {
    return JSON.parse(text);
  } catch {
    throw new HTTPException(502, { message: 'Não consegui ler a tabela nesta imagem. Tenta uma captura mais nítida.' });
  }
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
Lê a tabela de objetivos por vendedor desta imagem (normalmente a tabela de baixo, "OBJETIVOS OBRIGATÓRIOS").
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
  const prompt = `Esta imagem é a escala mensal de uma loja (pode ser uma fotografia de uma folha impressa).
Mês esperado: ${month}/${year}.
Cada linha é uma pessoa (nome possivelmente cortado, às vezes precedido de um número de funcionário — devolve só o nome).
Cada coluna é um dia do mês. Cada célula tem:
- um horário com hora de entrada e hora de saída (ex.: "09:30" em cima e "18:30" em baixo) → start e end, code vazio;
- ou um código: FO ou FC (folga) ou FERS (férias) → code, sem horário.
Devolve todas as pessoas e todos os dias visíveis. Marca uncertain = true quando a célula não estiver legível. Não inventes valores.`;
  return callGemini(image, prompt, schema);
}
