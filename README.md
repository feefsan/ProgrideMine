# ProgrideMine

O ProgrideMine é uma aplicação web para acompanhar uma jornada de progressão no Minecraft. Os objetivos são organizados em fases, desde a exploração inicial até atividades de pós-jogo, com recursos para marcar tarefas, personalizar conteúdos e acompanhar o progresso total.

O projeto começou como uma aplicação front-end com persistência exclusiva no `localStorage`. Posteriormente, foi evoluído para usar autenticação, autorização e persistência remota com Supabase, mantendo o funcionamento original da interface e adicionando acesso público somente para leitura.

## Demonstração

Aplicação publicada:

[https://progridemine.vercel.app](https://progridemine.vercel.app)

Repositório:

[https://github.com/feefsan/ProgrideMine](https://github.com/feefsan/ProgrideMine)

## Objetivo do projeto

O projeto foi desenvolvido para resolver três necessidades principais:

1. Organizar uma jornada de progressão no Minecraft em etapas compreensíveis.
2. Permitir que usuários autorizados personalizem e sincronizem a própria jornada.
3. Disponibilizar uma versão pública da jornada sem conceder permissões de alteração aos visitantes.

Além do uso prático, o projeto serviu como exercício de evolução arquitetural, integração entre front-end e Backend as a Service, autenticação, autorização, segurança de dados e publicação contínua.

## Funcionalidades

### Jornada e progresso

- Organização dos objetivos em cinco fases.
- Marcação de objetivos como concluídos.
- Cálculo automático do percentual de progresso.
- Contagem de objetivos concluídos, totais, personalizados e editados.
- Indicador visual de conclusão por fase.
- Reinicialização do progresso sem excluir personalizações.

### Personalização

- Criação de objetivos personalizados.
- Edição de objetivos padrão e personalizados.
- Exclusão de objetivos personalizados.
- Criação de subtópicos a partir de linhas iniciadas por `-`, `*` ou `•`.
- Reordenação de objetivos por drag-and-drop dentro de cada fase.

### Autenticação e autorização

- Login por e-mail e senha com Supabase Auth.
- Persistência da sessão no navegador.
- Restauração automática de uma sessão válida.
- Logout pela interface.
- Autorização adicional por UUID na tabela `app_users`.
- Limite de dois usuários autorizados por instalação.
- Cadastro público desabilitado.
- Login anônimo do Supabase desabilitado.

### Acesso de visitante

- Entrada sem login.
- Visualização da jornada marcada como pública.
- Ausência de conta anônima no Supabase.
- Bloqueio dos controles de edição.
- Checkboxes desabilitados.
- Alças de reordenação ocultas.
- Botões de adicionar, editar, excluir e reiniciar ocultos.
- Proteção real contra escrita por meio de Row Level Security.

### Sincronização

- Persistência remota no PostgreSQL do Supabase.
- Indicador de estado da sincronização.
- Salvamento com debounce para agrupar alterações rápidas.
- Uso de `upsert` para criar ou atualizar o estado do usuário.
- Migração inicial dos dados existentes no `localStorage` quando ainda não há estado remoto.
- Controle para publicar ou ocultar a jornada.

## Tecnologias utilizadas

### Front-end

- HTML5
- CSS3
- JavaScript com ES Modules
- SVG para os ícones da interface
- Web Storage API para migração e compatibilidade com a versão local
- Drag and Drop API

### Backend e banco de dados

- Supabase Auth
- PostgreSQL gerenciado pelo Supabase
- Supabase JavaScript Client
- Row Level Security
- Funções SQL
- Triggers PostgreSQL
- Colunas JSONB para armazenamento do estado

### Publicação

- GitHub para versionamento
- Vercel para hospedagem e deploy contínuo

## Arquitetura

A aplicação utiliza módulos JavaScript com responsabilidades separadas:

```text
Navegador
  |
  |-- index.html
  |     Estrutura global, tela de acesso e barra de progresso
  |
  |-- css/styles.css
  |     Identidade visual, responsividade e estados da interface
  |
  |-- js/main.js
  |     Eventos, autenticação e coordenação do fluxo
  |
  |-- js/ui.js
  |     Renderização das fases, objetivos e estatísticas
  |
  |-- js/state.js
  |     Estado em memória e regras de alteração
  |
  |-- js/storage.js
  |     Persistência local e remota
  |
  |-- js/supabase.js
  |     Cliente, sessão, login, logout e autorização
  |
  |-- js/data.js
  |     Fases e objetivos padrão
  |
  `-- Supabase
        |-- Auth
        |-- PostgreSQL
        `-- Row Level Security
```

### Fluxo autenticado

```text
Login
  -> Supabase Auth
  -> verificação em app_users
  -> carregamento do estado do proprietário
  -> edição habilitada
  -> persistência no Supabase
```

### Fluxo de visitante

```text
Continuar sem login
  -> consulta da jornada pública
  -> modo somente leitura
  -> edição desabilitada
  -> RLS bloqueia operações de escrita
```

## Organização do estado

O estado principal é dividido em quatro objetos:

```js
{
  progress: {},
  custom: {},
  order: {},
  overrides: {}
}
```

- `progress`: registra os identificadores dos objetivos concluídos.
- `custom`: armazena objetivos criados pelo usuário, agrupados por fase.
- `order`: armazena a ordem personalizada dos objetivos de cada fase.
- `overrides`: armazena alterações realizadas em objetivos padrão.

Essa estrutura preserva os dados estáticos no código e grava no banco apenas o progresso e as diferenças criadas por cada usuário.

## Modelo de dados

### Tabela `app_users`

Controla quais usuários autenticados podem editar a aplicação.

Campos principais:

- `user_id`: UUID correspondente a `auth.users.id`.
- `display_name`: nome de exibição.
- `created_at`: data de autorização.

Um trigger impede que mais de dois usuários sejam adicionados à tabela.

### Tabela `user_state`

Armazena o estado individual da jornada.

Campos principais:

- `user_id`: proprietário do estado.
- `progress`: progresso em JSONB.
- `custom`: objetivos personalizados em JSONB.
- `item_order`: ordem dos objetivos em JSONB.
- `overrides`: alterações dos objetivos padrão em JSONB.
- `is_public`: define se visitantes podem consultar a jornada.
- `updated_at`: data da última atualização.

## Segurança

A aplicação aplica segurança em duas camadas.

### Camada de interface

O modo visitante define a aplicação como somente leitura e remove ou desabilita os controles responsáveis por alterações.

### Camada de banco de dados

As políticas de Row Level Security garantem que:

- Visitantes consultem apenas registros com `is_public = true`.
- Visitantes não possam inserir, editar ou excluir dados.
- Usuários autenticados leiam e alterem somente o próprio estado.
- Um usuário autenticado também precise estar presente em `app_users`.
- O `user_id` de uma operação de escrita corresponda a `auth.uid()`.

A aplicação utiliza somente a chave pública do Supabase no navegador. A chave `service_role` nunca deve ser inserida no código front-end.

## Decisões técnicas

### Uso de Supabase

O Supabase foi escolhido para adicionar autenticação e PostgreSQL sem a necessidade inicial de manter um servidor próprio. A plataforma fornece autenticação, API de dados e políticas de segurança integradas ao banco.

### Estado armazenado em JSONB

O projeto original já representava o estado em objetos JavaScript armazenados no `localStorage`. O uso de JSONB permitiu migrar para persistência remota sem reescrever toda a lógica de domínio e renderização.

Em uma aplicação maior, uma possível evolução seria normalizar objetivos, conclusões e participantes em tabelas separadas, facilitando relatórios, auditoria, filtros e atualizações concorrentes.

### Visitante sem autenticação anônima

O acesso público não cria um usuário anônimo no Supabase. O visitante utiliza o papel público para consultar somente o estado explicitamente publicado. Essa abordagem evita o crescimento desnecessário de contas anônimas e mantém o fluxo de leitura separado do fluxo autenticado.

### Migração do localStorage

Quando um usuário autorizado entra e ainda não possui estado remoto, a aplicação verifica os dados locais existentes. Caso encontre progresso ou personalizações, o estado local é enviado ao Supabase.

## Estrutura do projeto

```text
ProgrideMine/
├── assets/
│   `-- favicon.svg
├── css/
│   `-- styles.css
├── js/
│   ├── config.js
│   ├── data.js
│   ├── main.js
│   ├── state.js
│   ├── storage.js
│   ├── supabase.js
│   `-- ui.js
├── supabase/
│   ├── setup.sql
│   `-- authorize-users.sql.example
├── .editorconfig
├── .gitignore
├── index.html
├── LICENSE
`-- README.md
```

## Configuração do Supabase

### 1. Criar o projeto

1. Acesse o painel do Supabase.
2. Crie um projeto.
3. Aguarde a inicialização do banco.
4. Guarde a Project URL e a chave pública.

### 2. Criar o esquema e as políticas

Abra o SQL Editor e execute o arquivo:

```text
supabase/setup.sql
```

O script cria:

- Tabela `app_users`.
- Tabela `user_state`.
- Índice para jornadas públicas.
- Função `is_allowed_user()`.
- Trigger que limita a autorização a dois usuários.
- Políticas de Row Level Security.
- Permissões para os papéis `anon` e `authenticated`.

### 3. Configurar a autenticação

No painel de autenticação:

1. Mantenha o provedor de e-mail habilitado.
2. Desabilite novos cadastros públicos.
3. Desabilite login anônimo.
4. Para usuários criados manualmente, desabilite a confirmação obrigatória ou marque cada conta como confirmada.

### 4. Criar os usuários

Crie manualmente os dois usuários em Authentication > Users.

Copie o UUID de cada conta e use como base o arquivo:

```text
supabase/authorize-users.sql.example
```

Exemplo:

```sql
insert into public.app_users (user_id, display_name) values
  ('UUID_DO_USUARIO_1', 'Usuario 1'),
  ('UUID_DO_USUARIO_2', 'Usuario 2');
```

### 5. Configurar o cliente

Preencha `js/config.js`:

```js
export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  'SUA_CHAVE_PUBLICA';

export const SUPABASE_ENABLED = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
);
```

Não use a senha do banco, uma chave secreta ou a chave `service_role`.

## Execução local

Como o projeto usa módulos JavaScript, execute por meio de um servidor HTTP local.

### Com Python

```bash
python -m http.server 8000
```

Abra:

```text
http://localhost:8000
```

### Com Node.js

```bash
npx serve .
```

Use o endereço exibido no terminal.

Abrir o `index.html` diretamente com o protocolo `file://` pode impedir o carregamento correto dos módulos.

## Publicação na Vercel

O projeto é estático e pode ser publicado sem etapa de build.

1. Envie os arquivos para um repositório no GitHub.
2. Importe o repositório na Vercel.
3. Mantenha o diretório raiz como a pasta que contém `index.html`.
4. Não defina comando de build, salvo se a configuração do projeto exigir.
5. Publique o projeto.

Quando o repositório já está conectado à Vercel, cada `push` no branch de produção gera um novo deployment.

Exemplo:

```bash
git add .
git commit -m "Atualiza funcionalidades do ProgrideMine"
git push
```

## Uso

### Usuário autorizado

1. Abra a aplicação.
2. Informe e-mail e senha.
3. Aguarde o carregamento do estado.
4. Marque, crie, edite, exclua ou reordene objetivos.
5. Observe o indicador de sincronização.
6. Ative `Jornada pública` para liberar a leitura por visitantes.

### Visitante

1. Abra a aplicação.
2. Clique em `Continuar sem login`.
3. Consulte a jornada pública.
4. Use o botão `Entrar` caso queira acessar uma conta autorizada.

## Fluxos de teste recomendados

### Autenticação

- Login com credenciais válidas.
- Login com senha incorreta.
- Login com conta existente, mas ausente de `app_users`.
- Restauração de sessão após atualizar a página.
- Logout.

### Autorização

- Tentativa de escrita sem sessão.
- Tentativa de acessar o estado de outro usuário.
- Tentativa de inserir um terceiro usuário em `app_users`.
- Visualização pública quando `is_public = true`.
- Ausência de dados públicos quando `is_public = false`.

### Funcionalidades

- Marcar e desmarcar objetivos.
- Criar objetivo personalizado.
- Editar objetivo padrão.
- Editar objetivo personalizado.
- Excluir objetivo personalizado.
- Reordenar objetivos.
- Reiniciar o progresso.
- Atualizar a página e confirmar a persistência.
- Migrar dados existentes do `localStorage`.

## Desafios e aprendizados

### Evolução de persistência local para remota

O projeto inicialmente dependia exclusivamente do `localStorage`. A evolução exigiu criar uma camada de armazenamento capaz de manter compatibilidade com dados locais e, ao mesmo tempo, usar o Supabase como persistência remota.

### Diferença entre autenticação e autorização

Autenticação confirma a identidade do usuário. Autorização define o que o usuário pode fazer. No ProgrideMine, uma conta válida no Supabase Auth ainda precisa estar registrada em `app_users` para obter acesso de edição.

### Segurança além da interface

Ocultar botões não impede chamadas diretas à API. Por esse motivo, o modo somente leitura no front-end é complementado por políticas RLS no PostgreSQL.

### Diagnóstico de problemas em produção

Durante a evolução do projeto, foram investigados problemas como:

- HTML e JavaScript publicados em versões incompatíveis.
- Elementos esperados pelo JavaScript ausentes no HTML.
- Chave pública e URL do Supabase configuradas incorretamente.
- Conta confirmada, mas não autorizada em `app_users`.
- Checkbox alterando visualmente sem persistir por falta de importação da função responsável pelo estado.
- Diferença entre horários UTC do banco e o horário local exibido pelo navegador.

Esses problemas foram diagnosticados com o console do navegador, Network, respostas da API, consultas SQL e inspeção do deployment.

## Limitações atuais

- O projeto usa Supabase como Backend as a Service e não possui uma API própria.
- O estado é armazenado em JSONB, o que reduz a flexibilidade para relatórios mais complexos.
- Os testes atuais são principalmente manuais.
- O modo público exibe a jornada pública atualizada mais recentemente quando mais de uma estiver disponível.
- Não existe colaboração simultânea na mesma jornada.
- Não existe controle de versão para detectar alterações concorrentes.
- A configuração pública do Supabase fica em um módulo JavaScript versionado.

## Próximas melhorias

- Adicionar testes unitários para os mutadores de estado.
- Adicionar testes end-to-end para login, visitante e persistência.
- Normalizar objetivos e conclusões em tabelas relacionais.
- Implementar uma API própria para praticar controllers, services e validação no servidor.
- Adicionar validação centralizada dos dados antes da persistência.
- Melhorar o tratamento de erros de rede e sincronização.
- Implementar retentativa de salvamento.
- Adicionar recuperação de senha.
- Adicionar controle de conflitos por versão ou `updated_at`.
- Mover configurações para variáveis de ambiente em um processo de build.
- Adicionar auditoria de alterações.
- Criar uma página de seleção quando houver mais de uma jornada pública.

## Como apresentar este projeto em uma entrevista

Uma descrição curta e objetiva:

> O ProgrideMine é uma aplicação web para acompanhar uma jornada no Minecraft. O projeto começou com persistência no navegador e foi evoluído para usar autenticação, autorização e PostgreSQL pelo Supabase. Usuários autorizados podem editar e sincronizar a própria jornada, enquanto visitantes têm acesso somente à leitura do conteúdo publicado. A aplicação usa Row Level Security para proteger os dados e está publicada na Vercel com deploy integrado ao GitHub.

### Para uma vaga backend

Destaque:

- Modelagem no PostgreSQL.
- Autenticação e autorização.
- Políticas RLS.
- Associação entre registro e `auth.uid()`.
- Migração de persistência local para remota.
- Uso de JSONB e suas limitações.
- Segurança da chave pública.
- Diferença entre BaaS e uma API própria.

Uma forma honesta de apresentar:

> Eu não desenvolvi um servidor próprio nesta versão. Usei o Supabase como Backend as a Service e fiquei responsável pela modelagem, pelas políticas de acesso, pela integração com o front-end e pela validação dos fluxos. Como evolução, eu implementaria uma API própria para aprofundar organização em camadas, testes e validação no servidor.

### Para uma vaga full stack

Destaque:

- Interface responsiva.
- Estado e renderização separados.
- Eventos e formulários.
- Drag-and-drop.
- Autenticação e sessão.
- Persistência assíncrona.
- Segurança no banco.
- Deploy contínuo.
- Debugging em produção.

### Demonstração sugerida

1. Abra a aplicação em janela anônima.
2. Entre como visitante.
3. Mostre a jornada e os controles bloqueados.
4. Faça login com uma conta autorizada.
5. Marque um objetivo.
6. Crie e edite um objetivo personalizado.
7. Reordene uma tarefa.
8. Atualize a página e mostre a persistência.
9. Publique a jornada.
10. Saia e mostre novamente o acesso de visitante.

## Perguntas técnicas que o projeto ajuda a responder

### Por que usar Supabase?

O objetivo era adicionar autenticação e PostgreSQL sem manter inicialmente um servidor próprio, permitindo concentrar o desenvolvimento nas regras da aplicação e aprender autorização com RLS.

### Por que usar JSONB?

A estrutura original já utilizava objetos JavaScript. JSONB permitiu uma migração incremental com menor risco de regressão. Para uma aplicação maior, uma modelagem relacional seria mais adequada para consultas e relatórios.

### A chave pública do Supabase no front-end é segura?

A chave pública identifica o projeto, mas não concede acesso administrativo. A segurança depende das permissões e políticas RLS. A chave `service_role` nunca deve ser enviada ao navegador.

### Por que manter localStorage?

O `localStorage` permite migrar dados de usuários da versão anterior. Quando não existe um estado remoto, a aplicação pode aproveitar o estado local e enviá-lo ao Supabase.

### O que acontece com duas edições simultâneas?

Cada usuário possui atualmente o próprio registro. O projeto não implementa colaboração sobre a mesma jornada. Uma evolução poderia usar controle de versão, processamento em tempo real ou validação de `updated_at`.

## Uso de ferramentas de apoio

Ferramentas de inteligência artificial foram utilizadas como apoio para discussão de requisitos, revisão de alternativas e investigação de problemas. As decisões, configurações, testes, correções e validações do fluxo foram realizadas com entendimento da arquitetura e do código utilizado.

## Licença

Este projeto está licenciado sob os termos presentes no arquivo `LICENSE`.
