# Nome da Loja - Catálogo de Moda Feminina

Site vitrine simples para vender pelo WhatsApp, sem login, carrinho, pagamento online ou banco de dados.

## Como rodar

Abra `index.html` no navegador.

Se preferir, rode com Live Server no VS Code ou outro servidor estático apontando para esta pasta.

## Cadastro da loja

O arquivo principal para cadastrar e editar tudo é `products.js`.

No topo de `products.js`, edite:

- `STORE_CONFIG.storeName`: nome da loja
- `STORE_CONFIG.logoInitials`: iniciais da logo
- `STORE_CONFIG.whatsappNumber`: número do WhatsApp com país + DDD
- `STORE_CONFIG.instagramUser`: usuário do Instagram
- `STORE_CONFIG.instagramUrl`: link do Instagram
- `STORE_CONFIG.city`: cidade
- `STORE_CONFIG.deliveryText`: texto de entrega
- `STORE_CONFIG.paymentMethods`: formas de pagamento
- `STORE_CONFIG.whatsappDefaultMessage`: mensagem geral do WhatsApp
- `STORE_CONFIG.whatsappProductMessage`: mensagem dos produtos

## Cadastro de produtos

Os produtos ficam no array `PRODUCTS`, também em `products.js`.

Para cadastrar uma roupa nova:

1. Copie um produto existente ou um modelo comentado no final do arquivo.
2. Cole dentro do array `PRODUCTS`.
3. Troque `id`, `codigo`, `nome`, `categoria`, `tamanhos`, `cor`, `tecido`, `preco`, `imagem`, `status` e `descricao`.

Regras importantes:

- `id` não pode repetir.
- `categoria` deve ser igual a uma das categorias cadastradas.
- `status` deve ser `"Disponível"` ou `"Vendido"`.
- `promocao: true` mostra preço antigo riscado.
- `destaque: true` faz aparecer em Novidades.

## Fotos

Coloque as fotos na pasta `fotos`.

Exemplo:

```js
imagem: "fotos/blusa-canelada-rosa.jpg",
```

Se a foto não existir ou o campo `imagem` ficar vazio, o site mostra “Foto em breve” sem quebrar o layout.

## Cores

As cores ficam no início de `styles.css`, dentro de `:root`.
