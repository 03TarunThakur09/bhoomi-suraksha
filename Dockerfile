# ══════════════════════════════════════════════════════════════
# Bhoomi Suraksha — Backend Dockerfile
# Multi-stage build: install deps → slim runtime image
# ══════════════════════════════════════════════════════════════

# ── Stage 1: Builder ─────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# System libraries required by PaddleOCR, EasyOCR, and OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgl1 \
    libgles2 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker cache)
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download OCR models at build time so first request is instant
RUN python -c "import easyocr; easyocr.Reader(['hi', 'en'], gpu=False)" && \
    python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='hi', use_gpu=False, show_log=False)"

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Same system libraries needed at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgl1 \
    libgles2 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy pre-downloaded OCR model files
COPY --from=builder /root/.EasyOCR /root/.EasyOCR
COPY --from=builder /root/.paddleocr /root/.paddleocr

# Copy application code
COPY app/ ./app/
COPY main.py ./

# Create uploads directory
RUN mkdir -p /app/uploads

# Non-root user for security
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
