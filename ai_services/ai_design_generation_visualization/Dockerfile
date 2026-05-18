FROM python:3.12

LABEL maintainer="hasaanqureshi"

WORKDIR /code

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip
RUN pip install uv

COPY pyproject.toml /code/pyproject.toml
COPY . .

# RUN --mount=type=cache,target=/root/.cache/uv uv sync 

EXPOSE 8000

# Production-ready command without --reload
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
