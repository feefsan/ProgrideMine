/**
 * Dados estáticos da linha temporal.
 * Cada fase possui itens com { id, title, text, subs? }.
 */
export const PHASES = [
  {
    id: 'fase1', label: 'Fase 1',
    title: 'Fundação e Exploração da Superfície',
    desc: 'O início foca em estabelecer sua base e dominar as mecânicas básicas do mundo superior.',
    color: '#5ec26a', icon: 'i-house',
    items: [
      { id: 'f1-vilas', title: 'Comércio com Vilas',
        text: 'Encontre uma Vila, proteja os aldeões e use bancadas de trabalho (Defumador, Composteira, Mesa de Flechar) para definir profissões. O Fletchador compra gravetos por esmeraldas (dinheiro fácil), o Armeiro e o Ferreiro de Armas vendem equipamentos de diamante no nível máximo, e o Bibliotecário fornece livros com Remendo (Mending) e Fortuna III.' },
      { id: 'f1-arqueologia', title: 'Arqueologia com o Pincel',
        text: 'Fabrique um Pincel (Cobre + Pena + Graveto). Procure Ruínas da Trilha, Templos do Deserto e Ruínas Oceânicas frias ou calorosas. Use-o na Areia Suspeita ou Cascalho Suspeito — com a picareta o bloco se perde, com o pincel vêm Fragmentos de Cerâmica, Ferramentas de Ferro e o raríssimo Ovo de Sniffer.' },
      { id: 'f1-montarias', title: 'Domesticação e Montarias',
        text: 'Dome cavalos, burros e camelos. O camelo (exclusivo de vilas do deserto) carrega duas pessoas, dá um "arrancada" horizontal para pular ravinas e rios largos, e por ser muito alto impede que zumbis e husks te alcancem enquanto você está montado.' },
      { id: 'f1-estruturas', title: 'Estruturas de Superfície e Cartografia',
        text: 'Evolua um aldeão Cartógrafo até o nível profissional para comprar Mapas de Exploração Oceanográfica e de Bosque. Saqueie Templos do Deserto e da Selva e invada as Mansões da Floresta para derrotar os Invocadores (Evokers) — únicos que dropam o Totem da Imortalidade, item crucial na mão secundária.' }
    ]
  },
  {
    id: 'fase2', label: 'Fase 2',
    title: 'Domínio Subterrâneo e Tecnologia do Cobre',
    desc: 'Antes de ir para o Nether, o subsolo oferece desafios mecânicos ricos e o grande destaque das atualizações recentes.',
    color: '#e08c4a', icon: 'i-cube',
    items: [
      { id: 'f2-mineracao', title: 'Mineração na Ardósia Profunda (Deepslate)',
        text: 'Abaixo da camada Y=0 a pedra vira ardósia cinza-escura e mais resistente. Desça até Y=-58, o ponto ideal para Diamantes. Use Lápis-Lazúli na Mesa de Encantamentos para conseguir Fortuna III (multiplica os diamantes) e Toque de Seda (coleta blocos inteiros).' },
      { id: 'f2-camaras', title: 'As Câmaras de Teste (Trial Chambers)',
        text: 'Megamasmorras de blocos de cobre e tijolos de tufa. Os Geradores de Teste invocam ondas de inimigos conforme o número de jogadores presentes.',
        subs: [
          'Derrote o Breeze (Brisa) — monstro voador que atira rajadas de vento — para coletar a Vara de Brisa.',
          'Pegue a Chave de Teste derrubada pelos geradores e use-a no bloco de Cofre (Vault) para itens de alto nível.',
          'Combine a Vara de Brisa com o Núcleo Pesado (Cofres de Teste Sinistros) para craftar o Maço (Mace): dano cumulativo baseado na altura da queda — pule de muito alto e mate qualquer criatura sem sofrer dano de queda.'
        ] },
      { id: 'f2-fabricador', title: 'Automação com o Fabricador (Crafter)',
        text: 'Bloco mecânico revolucionário que usa Redstone. Configure uma receita dentro dele (ex.: Bloco de Ferro), conecte um funil com barras e ative um sinal de redstone — ele fabrica sozinho e ejeta o item. Permite fazendas que armazenam recursos já compactados, sem ação manual.' },
      { id: 'f2-ancestral', title: 'Cidades Ancestrais e o Warden',
        text: 'No bioma Deep Dark, nenhum monstro comum nasce — o perigo são os Sensores e Catalisadores de Esculco. Se você fizer barulho (correr, pular, abrir baús), o Gerador de Esculco acumula avisos e após 3 o Warden emerge: cego, mas te caça pelo som e pelo cheiro, com o ataque mais forte do jogo. Ande agachado (anula o som) e saqueie Fragmentos de Disco, Ecos de Estilhaço (bússola de recuperação) e o modelo de ferraria de Silêncio.' }
    ]
  },
  {
    id: 'fase3', label: 'Fase 3',
    title: 'Conquista do Nether e Alquimia',
    desc: 'O Nether não serve apenas para achar fortalezas; ele possui ecossistemas inteiros e dinâmicas de escambo.',
    color: '#d1452f', icon: 'i-flame',
    items: [
      { id: 'f3-piglins', title: 'Florestas do Nether e Escambo com Piglins',
        text: 'Vista pelo menos uma peça de armadura de ouro para não ser atacado. Jogue Barras de Ouro no chão perto dos Piglins: eles coletam e devolvem itens aleatórios. É a forma mais rápida de conseguir Chorar de Obsidiana, Velocidade das Almas e dezenas de Pérolas do End.' },
      { id: 'f3-bastioes', title: 'Bastiões em Ruínas (Bastion Remnants)',
        text: 'Castelos pretos gigantescos habitados por Piglins Brutos, que atacam mesmo se você estiver de ouro. Os baús contêm o Molde de Ferraria de Upgrade de Netherite — obrigatório hoje em dia para transformar diamante em netherite na Mesa de Ferraria.' },
      { id: 'f3-fortalezas', title: 'Fortalezas do Nether e Suporte de Poções',
        text: 'Encontre as pontes de tijolos do Nether, crie uma área segura e cace Blazes pelas Varas. Colete Fungos do Nether na Areia das Almas. Com os dois ingredientes, monte o Suporte de Poções e use Olhos de Aranha Fermentados, Pólvora e Pó de Pedra Luminosa para poções arremessáveis de Fraqueza (curar aldeões zumbis) e Poções de Força.' }
    ]
  },
  {
    id: 'fase4', label: 'Fase 4',
    title: 'O End, Tecnologias de Voo e Customização',
    desc: 'A derrota do dragão é apenas o começo do verdadeiro final do jogo.',
    color: '#a06fd8', icon: 'i-end',
    items: [
      { id: 'f4-portal', title: 'Ativação do Portal do End',
        text: 'No mundo superior, jogue os Olhos do End para cima: eles voam na direção da Fortaleza subterrânea (Stronghold). Encontre a sala do portal, preencha os encaixes vazios com os olhos e pule no feixe estrelado.' },
      { id: 'f4-dragao', title: 'Combate ao Ender Dragon',
        text: 'Use flechas ou blocos para subir nos pilares de Obsidiana e explodir os Cristais do End que curam o dragão. Quando ele pousar no centro de pedra, use uma Picareta ou Camas (que explodem violentamente no End) para causar dano massivo.' },
      { id: 'f4-cidades', title: 'Cidades do End, Shulkers e Elytra',
        text: 'Ao morrer, o dragão deixa um portal minúsculo flutuando nas bordas da ilha. Jogue uma Pérola do End dentro dele para ser teletransportado às ilhas externas e procure as torres roxas de purpur.',
        subs: [
          'Derrote os Shulkers e junte as cascas com baús comuns para criar as Caixas de Shulker — baús que guardam os itens mesmo quando quebrados.',
          'Entre no Navio do End flutuante e colete a Elytra na moldura da parede. Equipe no lugar do peitoral e use Foguetes de Fogos de Artifício para voar livremente pelo mapa.'
        ] },
      { id: 'f4-ornatos', title: 'Mesa de Ferraria e Ornatos de Armadura',
        text: 'Reúna os Moldes de Ferraria de Ornatos achados em Câmaras de Teste, Templos e Fortalezas. Na Mesa de Ferraria, coloque a armadura de Diamante ou Netherite, selecione o Molde e escolha um minério colorido (Ouro, Ferro, Quartzo, Esmeralda, Redstone, Diamante) para aplicar desenhos e texturas exclusivas.' }
    ]
  },
  {
    id: 'fase5', label: 'Fase 5',
    title: 'O Pós-Jogo e Megaprojetos Terrestres',
    desc: 'Com a Elytra e recursos infinitos, você se torna o mestre do mundo e pode focar nas mecânicas de prestígio.',
    color: '#f0c040', icon: 'i-beacon',
    items: [
      { id: 'f5-raids', title: 'Eventos de Invasão (Raids) da 1.21',
        text: 'Derrote um Capitão Pillager com bandeira na cabeça para ganhar a Garrafa de Presságio. Beba perto de uma Vila para ativar o efeito Mau Presságio e iniciar a invasão. Resista às ondas de Pillagers, Bruxas e Devastadores para ganhar Herói da Vila — descontos absurdos com todos os comerciantes.' },
      { id: 'f5-beacon', title: 'Invocação do Wither e o Sinalizador (Beacon)',
        text: 'Colete 3 Crânios de Esqueleto Wither no Nether. No mundo superior, faça um "T" com 4 blocos de Areia das Almas e coloque os 3 crânios no topo. Derrote o Wither para obter a Estrela do Nether, crafte o Sinalizador e monte uma pirâmide de ferro, ouro ou diamante para receber efeitos permanentes em grande área.' },
      { id: 'f5-fazendas', title: 'Fazendas Técnicas Automatizadas',
        text: 'Use o Fabricador da 1.21 para criar fazendas 100% automáticas de cana-de-açúcar (combustível dos foguetes da Elytra), ferro, ouro e pólvora — tudo rodando sem intervenção manual.' },
      { id: 'f5-sniffer', title: 'Restauração da Fauna Extinta (Sniffer)',
        text: 'Pegue o Ovo de Sniffer da arqueologia da Fase 1 e coloque-o sobre um bloco de Musgo (choca duas vezes mais rápido). O Sniffer nasce — um dinossauro gigante e dócil que fareja e cava o chão entregando sementes pré-históricas raras, como a Planta de Jarro e a Flor de Tocha.' }
    ]
  }
];

export const STORAGE_KEYS = {
  progress:  'mc-progressao-1.21.11',
  custom:    'mc-progressao-1.21.11-custom',
  order:     'mc-progressao-1.21.11-order',
  overrides: 'mc-progressao-1.21.11-overrides',
};