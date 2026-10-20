# Objetivos RP

Metas, resultados e motivação para equipas de venda em loja. Multi-loja, com importação dos resultados diários e da escala a partir de imagens, e gamificação (pontos, sequências, marcos, recordes e desafios de equipa).

Leve de propósito: um único processo Node 22 com SQLite incorporado (sem base de dados externa, sem dependências nativas). Usa menos de 100 MB de RAM.

## Funções

| Função | O que pode fazer |
|---|---|
| Vendedor | Ver o seu painel (missão do dia, metas, projeção), o ranking da loja e a escala |
| Gestor | Tudo nas suas lojas: importar resultados e escalas, metas, resultados à mão, vendedores, desafios |
| Administrador | Todas as lojas, gestores, categorias |

## Instalar no DietPi (Docker)

```bash
git clone -b v2 https://github.com/Nanopaniago/objetivosrp.git
cd objetivosrp
cp .env.example .env      # edita: ADMIN_PASSWORD e GEMINI_API_KEY
docker compose up -d --build
```

A app fica em `http://IP-DO-DIETPI:3000`. Para acesso de fora, aponta o Cloudflare Tunnel para `http://localhost:3000` (e mantém `COOKIE_SECURE=true`).

Na primeira arranque é criado o administrador definido no `.env`. Depois: **Gestão → Lojas** para criar lojas, e **Gestão → Vendedores** para criar gestores e vendedores.

Os dados ficam em `./data` (`objetivos.db` e as imagens importadas em `uploads/`). Para cópia de segurança basta copiar esta pasta (de preferência com o contentor parado, ou com `sqlite3 data/objetivos.db ".backup copia.db"`).

### Atualizar

```bash
git pull && docker compose up -d --build
```

## Sem Docker

Requer Node 22.13 ou mais recente.

```bash
npm ci && npm run build
cp .env.example .env && set -a && . ./.env && set +a
npm start
```

## Desenvolvimento

```bash
npm ci
DATA_DIR=./data-demo node server/seed-demo.js   # loja de demonstração (palavra-passe demo1234)
DATA_DIR=./data-demo npm run dev                # API em :3000, web em :5173
npm test                                        # testes do motor de cálculo e da API
```

## Fotos de perfil

Cada pessoa põe a sua foto em **A minha conta** (ou clicando no avatar no canto inferior). O gestor pode pôr a foto dos seus vendedores clicando no avatar em **Gestão → Vendedores**. A foto é recortada e reduzida no navegador (320×320) e fica em `data/avatars/`.

## Como funcionam os cálculos

- **Resultados** são o acumulado do mês reportado numa data (como no relatório diário). A venda de cada dia é a diferença entre dois relatórios.
- **Dias de trabalho** vêm da escala (Abertura, Fecho, Horário livre). Folgas e férias não contam. Sem escala, contam todos os dias menos domingo.
- **Meta diária** = o que falta ÷ dias de trabalho depois do último relatório.
- **Ritmo** = dias trabalhados ÷ dias de trabalho do mês. **Projeção** = acumulado ÷ dias trabalhados × dias do mês.
- **Pontos**: meta diária batida +20 por categoria; sequência de 3/5/10 dias +30/+60/+150; marcos de 50/80/100/120% +40/+80/+150/+100; recorde pessoal +25 (com pelo menos 5 dias de histórico); desafio de equipa cumprido, os pontos definidos no desafio. Uma categoria que já está no ritmo do mês não quebra a sequência num dia sem vendas.
- Os pontos são sempre recalculados a partir dos dados, por isso correções e "desfazer" ficam refletidos de imediato.

## Importação por imagem

1. O gestor carrega a captura ou o PDF do relatório diário (ou a foto/PDF da escala).
2. O Gemini lê a tabela no servidor, em segundo plano (o navegador vai perguntando pelo resultado, por isso não esbarra no limite de 100 s do Cloudflare). A chave nunca chega ao navegador. Em caso de falha de rede ou sobrecarga tenta de novo sozinho, e se o modelo deixar de existir passa para o seguinte. A causa de qualquer falha fica em `docker logs objetivos-rp`.
3. O sistema reconhece os vendedores pelo primeiro nome, ignora o gestor, compara a soma com o Total Geral e assinala acumulados que desceram.
4. Só o que precisa de decisão é mostrado; o resto pode ser revisto numa tabela editável.
5. Ao gravar, guarda-se uma cópia do estado anterior: a última importação pode ser desfeita.

Escalas: `FO` e `FC` → Folga, `FERS` → Férias, `09:30–18:30` → Abertura, `11:30–20:30` → Fecho, outros horários → Horário livre (equipa IGL).
