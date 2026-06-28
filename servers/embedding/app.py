"""BGE-M3 임베딩 서비스 (.158 GTX 1660S).
글 → dense(1024) + sparse(lexical weights). corpus·뉴스·질문을 양방향 벡터화.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel
from FlagEmbedding import BGEM3FlagModel

MODEL_NAME = os.getenv("EMBED_MODEL", "BAAI/bge-m3")
_state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # fp16: 1660S(Turing)는 FP16 지원 → 메모리·속도 이득
    _state["model"] = BGEM3FlagModel(MODEL_NAME, use_fp16=True)
    yield
    _state.clear()


app = FastAPI(title="bge-m3-embed", lifespan=lifespan)


class EmbedReq(BaseModel):
    texts: list[str]
    dense: bool = True
    sparse: bool = True


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "loaded": "model" in _state}


@app.post("/embed")
def embed(req: EmbedReq):
    out = _state["model"].encode(
        req.texts, return_dense=req.dense, return_sparse=req.sparse, return_colbert_vecs=False
    )
    resp = {"dim": 1024, "count": len(req.texts)}
    if req.dense:
        resp["dense"] = out["dense_vecs"].tolist()
    if req.sparse:
        # lexical_weights: per-text {token_id: weight} → ES sparse_vector 친화 형태
        resp["sparse"] = [{str(k): float(v) for k, v in lw.items()} for lw in out["lexical_weights"]]
    return resp
