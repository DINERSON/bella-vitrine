// ============================================================
// CONFIGURACOES DA LOJA
// Edite esta area quando quiser trocar dados principais da loja.
// ============================================================
const STORE_CONFIG = {
  storeName: "Nome da Loja",
  logoInitials: "NL",
  whatsappNumber: "5569999999999",
  instagramUser: "nomedaloja",
  instagramUrl: "https://www.instagram.com/nomedaloja/",
  city: "Pimenta Bueno - RO",
  deliveryText: "Entrega em Pimenta Bueno e região",
  paymentMethods: "Pix, dinheiro e cartão",
  whatsappDefaultMessage: "Olá, vim pelo catálogo da {storeName} e gostaria de atendimento.",
  whatsappProductMessage: "Olá, tenho interesse no produto {codigo} - {nome}. Está disponível?",
};

// ============================================================
// TEXTOS DO SITE
// Edite apenas se quiser mudar frases, títulos ou chamadas.
// ============================================================
const SITE_CONTENT = {
  metaDescription:
    "Catálogo online de moda feminina com novidades, promoções e compra direta pelo WhatsApp.",
  nav: ["Início", "Novidades", "Catálogo", "Promoções", "Looks", "Contato"],
  buttons: {
    whatsapp: "Chamar no WhatsApp",
    buyWhatsapp: "Comprar pelo WhatsApp",
    viewCatalog: "Ver Catálogo",
    viewInstagram: "Ver Instagram",
    sold: "Produto vendido",
    wantLook: "Quero esse look",
  },
  hero: {
    eyebrow: "Moda feminina selecionada",
    title: "Moda feminina escolhida com carinho para você",
    subtitle: "Veja nossas novidades, escolha sua peça favorita e compre direto pelo WhatsApp.",
    image: "assets/hero/moda-feminina.jpg",
    imageAlt: "Arara de roupas femininas selecionadas para catálogo online",
    cardTitle: "Novidades toda semana",
    cardText: "Peças escolhidas para valorizar seu estilo.",
    badges: ["Entrega regional", "Pagamento facilitado", "Atendimento rápido"],
  },
  sections: {
    categoriesEyebrow: "Escolha por estilo",
    categoriesTitle: "Categorias",
    categoryAction: "Ver peças",
    newsEyebrow: "Chegaram agora",
    newsTitle: "Novidades",
    catalogLink: "Ver catálogo completo",
    catalogEyebrow: "Vitrine online",
    catalogTitle: "Catálogo Completo",
    catalogDescription:
      "Filtre por categoria e fale direto com a vendedora para confirmar disponibilidade.",
    promoEyebrow: "Preço especial",
    promoTitle: "Promoções",
    promoText: "Últimas unidades e peças selecionadas com valores especiais.",
    promoAction: "Ver promoções",
    looksEyebrow: "Inspirações prontas",
    looksTitle: "Looks Prontos",
    contactEyebrow: "Fale conosco",
    contactTitle: "Atendimento direto e fácil",
    contactText: "Tire dúvidas, peça fotos reais das peças e combine a melhor forma de entrega.",
    contactCardTitle: "Informações da loja",
  },
  footer: {
    text: "Moda feminina com atendimento carinhoso e compra fácil pelo WhatsApp.",
    rights: "Todos os direitos reservados.",
  },
};

// ============================================================
// CATEGORIAS
// Use exatamente estes nomes no campo categoria dos produtos.
// ============================================================
const CATEGORIES = [
  "Novidades",
  "Blusas",
  "Vestidos",
  "Calças",
  "Shorts",
  "Saias",
  "Conjuntos",
  "Plus Size",
  "Promoções",
];

const CATALOG_FILTERS = [
  "Todos",
  "Blusas",
  "Vestidos",
  "Calças",
  "Shorts",
  "Saias",
  "Conjuntos",
  "Plus Size",
  "Promoções",
];

