FROM node:25-bookworm

# ===================================
# Install System Dependencies
# ===================================
RUN apt-get update && apt-get install -y \
    # Python for WeasyPrint
    python3 \
    python3-pip \
    python3-cffi \
    python3-brotli \
    # WeasyPrint dependencies
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz-subset0 \
    libjpeg62-turbo \
    libopenjp2-7 \
    libffi-dev \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    shared-mime-info \
    # Fonts
    fonts-liberation \
    fonts-dejavu-core \
    # Chromium for Paged.js/Vivliostyle
    chromium \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    # Utilities
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ===================================
# Install WeasyPrint
# ===================================
RUN pip3 install --break-system-packages \
    weasyprint \
    Pillow

# ===================================
# Configure Puppeteer
# ===================================
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ===================================
# Setup Application
# ===================================
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm install

# Copy application code
COPY . .

# Build TypeScript - stelle sicher, dass devDependencies für den Build installiert sind
RUN npm ci --include=dev \
    && npm run build \
    && npm prune --production

# Install PDF renderers globally
RUN npm install -g \
    pagedjs-cli \
    @vivliostyle/cli

# ===================================
# Create directories and user
# ===================================
RUN mkdir -p /app/storage/temp /app/storage/cache /tmp/assets && \
    useradd -m -u 1001 pdfuser && \
    chown -R pdfuser:pdfuser /app /tmp/assets

# Switch to non-root user
USER pdfuser

# ===================================
# Health check
# ===================================
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3000

# Default command (overridden in docker-compose)
CMD ["node", "dist/api.js"]