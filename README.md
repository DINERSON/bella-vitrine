# Vitrine Prime

Site catálogo de moda masculina com venda pelo WhatsApp e painel administrativo em `/admin`.

## Estrutura

- `index.html`: vitrine pública.
- `styles.css`: visual da vitrine.
- `script.js`: renderização da vitrine, filtros, produtos e WhatsApp.
- `products.js`: configurações da loja e produtos de exemplo/fallback.
- `firebase-config.js`: credenciais do Firebase Web App.
- `firebase-service.js`: integração com Auth, Firestore e Storage.
- `admin/`: painel privado para cadastrar, editar, vender/disponibilizar e excluir produtos.
- `fotos/`: imagens locais usadas como fallback.
- `firestore.rules`: regras sugeridas para o Firestore.
- `storage.rules`: regras sugeridas para o Firebase Storage.

## Como configurar o Firebase

1. Acesse o Firebase Console e crie um projeto.
2. Dentro do projeto, crie um app Web.
3. Copie o objeto de configuração do Firebase.
4. Cole os dados em `firebase-config.js`, mantendo este formato:

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

5. Em Authentication, habilite o provedor "E-mail/senha".
6. Em Authentication > Users, crie o usuário admin com e-mail e senha.
7. Crie o Firestore Database.
8. Publique as regras de `firestore.rules`.
9. Ative o Firebase Storage.
10. Publique as regras de `storage.rules`.

## Segurança

- A vitrine pública pode ler produtos.
- Apenas usuário logado no Firebase Auth pode cadastrar, editar ou excluir produtos.
- As fotos ficam no Firebase Storage em `products/`.

## Como usar o painel pelo celular

1. Abra `https://SEU-SITE.netlify.app/admin`.
2. Entre com o e-mail e senha criados no Firebase Auth.
3. Toque em "Cadastrar produto".
4. Preencha código, nome, categoria, preço, status e demais campos.
5. Selecione uma foto da galeria do celular.
6. Salve o produto.
7. O produto aparecerá automaticamente na vitrine pública.

## Como publicar no Netlify

Opção manual:

1. Acesse Netlify.
2. Clique em "Add new site" > "Deploy manually".
3. Arraste a pasta inteira do projeto.
4. Depois de publicar, abra "Site configuration" > "Change site name".
5. Escolha um nome como `vitrine-prime` ou mantenha `prime-vitrine`.
6. O link ficará parecido com `https://prime-vitrine.netlify.app`.

Opção pelo GitHub:

1. Envie este projeto para o repositório GitHub.
2. No Netlify, clique em "Add new site" > "Import an existing project".
3. Selecione o repositório.
4. Build command: deixe vazio.
5. Publish directory: deixe como raiz do projeto.
6. Clique em deploy.

## Fallback

Se o Firebase ainda não estiver configurado, a vitrine não quebra. Ela mostra os produtos de exemplo do `products.js` e uma mensagem amigável no catálogo.
