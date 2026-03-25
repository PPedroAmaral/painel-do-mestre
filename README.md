# 🐉 Painel do Mestre (SaaS para RPG)

[![Deploy com Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://painel-do-mestre.vercel.app/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)

![Demonstração do Painel do Mestre](./public/Captura%20de%20tela%202026-03-07%20202459.png)

Um sistema completo de gerenciamento de campanhas de RPG de mesa (Tabletop RPG), desenvolvido para auxiliar Mestres a controlar combates, vida dos jogadores e consultar bestiários em tempo real.

Este projeto foi construído para demonstrar habilidades avançadas de engenharia de software no desenvolvimento Full-Stack, indo muito além de uma interface estática.

## 🎯 Desafios Técnicos Resolvidos

Este projeto foi desenhado para cobrir 5 pilares fundamentais do desenvolvimento moderno:

* **🗄️ Banco de Dados & SQL (Supabase/PostgreSQL):** Modelagem de banco de dados relacional (Campanhas, Personagens, Logs de Combate). Implementação de um CRUD completo conectado diretamente ao Next.js.
* **📊 Dashboards e Relatórios (Recharts):** Conversão de dados brutos do banco de dados em um dashboard interativo, calculando total de dano causado e cura realizada por sessão.
* **🌐 Integração de Sistemas via API (Fetch):** Consumo em tempo real da `D&D 5e API` para buscar atributos de monstros dinamicamente.
* **🤖 Automações (Webhooks):** Integração nativa com o Discord. O sistema formata os dados da sessão (incluindo baixas em combate) e dispara uma requisição POST formatada (Embed) para notificar os jogadores.
* **⚙️ Regras de Negócio em JavaScript:** Lógica complexa de estado (State Management) para calcular porcentagens de HP, e um sistema algorítmico de "Testes de Morte" (Death Saves) com contadores de sucessos, falhas e alteração de status visual (Morto/Vivo).

## ✨ Funcionalidades

- **Gestão de Combate:** Adicione danos e curas, e veja a barra de HP (e as cores) mudarem em tempo real.
- **Sistema de Testes de Morte:** Quando um jogador cai a 0 HP, uma interface de rolagem de morte é ativada. Com 3 falhas, o personagem é permanentemente marcado como morto e perde a cor no painel.
- **Bestiário Dinâmico:** Barra de pesquisa que consome uma API externa para trazer atributos de monstros (AC, HP) instantaneamente.
- **Relatório no Discord:** Envio automático do resumo da sessão com um clique, identificando quem mais deu dano e reportando mortes na equipe.
- **Dark/Light Mode:** Alternância de temas fluida construída com Tailwind CSS.

## 🚀 Tecnologias Utilizadas

* **Front-end:** Next.js (App Router), React, Tailwind CSS v4.
* **Back-end/BaaS:** Supabase (PostgreSQL).
* **Gráficos:** Recharts.
* **APIs Externas:** D&D 5e API, Discord Webhooks API.

## 🛠️ Como rodar localmente

1. Clone o repositório: `git clone https://github.com/SEU_USUARIO/painel-do-mestre.git`
2. Instale as dependências: `npm install`
3. Crie um arquivo `.env.local` na raiz e adicione suas variáveis do Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave
4. Inicie o servidor: npm run dev

Desenvolvido por Pedro Amaral.
