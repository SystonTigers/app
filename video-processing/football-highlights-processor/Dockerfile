# Production Dockerfile for Football Highlights Processor
FROM node:18-bullseye-slim

# Install system dependencies for video processing and AI
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    build-essential \
    cmake \
    pkg-config \
    libopencv-dev \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libswscale-dev \
    libavresample-dev \
    libtesseract-dev \
    curl \
    git \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for AI models
RUN pip3 install --no-cache-dir \
    tensorflow==2.13.0 \
    opencv-python==4.8.0.76 \
    numpy==1.24.3 \
    Pillow==10.0.0 \
    torch==2.0.1 \
    scikit-learn==1.3.0

# Create app user for security
RUN useradd -r -s /bin/false -u 1001 nodejs

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY --chown=nodejs:nodejs package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && \
    npm cache clean --force && \
    chown -R nodejs:nodejs /app/node_modules

# Copy application code
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs lib/ ./lib/
COPY --chown=nodejs:nodejs deployment/ ./deployment/
COPY --chown=nodejs:nodejs models/ ./models/

# Create necessary directories with proper permissions
RUN mkdir -p /tmp/uploads /tmp/processing /tmp/outputs /app/logs /app/data /app/secrets && \
    chown -R nodejs:nodejs /tmp/uploads /tmp/processing /tmp/outputs /app/logs /app/data /app/secrets && \
    chmod -R 755 /tmp/uploads /tmp/processing /tmp/outputs /app/logs /app/data && \
    chmod 700 /app/secrets

# Set environment variables
ENV NODE_ENV=production
ENV TZ=UTC
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/google-credentials.json
ENV LOG_LEVEL=info
ENV PORT=8080
ENV REDIS_URL=redis://localhost:6379
ENV MAX_MEMORY=2GB
ENV MAX_CONCURRENT_JOBS=3

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check with more comprehensive checks
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start Redis and application
CMD ["sh", "-c", "redis-server --daemonize yes && node src/server.js"]