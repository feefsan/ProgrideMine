# 🎮 Linha Temporal de Progressão — Minecraft 1.21

> Uma linha do tempo **interativa** para acompanhar sua progressão completa no Minecraft, do primeiro bloco de terra até o farol do Wither.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SEU-USUARIO/mc-progression-timeline)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

---

## 📸 Preview

![Preview do projeto](./docs/preview.png)

> 💡 Substitua `docs/preview.png` por um screenshot real do seu site depois do deploy.

---

## ✨ Funcionalidades

- ✅ **Marcação de progresso** — cada objetivo tem um checkbox; o estado é salvo automaticamente.
- ✏️ **Edição inline** — edite qualquer objetivo (inclusive os originais) sem sair da página.
- ➕ **Objetivos personalizados** — crie novos objetivos em qualquer fase, com suporte a bullet points.
- 🎯 **Drag & drop** — reordene os objetivos arrastando pela alça ⋮⋮; a ordem é persistida.
- 📝 **Bullets inteligentes** — linhas iniciadas por `-`, `*` ou `•` viram tópicos automaticamente.
- 💾 **Persistência local** — `localStorage` guarda progresso, edições, customizações e ordem.
- 📊 **Barra de progresso** — no topo, mostra a porcentagem total concluída em estilo XP do Minecraft.
- 📱 **Responsivo** — funciona em desktop, tablet e mobile (drag & drop nativo é desktop-only).

---

## 🛠️ Stack

| Camada       | Tecnologia                            |
| ------------ | ------------------------------------- |
| Marcação     | HTML5 semântico                       |
| Estilo       | CSS3 (variáveis, grid, flexbox)       |
| Lógica       | JavaScript puro com **ES Modules**    |
| Persistência | `localStorage`                        |
| Deploy       | [Vercel](https://vercel.com)          |
| Versionamento| Git + GitHub                          |

**Sem frameworks, sem build step, sem dependências.** Só a plataforma web.

---

## 🚀 Rodando localmente

Como o projeto usa **ES Modules**, você precisa servir os arquivos via HTTP (abrir o `index.html` direto como `file://` não funciona por causa de CORS).

### Com Python (já vem instalado no macOS/Linux)

```bash
python3 -m http.server 8000
```

### Com Node.js

```bash
npx serve .
```

### Com VS Code

Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) e clique em **Go Live**.

Depois abra <http://localhost:8000> no navegador.

---

## 📦 Estrutura do projeto

```
mc-progression-timeline/
├── assets/
│   └── favicon.svg         # Ícone do site (cubo isométrico)
├── css/
│   └── styles.css          # Estilos globais (variáveis CSS, responsivo)
├── js/
│   ├── data.js             # Dados estáticos das 5 fases
│   ├── state.js            # Estado global + persistência + helpers
│   ├── ui.js               # Renderização e atualização da interface
│   └── main.js             # Bootstrap + eventos + drag & drop
├── index.html              # Ponto de entrada
├── LICENSE
└── README.md
```

### Arquitetura

O projeto segue uma separação simples de responsabilidades:

- **`data.js`** — apenas dados (fases, itens, chaves de storage). Sem lógica.
- **`state.js`** — o "modelo". Carrega/salva no `localStorage`, mantém o estado em memória e expõe funções puras.
- **`ui.js`** — a "view". Constrói o HTML a partir do estado e atualiza contadores/barra de progresso.
- **`main.js`** — o "controller". Escuta eventos do usuário e coordena as chamadas entre `state` e `ui`.

Essa divisão mantém cada arquivo com uma responsabilidade clara — algo que recrutadores técnicos valorizam bastante.

---

## 🌐 Deploy

O projeto é 100% estático, então qualquer plataforma de hospedagem funciona. O **Vercel** é o mais direto:

### Deploy automático via GitHub

1. Faça um fork ou clone deste repositório.
2. Acesse <https://vercel.com/new>.
3. Clique em **Import Git Repository** e selecione seu repositório.
4. Mantenha todas as configurações padrão (o Vercel detecta sites estáticos automaticamente).
5. Clique em **Deploy**.

A cada `git push` na branch `main`, o Vercel faz um novo deploy automaticamente. Pull requests ganham **preview deployments** com URL própria — muito útil para revisar mudanças antes de aplicar.

---

## 🗺️ Roadmap

- [ ] Suporte a toque para drag & drop em mobile
- [ ] Exportar / importar progresso como JSON
- [ ] Perfis múltiplos (single-player + co-op)
- [ ] Modo escuro / claro alternável
- [ ] Backend opcional para sincronização entre dispositivos

---

## 🤝 Contribuindo

Sugestões e pull requests são bem-vindos. Para mudanças grandes, abra uma issue primeiro para discutirmos o que você gostaria de mudar.

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcao`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova função'`)
4. Faça push para a branch (`git push origin feature/nova-funcao`)
5. Abra um Pull Request

---

## 📄 Licença

Distribuído sob a licença **GNU General Public License V3 (GPL-3.0 license)**. Veja [`LICENSE`](./LICENSE) para mais informações.


---

</p>