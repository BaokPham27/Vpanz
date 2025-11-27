#!/usr/bin/env python
# shadowAI_api.py

import sys
import os
import json
import torch
import librosa
import pickle
from shadowModel import ShadowNet
from transformers import AutoTokenizer, Wav2Vec2Processor

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE = 16000

# =======================
# Đường dẫn model/labels
# =======================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "shadow_model.pt")
LABEL_PATH = os.path.join(BASE_DIR, "error_labels.pkl")

# =======================
# Load processor & tokenizer
# =======================
wav2vec_proc = Wav2Vec2Processor.from_pretrained(
    "facebook/wav2vec2-base-960h"
)
tokenizer = AutoTokenizer.from_pretrained(
    "cl-tohoku/bert-base-japanese"
)

# =======================
# Load model & labels
# =======================
with open(LABEL_PATH, "rb") as f:
    mlb = pickle.load(f)

model = ShadowNet(n_error_classes=len(mlb.classes_))
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.to(DEVICE)
model.eval()


def load_audio(audio_path: str):
    """Đọc file audio và resample về SAMPLE_RATE"""
    wav, _ = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    return wav.astype("float32")


def predict(audio_path: str, text: str, threshold: float = 0.5):
    """Chạy model, trả về (score, [errors])"""
    model.eval()

    wav = load_audio(audio_path)

    audio_inputs = wav2vec_proc(
        [wav],
        sampling_rate=SAMPLE_RATE,
        return_tensors="pt",
        padding=True,
    )
    for k in audio_inputs:
        audio_inputs[k] = audio_inputs[k].to(DEVICE)

    text_inputs = tokenizer(
        [text],
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128,
    )
    for k in text_inputs:
        text_inputs[k] = text_inputs[k].to(DEVICE)

    with torch.no_grad():
        score, err_logits = model(audio_inputs, text_inputs)
        score = float(score.cpu().item() * 100.0)
        probs = torch.sigmoid(err_logits).cpu().numpy()[0]
        preds = (probs > threshold).astype(int).reshape(1, -1)
        labels = mlb.inverse_transform(preds)[0]

    return score, list(labels)


if __name__ == "__main__":
    audio_path = sys.argv[1]
    text = sys.argv[2]

    score, errors = predict(audio_path, text)
    print(json.dumps({"score": score, "errors": errors}))