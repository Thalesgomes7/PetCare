# PetCare 🐾

Aplicação web para gestão de pet shop, com cadastro de tutores, pets e agendamentos.

## Funcionalidades
- Dashboard com indicadores e próximos atendimentos.
- Cadastro e busca de tutores e pets.
- Agendamento de banho, tosa, consultas e vacinação.
- Busca e filtro de agendamentos por status.
- Concluir, cancelar e excluir agendamentos.
- Validação dos formulários e prevenção de horários duplicados.
- Salvamento automático dos dados no navegador (`localStorage`).
- Interface responsiva.

## Tecnologias
HTML5, CSS3 e JavaScript.

## Executar localmente
1. Baixe ou clone este repositório.
2. Abra a pasta do projeto.
3. Abra o arquivo `index.html` no navegador.

Não é necessário instalar Node.js, executar `npm install` ou iniciar um servidor.

## Publicar no GitHub Pages
1. Crie um repositório público no GitHub.
2. Envie os arquivos `index.html`, `styles.css`, `app.js` e `.nojekyll` para a raiz do repositório.
3. No GitHub, abra **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`, depois clique em **Save**.
6. Aguarde a publicação e acesse o endereço informado pelo GitHub Pages.

## Sobre o armazenamento
Esta versão usa `localStorage`. Os registros ficam salvos no navegador e no dispositivo em que foram cadastrados. Eles não são enviados para uma nuvem nem compartilhados automaticamente com outras pessoas. Limpar os dados do navegador pode apagar os registros.

Para um sistema multiusuário, com dados compartilhados e acesso por diferentes dispositivos, será necessário conectar o projeto a um backend hospedado e a um banco de dados.

## Observação
Esta é uma versão estática para demonstração e portfólio. Não possui autenticação de usuários nem sincronização entre dispositivos.
