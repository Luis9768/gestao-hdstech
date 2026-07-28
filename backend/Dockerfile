FROM node:18-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o schema do Prisma e o código
COPY prisma ./prisma/
COPY . .

# Gera o Prisma Client
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
