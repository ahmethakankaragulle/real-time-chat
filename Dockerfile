FROM node:18-alpine

WORKDIR /app

# Package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --only=production

# Uygulama kodlarını kopyala
COPY . .

# Logs dizinini oluştur
RUN mkdir -p logs

# Port 3001'i expose et
EXPOSE 3001

# Uygulamayı başlat
CMD ["node", "index.js"] 