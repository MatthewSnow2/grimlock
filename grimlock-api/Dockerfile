# GRIMLOCK API Dockerfile
# Multi-stage build for production

# Stage 1: Build
FROM python:3.12-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package installation
RUN pip install --no-cache-dir uv

# Copy project files
COPY pyproject.toml .
COPY grimlock_api grimlock_api/

# Install dependencies
RUN uv pip install --system --no-cache-dir -e .

# Stage 2: Runtime
FROM python:3.12-slim as runtime

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY grimlock_api grimlock_api/
COPY alembic alembic/
COPY alembic.ini .

# Create non-root user
RUN useradd -m -u 1000 grimlock && chown -R grimlock:grimlock /app
USER grimlock

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/health')" || exit 1

# Run the application
CMD ["uvicorn", "grimlock_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
