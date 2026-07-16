# Vitrine Prime

Site catalogo da Vitrine Prime com venda pelo WhatsApp e painel administrativo em `/admin`.

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
https://SEU-SITE.netlify.app/admin
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
  XG: 1,
  Unico: 0,
}
```

Se todos os tamanhos estiverem com estoque `0`, o produto aparece como esgotado na vitrine.

## Como cadastrar fotos

Existem duas formas:

1. Upload pelo celular:
   selecione Foto principal, Foto 2, Foto 3 e Foto 4. As imagens vao para o Firebase Storage.

2. URL manual:
   cole URLs nos campos `Imagem principal`, `Foto 2`, `Foto 3` e `Foto 4`.

Se o Storage ainda nao estiver configurado, use os campos de URL.

## WhatsApp

O numero do WhatsApp vem das configuracoes da loja salvas no admin.

Mensagem geral:

```text
Ola, vim pelo catalogo da Vitrine Prime e gostaria de atendimento.
```

Mensagem de produto:

```text
Ola, tenho interesse no produto [CODIGO] - [NOME]. Esta disponivel?
```

Mensagem com tamanho:

```text
Ola, tenho interesse no produto [CODIGO] - [NOME], tamanho [TAMANHO]. Esta disponivel?
```

## Como publicar no Netlify

Publicacao manual:

1. Acesse o Netlify.
2. Clique em `Add new site`.
3. Clique em `Deploy manually`.
4. Arraste a pasta inteira do projeto.
5. Depois do deploy, va em `Site configuration`.
6. Clique em `Change site name`.
7. Escolha um nome como `vitrine-prime`.

O link ficara parecido com:

```text
https://vitrine-prime.netlify.app
```

Publicacao pelo GitHub:

1. Envie este projeto para o GitHub.
2. No Netlify, clique em `Add new site`.
3. Clique em `Import an existing project`.
4. Selecione o repositorio.
5. Build command: deixe vazio.
6. Publish directory: use a raiz do projeto.
7. Publique.

## Fallback

Se o Firebase ainda nao estiver configurado, a vitrine nao quebra:

- usa produtos de exemplo do `products.js`;
- usa configuracoes locais do `products.js`;
- mostra aviso discreto no catalogo/console;
- o admin mostra mensagem pedindo configuracao do Firebase.
