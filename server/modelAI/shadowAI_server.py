from fastapi import FastAPI, UploadFile, Form
from shadowAI_api import predict
import tempfile
import shutil
import os
import uvicorn

app = FastAPI(title="Shadow AI Server")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/predict")
async def predict_api(file: UploadFile, text: str = Form(...)):
    tmp_path = tempfile.mktemp(suffix=".wav")
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        score, errors = predict(tmp_path, text)
        return {"score": score, "errors": errors}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
