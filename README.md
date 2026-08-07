# Jobie PWA

Site PWA funcional de portal de vagas para candidatos, inspirado visualmente no template Jobie. A aplicação ocupa toda a janela do navegador e adapta navegação, conteúdo e grades para celular, tablet e desktop — sem moldura ou simulação de aparelho.

## O que está funcionando

- onboarding em três etapas;
- dashboard personalizado;
- busca por cargo, empresa, local e competência;
- filtros por categoria, modelo de trabalho e contrato;
- listagem de 12 vagas demonstrativas;
- página completa de detalhes da vaga;
- favoritos persistidos no navegador;
- candidatura rápida com confirmação de consentimento;
- acompanhamento das etapas das candidaturas;
- perfil, currículo e indicador de completude;
- layout full-screen responsivo para celular, tablet e desktop;
- navegação lateral no desktop e inferior no celular;
- manifesto de instalação;
- Service Worker, cache do app shell e página offline;
- indicação de conexão online/offline;
- armazenamento local dos dados da demonstração;
- botão para restaurar o estado inicial.

## Testar localmente

Service Workers não funcionam abrindo o arquivo diretamente por file://. Use um servidor local.

Com PHP:

    php -S 127.0.0.1:8080

Depois acesse:

    http://127.0.0.1:8080

Com Node.js:

    npx serve .

O localhost é aceito pelos navegadores como contexto seguro para testes de PWA.

## Instalar

No Chrome ou Edge, abra o menu do navegador e escolha Instalar Jobie. No iPhone, use Compartilhar e depois Adicionar à Tela de Início.

## Estrutura

    /
    ├── index.html
    ├── manifest.webmanifest
    ├── sw.js
    ├── offline.html
    ├── assets/
    │   ├── css/app.css
    │   ├── js/app.js
    │   ├── js/jobs.js
    │   └── icons/
    ├── ATTRIBUTION.md
    └── LICENSE

## Dados e integração

Esta entrega é um front-end funcional com dados demonstrativos em JavaScript e persistência via localStorage. Os pontos indicados como preparados para o backend — autenticação, upload real, notificações e painel do recrutador — devem ser conectados posteriormente a uma API.

O estado da demonstração fica na chave:

    jobie-pwa-state-v1

## Download

Use Code > Download ZIP no GitHub ou acesse:

https://github.com/regilton/pwa_futcerto/archive/refs/heads/main.zip