// ============================================================
// PRODUTOS - CADASTRO PRINCIPAL DA LOJA
//
// Para cadastrar um produto novo:
// - id não pode repetir.
// - código deve seguir a categoria, exemplo BL001, VD001, CJ001.
// - categoria precisa ser igual uma das categorias acima.
// - imagem deve ficar dentro da pasta fotos.
// - status pode ser "Disponível" ou "Vendido".
// - promocao: true mostra preço antigo riscado e preço novo destacado.
// - destaque: true aparece em Novidades.
// - se ainda não tiver foto, deixe imagem: "" ou use um caminho que será trocado depois.
// ============================================================
const PRODUCTS = [
  {
    id: 1,
    codigo: "BL001",
    nome: "Blusa Canelada Rosa",
    categoria: "Blusas",
    tamanhos: "P / M / G",
    cor: "Rosa",
    tecido: "Canelado",
    preco: "49,90",
    precoAntigo: "",
    imagem: "fotos/blusa-canelada-rosa.jpg",
    status: "Disponível",
    destaque: true,
    promocao: false,
    descricao: "Peça confortável e estilosa para o dia a dia.",
  },
  {
    id: 2,
    codigo: "VD001",
    nome: "Vestido Midi Floral",
    categoria: "Vestidos",
    tamanhos: "M / G",
    cor: "Vermelho",
    tecido: "Viscose",
    preco: "89,90",
    precoAntigo: "",
    imagem: "fotos/vestido-midi-floral.jpg",
    status: "Disponível",
    destaque: true,
    promocao: false,
    descricao: "Vestido leve com caimento bonito para momentos especiais.",
  },
  {
    id: 3,
    codigo: "CL001",
    nome: "Calça Pantalona Areia",
    categoria: "Calças",
    tamanhos: "38 / 40 / 42",
    cor: "Areia",
    tecido: "Alfaiataria leve",
    preco: "99,90",
    precoAntigo: "119,90",
    imagem: "fotos/calca-pantalona-areia.jpg",
    status: "Disponível",
    destaque: false,
    promocao: true,
    descricao: "Calça elegante e confortável para compor looks modernos.",
  },
  {
    id: 4,
    codigo: "CJ001",
    nome: "Conjunto Cropped e Saia",
    categoria: "Conjuntos",
    tamanhos: "P / M",
    cor: "Azul",
    tecido: "Renda",
    preco: "129,90",
    precoAntigo: "",
    imagem: "fotos/conjunto-cropped-saia.jpg",
    status: "Disponível",
    destaque: false,
    promocao: false,
    descricao: "Conjunto feminino delicado para uma produção charmosa.",
  },
  {
    id: 5,
    codigo: "PS001",
    nome: "Vestido Envelope Plus",
    categoria: "Plus Size",
    tamanhos: "GG / XG",
    cor: "Verde oliva",
    tecido: "Viscolycra",
    preco: "99,90",
    precoAntigo: "139,90",
    imagem: "fotos/vestido-envelope-plus.jpg",
    status: "Disponível",
    destaque: false,
    promocao: true,
    descricao: "Modelo envelope confortável, bonito e fácil de ajustar ao corpo.",
  },
];

const LOOKS = [
  {
    nome: "Look Casual",
    descricao: "Combinação leve para passeios, almoço em família e rotina com estilo.",
    imagem: "assets/looks/look-casual.jpg",
  },
  {
    nome: "Look para Igreja/Eventos",
    descricao: "Peças elegantes e confortáveis para ocasiões especiais.",
    imagem: "assets/looks/look-igreja-eventos.jpg",
  },
  {
    nome: "Look Dia a Dia",
    descricao: "Praticidade, beleza e conforto para usar sem complicação.",
    imagem: "assets/looks/look-dia-a-dia.jpg",
  },
  {
    nome: "Look Elegante",
    descricao: "Produção refinada para quando você quer se sentir ainda mais confiante.",
    imagem: "assets/looks/look-elegante.jpg",
  },
];

// ============================================================
// MODELOS PRONTOS PARA COPIAR
// Copie um modelo, cole dentro do array PRODUCTS e edite os campos.
// ============================================================

// MODELO PRODUTO NORMAL
// {
//   id: 99,
//   codigo: "BL099",
//   nome: "Nome da peça",
//   categoria: "Blusas",
//   tamanhos: "P / M / G",
//   cor: "Preta",
//   tecido: "Algodão",
//   preco: "59,90",
//   precoAntigo: "",
//   imagem: "fotos/nome-da-foto.jpg",
//   status: "Disponível",
//   destaque: true,
//   promocao: false,
//   descricao: "Descrição curta da peça.",
// },

// MODELO PRODUTO EM PROMOÇÃO
// {
//   id: 100,
//   codigo: "VD100",
//   nome: "Nome da peça em promoção",
//   categoria: "Vestidos",
//   tamanhos: "M / G",
//   cor: "Azul",
//   tecido: "Viscose",
//   preco: "79,90",
//   precoAntigo: "99,90",
//   imagem: "fotos/nome-da-foto.jpg",
//   status: "Disponível",
//   destaque: false,
//   promocao: true,
//   descricao: "Descrição curta da peça.",
// },

// MODELO PRODUTO VENDIDO
// {
//   id: 101,
//   codigo: "CJ101",
//   nome: "Nome da peça vendida",
//   categoria: "Conjuntos",
//   tamanhos: "P / M",
//   cor: "Rosa",
//   tecido: "Malha",
//   preco: "119,90",
//   precoAntigo: "",
//   imagem: "fotos/nome-da-foto.jpg",
//   status: "Vendido",
//   destaque: false,
//   promocao: false,
//   descricao: "Descrição curta da peça.",
// },

// MODELO PRODUTO SEM FOTO
// {
//   id: 102,
//   codigo: "SA102",
//   nome: "Nome da peça sem foto",
//   categoria: "Saias",
//   tamanhos: "P / M / G",
//   cor: "Nude",
//   tecido: "Crepe",
//   preco: "69,90",
//   precoAntigo: "",
//   imagem: "",
//   status: "Disponível",
//   destaque: false,
//   promocao: false,
//   descricao: "Descrição curta da peça.",
// },
