# FITOS — Terminal de Treino 🏋️

PWA de academia com visual de terminal CRT retrô (design "Treino OCR" do Claude Design). Sem dependências, sem build — HTML, CSS e JavaScript puros.

## Funcionalidades

- **Início**: treino do dia, sequência de dias treinados (streak) e acesso rápido aos treinos.
- **Treinos**: crie e edite treinos; por exercício configure tipo de carga (KG, halter, máquina, corpo, elástico ou tempo), séries, repetições/duração, carga e descanso.
- **Sessão de treino**: acompanhamento série a série com barra de progresso, timer de descanso automático (ajuste ±15s), cronômetro para exercícios por tempo e tela de conclusão com duração total.
- **Tela de bloqueio**: modo de exibição estilo lock screen durante o treino, com relógio, exercício atual e controles — ideal para deixar o celular apoiado no aparelho.
- **Timer HIIT / Tabata**: circuito configurável (preparo, ciclos, ON padrão ou por exercício, OFF) com contagem gigante, bipes de aviso e pausar/pular.
- **Perfil**: nome do atleta, tema Verde ou Âmbar (fósforo CRT), scanlines e som liga/desliga, estatísticas e limpeza de dados.
- **Histórico & Evolução** (Perfil → Histórico): cada treino concluído é registrado; gráfico de carga por exercício, recorde (PR) e lista de sessões recentes.
- **Backup**: exportar/importar todos os dados como arquivo JSON pelo Perfil — útil para trocar de aparelho.
- **Timer na tela de bloqueio real** (Media Session): durante treino ou HIIT, o descanso/cronômetro aparece como "faixa" na central de mídia e tela de bloqueio do celular, com controles — ⏮/⏭ trocam exercício ou pulam a etapa, play/pause controla o cronômetro.
- Bipes nos 3 segundos finais e ao trocar de fase; vibração no Android; Wake Lock mantém a tela acesa durante treino/HIIT.
- **Offline**: funciona sem internet após o primeiro acesso (service worker, incluindo fontes).
- Dados salvos localmente no aparelho (`localStorage`, chave `fitos.v1`) — nada vai para servidores.

## Como rodar localmente

```bash
python3 serve.py 8734
# abra http://localhost:8734
```

(ou qualquer servidor estático: `npx serve`, extensão Live Server do VS Code, etc.)

## Como usar no celular (recomendado)

O app precisa ser servido via **HTTPS** para instalar como PWA. Opções gratuitas:

1. **GitHub Pages**: crie um repositório, envie estes arquivos e ative Pages (Settings → Pages → branch main).
2. **Netlify Drop**: arraste a pasta em https://app.netlify.com/drop — publica na hora.
3. **Vercel / Cloudflare Pages**: importe a pasta como projeto estático.

Depois, no celular:

- **Android (Chrome)**: abra a URL → menu ⋮ → **"Adicionar à tela inicial"** / "Instalar app".
- **iPhone (Safari)**: abra a URL → botão Compartilhar → **"Adicionar à Tela de Início"**.

Notas: a vibração não é suportada no Safari/iOS; o som exige um primeiro toque na tela (restrição dos navegadores).

## Estrutura

```
index.html            — casca do app (moldura CRT + sobreposições)
manifest.webmanifest  — manifesto PWA (instalação)
sw.js                 — service worker (offline + cache das fontes)
css/styles.css        — tema CRT (fontes, moldura, scanlines, temas)
js/app.js             — app inteiro: estado, telas, timers e persistência
icons/                — ícones do app
serve.py              — servidor local para desenvolvimento
legacy/               — versão anterior do app (tema azul), mantida como backup
```

## Backup dos dados

Os dados ficam no `localStorage` do navegador. Para exportar, abra o console do navegador e rode:

```js
copy(localStorage.getItem('fitos.v1'))
```
