#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 Iniciando Uber Finance Control..."
echo "📂 Directorio: $(pwd)"

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Get Local IP
IP=$(ipconfig getifaddr en0)
echo "---------------------------------------------------"
echo "✅ Servidor Iniciado"
echo "📱 Acceso Local (Mac):  http://localhost:5173"
if [ ! -z "$IP" ]; then
    echo "📲 Acceso iPad/Móvil: http://$IP:5173"
else
    echo "📲 Acceso iPad/Móvil: Revisa tu IP manualmente en Preferencias de Sistema"
fi
echo "---------------------------------------------------"
echo "⚠️  No cierres esta ventana mientras uses la app."
echo ""

# Run dev server with host exposed
npm run dev -- --host
