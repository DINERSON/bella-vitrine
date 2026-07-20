# Vitrine Moda

Site catalogo da Vitrine Moda com venda pelo WhatsApp e painel administrativo em `/admin`.

## O que existe no projeto

- `/`: vitrine publica para clientes.
- `/admin`: painel privado para a dona da loja cadastrar produtos pelo celular.
- `products.js`: produtos e configuracoes locais de fallback.
- `firebase-config.js`: local onde entram as credenciais do Firebase.
- `firebase-service.js`: integracao com Firebase Auth, Firestore e Storage.
- `admin/index.html`, `admin/admin.css`, `admin/admin.js`: painel administrativo.
- `firestore.rules` e `storage.rules`: regras recomendadas de seguranca.

Nao existe carrinho, pagamento online, login para cliente nem backend proprio.

## Como configurar Firebase

1. Acesse o Firebase Console e crie um projeto.
2. Em Project settings, crie um app Web.
3. Copie o objeto `firebaseConfig`.
4. Cole os dados em `firebase-config.js`:

```js
window.FIREBASE_CONFIG = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxx",
};
```

5. Em Authentication, habilite o provedor `Email/password`.
6. Em Authentication > Users, crie o usuario admin com e-mail e senha.
7. Crie o Firestore Database.
8. Publique o conteudo de `firestore.rules`.
9. Ative o Firebase Storage.
10. Publique o conteudo de `storage.rules`.
11. Em Authentication > Configuracoes > Dominios autorizados, adicione:

```text
dinerson.github.io
```

Quando usar dominio proprio, adicione tambem:

```text
vitrinemoda.com.br
```

## Regras de seguranca

Firestore:

- leitura publica para `products` e `settings`;
- escrita apenas para usuario autenticado.

Storage:

- leitura publica das imagens em `products/`;
- upload/escrita apenas para usuario autenticado.

## Como acessar o admin

Depois de publicar o site:

```text
https://dinerson.github.io/bella-vitrine/admin/
```

Entre com o e-mail e senha criados no Firebase Auth.

## O que da para editar no admin

Em `Configuracoes da loja`:

- nome da loja;
- URL da logo;
- WhatsApp principal;
- Instagram;
- cidade;
- texto de entrega;
- formas de pagamento;
- mensagem padrao do WhatsApp;
- titulo principal do banner;
- subtitulo do banner.

Esses dados ficam no Firestore em:

```text
settings/store
```

A vitrine publica le esse documento automaticamente. Se o Firebase falhar, o site usa o fallback do `products.js`.

## Como cadastrar produto

No painel `/admin`, toque em `Cadastrar produto` e preencha:

- codigo;
- nome;
- categoria;
- subcategoria;
- descricao;
- cor;
- tecido;
- preco atual;
- preco antigo;
- promocao;
- status;
- destaque;
- mais vendidos;
- estoque por tamanho;
- fotos.

O estoque por tamanho e salvo como `sizesStock`, por exemplo:

```js
sizesStock: {
  P: 2,
  M: 0,
  G: 4,
  GG: 0,
  XL: 1,
  Unico: 0,
}
```

Se todos os tamanhos estiverem com estoque `0`, o produto aparece como esgotado na vitrine.

## Como cadastrar fotos

No cadastro de produto, as fotos sao enviadas direto pelo painel admin.

Selecione `Foto principal`, `Foto 2`, `Foto 3` e `Foto 4`.
As imagens vao para o Firebase Storage na pasta `products/`.
Sao aceitos arquivos `jpg`, `jpeg`, `png` e `webp`.

Ao editar um produto, as fotos atuais aparecem no preview. Voce pode trocar uma foto escolhendo outro arquivo ou remover a foto pelo botao `Remover foto`.

Os arquivos enviados pelo painel seguem este formato:

```text
products/{codigoProduto}-{timestamp}-{numero}.jpg
```

Depois do upload, o painel salva a URL publica no Firestore:

- a primeira foto disponivel fica em `imagem`;
- todas as fotos ficam no array `imagens`.

Assim a vitrine publica e o modal de detalhes carregam automaticamente as fotos cadastradas no painel.

## WhatsApp

O numero do WhatsApp vem das configuracoes da loja salvas no admin.

Mensagem geral:

```text
Ola, vim pelo catalogo da Vitrine Moda e gostaria de atendimento.
```

Mensagem de produto:

```text
Ola, tenho interesse no produto [CODIGO] - [NOME]. Esta disponivel?
```

Mensagem com tamanho:

```text
Ola, tenho interesse no produto [CODIGO] - [NOME], tamanho/numero [TAMANHO]. Esta disponivel?
```

## Como publicar no GitHub Pages

Este projeto e estatico e nao precisa de comando de build. O GitHub Pages deve publicar a raiz do repositorio.

1. Acesse o repositorio `DINERSON/bella-vitrine` no GitHub.
2. Clique em `Settings`.
3. No menu lateral, clique em `Pages`.
4. Em `Build and deployment`, selecione `Deploy from a branch`.
5. Em `Branch`, escolha `main`.
6. Em `Folder`, escolha `/root`.
7. Clique em `Save`.
8. Aguarde o GitHub gerar o link.

Links esperados:

```text
Site:  https://dinerson.github.io/bella-vitrine/
Admin: https://dinerson.github.io/bella-vitrine/admin/
```

Depois de publicar, confira no Firebase Console:

1. Abra Authentication.
2. Clique em `Configuracoes`.
3. Entre em `Dominios autorizados`.
4. Confirme que `dinerson.github.io` esta cadastrado.

Sem esse dominio autorizado, o login do `/admin/` pode ser bloqueado pelo Firebase Auth.

## Dominio proprio futuramente

Quando comprar um dominio, por exemplo `vitrinemoda.com.br`:

1. No GitHub, acesse `Settings > Pages`.
2. Em `Custom domain`, digite `vitrinemoda.com.br`.
3. Salve e siga as instrucoes de DNS mostradas pelo GitHub Pages no provedor do dominio.
4. Aguarde a propagacao do DNS.
5. No Firebase Console, abra `Authentication > Configuracoes > Dominios autorizados`.
6. Adicione `vitrinemoda.com.br`.

Depois disso, o site publico e o painel admin continuam os mesmos, apenas usando o dominio proprio.

## Fallback

Se o Firebase ainda nao estiver configurado, a vitrine nao quebra:

- usa produtos de exemplo do `products.js`;
- usa configuracoes locais do `products.js`;
- mostra aviso discreto no catalogo/console;
- o admin mostra mensagem pedindo configuracao do Firebase.
