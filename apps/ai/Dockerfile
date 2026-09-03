# Production Dockerfile for TaskFlow Python AI Subsystem
FROM python:3.13-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Create non-root system user for security
RUN groupadd -g 10001 taskflow && \
    useradd -u 10001 -g taskflow -s /bin/bash -m taskflow

# Install version-constrained dependencies with layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and configuration
COPY pyproject.toml ./
COPY app ./app

# Ensure non-root ownership
RUN chown -R taskflow:taskflow /app

USER taskflow

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').getcode() == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
