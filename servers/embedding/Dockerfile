# BGE-M3 임베딩 서비스 (.158, GTX 1660S · 드라이버 535 → CUDA 12.1)
# torch는 PyTorch 베이스 이미지가 제공(cu121). 모델은 런타임에 HF에서 받아 캐시 볼륨에 보관.
FROM pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime

WORKDIR /app
RUN pip install --no-cache-dir -U pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
