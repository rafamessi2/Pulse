# 💜 Pulse – Fit Tracker

App web pessoal para acompanhamento de treinos de musculação e corrida. PWA instalável, 100% offline, sem conta, sem servidor.

---

## ✨ Funcionalidades

- 🏋️ **Treinos ABCDE** — registro de séries, cargas, repetições, timer de descanso
- 🏃 **Cardio** — templates de corrida, pace calculado automaticamente, esforço percebido
- 📈 **Histórico** — cronológico com expansão de detalhes, recordes pessoais
- 🏠 **Dashboard** — progresso semanal, última atividade, próximo treino sugerido
- ⚙️ **Backup/Restore** — exportar e importar JSON completo
- 📱 **PWA** — instalável na tela inicial, funciona offline

---

## 🚀 Rodando localmente

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Passo a passo

```bash
# 1. Entre na pasta do projeto
cd pulse

# 2. Instale as dependências
npm install

# 3. Rode em desenvolvimento
npm run dev
```

Acesse: **http://localhost:3000**

> **Nota:** O PWA é desabilitado automaticamente em desenvolvimento. Para testar o PWA, faça o build de produção.

### Build de produção

```bash
npm run build
npm run start
```

---

## 🌐 Deploy na Vercel (recomendado)

### Opção 1 — Via Git (mais fácil)

1. Faça push do projeto para um repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**
3. Importe o repositório
4. As configurações são detectadas automaticamente (Next.js)
5. Clique em **Deploy** ✅

### Opção 2 — Via CLI

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Na pasta do projeto
vercel

# Siga as instruções no terminal
# Para produção:
vercel --prod
```

### Variáveis de ambiente (opcional)
Nenhuma variável obrigatória. O arquivo `.env.local` já tem o necessário.

---

## 📱 Instalando como PWA

### Android (Chrome)
1. Abra o app no Chrome
2. Toque nos 3 pontos no canto superior direito
3. **"Adicionar à tela inicial"**

### iOS (Safari)
1. Abra o app no Safari
2. Toque no ícone de compartilhar (quadrado com seta)
3. **"Adicionar à Tela de Início"**

---

## 🗂️ Estrutura do projeto

```
pulse/
├── app/                  # Páginas (Next.js App Router)
│   ├── page.tsx          # Dashboard
│   ├── treino/           # Musculação
│   ├── cardio/           # Corrida
│   ├── historico/        # Histórico
│   └── configuracoes/    # Configurações
├── components/
│   ├── layout/           # BottomNav, DbProvider
│   ├── treino/           # ActiveWorkout
│   ├── cardio/           # CardioLogForm
│   └── ui/               # Button, Card, Input, etc.
├── lib/
│   ├── db.ts             # Dexie.js database + queries
│   └── utils.ts          # Helpers
├── types/
│   └── index.ts          # TypeScript types
└── public/
    ├── manifest.json     # PWA manifest
    ├── offline.html      # Fallback offline
    └── icons/            # Ícones PWA (gerados)
```

---

## 🛠️ Stack técnica

| Tecnologia | Uso |
|------------|-----|
| Next.js 15 | Framework React com App Router |
| TypeScript | Tipagem estática |
| Tailwind CSS | Estilização utility-first |
| Dexie.js | IndexedDB wrapper (banco local) |
| Framer Motion | Animações suaves |
| Radix UI | Componentes acessíveis |
| next-pwa | Service Worker + PWA |
| Lucide Icons | Ícones modernos |

---

## 🎨 Design System

- **Cores principais:** Rosa `#FF3D7F` e Roxo `#A855F7`
- **Tema:** Dark por padrão
- **Raio de borda:** 16px (cards), 12px (botões)
- **Tipografia:** Inter (Google Fonts)

---

Feito com 💜 para uso pessoal.
