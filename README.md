<div align="center">
  <h1>💻 Gestão de Controle de CPUs e Headsets</h1>
  <p><em>Sistema web moderno para gestão de estoque, alocação de CPUs em Posições de Atendimento (PAs) e controle de headsets danificados.</em></p>
</div>

---

## ✨ Principais Funcionalidades

- 🏢 **Gestão de Salas e PAs:** Adição, remoção e monitoramento de capacidade de salas e PAs em tempo real.
- 📦 **Estoque e Rastreamento de CPUs:** Cadastro completo de CPUs, edição, exclusão e rotulagem de origem e aquisições de forma dinâmica.
- 🎧 **Gestão de Headsets & Danificados:** Controle de estoque de headsets funcionais, registro de defeitos, separação por caixas e gerenciamento de envios/retornos de manutenção.
- 🖱️ **Interface Drag & Drop:** Movimente as máquinas livremente entre o estoque e as posições arrastando com o mouse.
- 📝 **Histórico e Relatórios:** Registro automático de movimentações e exportação de relatórios em Excel (`.xlsx`).
- 👥 **Controle de Acesso & Autenticação:** Login seguro via backend utilizando criptografia de senhas com `bcrypt`.
- ☁️ **Cloud Database:** Integração com PostgreSQL via Prisma ORM em container Docker gerenciado pelo Easypanel.
- 🎨 **Design Premium:** UI moderna com suporte nativo a Tema Claro (☀️) e Tema Escuro (🌙).

## 🛠️ Tecnologias Utilizadas

- **[React 19](https://reactjs.org/)** - Renderização reativa e componentização no Frontend.
- **[Vite](https://vitejs.dev/)** - Build tool e servidor de desenvolvimento frontend.
- **[Node.js / Express](https://expressjs.com/)** - Backend API para autenticação e sincronização de estado.
- **[Prisma ORM](https://www.prisma.io/)** - Mapeamento e queries seguras para banco relacional.
- **[PostgreSQL](https://www.postgresql.org/)** - Banco de dados relacional.
- **[Docker & Nginx](https://www.docker.com/)** - Conteinerização e proxy reverso para produção.

## 🚀 Como Executar em Produção (Docker)

A aplicação é executada via Docker Compose:

```bash
docker compose up -d --build
```

---

<div align="center">
  <p>Desenvolvido com 💙 para a otimização de parques tecnológicos.</p>
</div>
