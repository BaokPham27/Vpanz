# shadow_simple.py
import os
import random
import pickle
from typing import List

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
import librosa
from torch.utils.data import Dataset, DataLoader

from sklearn.preprocessing import MultiLabelBinarizer
from transformers import Wav2Vec2Processor, Wav2Vec2Model, AutoTokenizer, AutoModel
import unicodedata

# --------- Config ----------
WAV2VEC_MODEL = "facebook/wav2vec2-base-960h"
TEXT_MODEL = "cl-tohoku/bert-base-japanese"
SAMPLE_RATE = 16000

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SEED = 42

# Training defaults tuned for small dataset
DEFAULT_EPOCHS = 10
DEFAULT_BATCH = 4
DEFAULT_LR = 1e-5
FREEZE_PRETRAINED = True
NUM_WORKERS = 0

# reproducibility
torch.manual_seed(SEED)
np.random.seed(SEED)
random.seed(SEED)

# --------- Dataset ----------
class ShadowDataset(Dataset):
    """
    Expects CSV with columns:
      - id (base filename without .wav)
      - scrip (text transcription)
      - score or scord (numeric score)
      - error (comma-separated error labels, can be empty)
    """
    def __init__(self, csv_path: str, audio_folder: str):
        # tự động detect encoding: utf-8-sig / shift_jis / cp1252
        encodings = ["utf-8-sig", "shift_jis", "cp1252"]
        for enc in encodings:
            try:
                self.df = pd.read_csv(csv_path, sep=",", encoding=enc)
                print(f"✅ CSV loaded with encoding: {enc}")
                break
            except Exception:
                print(f"  Trying {enc}... failed")
                continue
        else:
            # fallback: try without sep parameter
            try:
                self.df = pd.read_csv(csv_path, encoding='utf-8-sig')
                print(f"✅ CSV loaded (default separator)")
            except Exception as e:
                print(f"❌ CSV load error: {e}")
                print(f"❌ File path: {os.path.abspath(csv_path)}")
                raise ValueError(f"Failed to read CSV at {csv_path}")

        # unify column names
        if "score" not in self.df.columns and "scord" in self.df.columns:
            self.df = self.df.rename(columns={"scord": "score"})
        if "score" not in self.df.columns:
            raise ValueError("CSV must contain 'score' or 'scord' column")

        # fill missing columns
        if "error" not in self.df.columns:
            self.df["error"] = ""
        if "scrip" not in self.df.columns:
            self.df["scrip"] = ""

        # normalize Unicode, remove invalid characters
        def clean_text(text):
            if pd.isna(text):
                return ""
            # chuẩn hóa Unicode
            text = unicodedata.normalize("NFC", str(text))
            # loại bỏ ký tự lạ không in được
            text = "".join([c if unicodedata.category(c)[0] != "C" else " " for c in text])
            return text.strip()

        self.df["scrip"] = self.df["scrip"].apply(clean_text)
        self.df["error"] = self.df["error"].apply(clean_text)

        # split error column -> list of strings
        def _split_errors(x):
            if pd.isna(x) or str(x).strip() == "":
                return []
            parts = [p.strip() for p in str(x).replace(";", ",").split(",") if p.strip() != ""]
            return parts

        self.df["error_list"] = self.df["error"].apply(_split_errors)
        self.audio_folder = audio_folder

        # fit MultiLabelBinarizer on whole dataset
        self.mlb = MultiLabelBinarizer(sparse_output=False)
        self.mlb.fit(self.df["error_list"].tolist())
        # build error matrix and store as list per row
        error_matrix = self.mlb.transform(self.df["error_list"].tolist())
        self.df["error_vec"] = error_matrix.tolist()

        # compute pos_weight for each class: ratio of negatives / positives
        pos_counts = error_matrix.sum(axis=0).astype(float)  # positives per class
        neg_counts = max(1.0, len(self.df)) - pos_counts
        # avoid zeros
        pos_counts_safe = np.where(pos_counts > 0, pos_counts, 1.0)
        pos_weight = neg_counts / pos_counts_safe
        # clamp extreme values
        pos_weight = np.clip(pos_weight, 0.1, 100.0)
        self.class_pos_weight = torch.tensor(pos_weight, dtype=torch.float32)

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        file_id = str(row["id"])
        audio_path = os.path.join(self.audio_folder, file_id + ".wav")

        if not os.path.exists(audio_path):
            print(f"⚠ Missing audio: {audio_path}, using silent buffer")
            wav = np.zeros(int(0.5 * SAMPLE_RATE), dtype="float32")
        else:
            try:
                wav, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
                wav = wav.astype("float32")
            except Exception:
                print(f"⚠ Corrupt audio: {audio_path}, using silent buffer")
                wav = np.zeros(int(0.5 * SAMPLE_RATE), dtype="float32")

        text = str(row.get("scrip", "") or "")
        score = float(row["score"]) / 100.0
        error_vec = np.array(row["error_vec"], dtype=np.float32)
        return wav, text, np.float32(score), error_vec

# --------- Processors (pretrained) ----------
wav2vec_proc = Wav2Vec2Processor.from_pretrained(WAV2VEC_MODEL)
tokenizer = AutoTokenizer.from_pretrained(TEXT_MODEL)

# --------- Collate ----------
def collate_fn(batch):
    audios, texts, scores, errors = zip(*batch)
    audio_inputs = wav2vec_proc(list(audios), sampling_rate=SAMPLE_RATE, return_tensors="pt", padding=True)
    text_inputs = tokenizer(list(texts), return_tensors="pt", padding=True, truncation=True, max_length=128)
    scores = torch.tensor(scores, dtype=torch.float32)
    errors = torch.tensor(np.stack(errors, axis=0), dtype=torch.float32)
    return audio_inputs, text_inputs, scores, errors

# --------- Model ----------
class ShadowNet(nn.Module):
    def __init__(self, n_error_classes: int, freeze_pretrained: bool = True):
        super().__init__()
        self.wav2vec = Wav2Vec2Model.from_pretrained(WAV2VEC_MODEL)
        self.text_model = AutoModel.from_pretrained(TEXT_MODEL)

        audio_hidden = self.wav2vec.config.hidden_size
        text_hidden = self.text_model.config.hidden_size
        fusion_dim = audio_hidden + text_hidden

        self.proj = nn.Sequential(
            nn.Linear(fusion_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
        )
        self.score_head = nn.Linear(256, 1)
        self.error_head = nn.Linear(256, n_error_classes)

        if freeze_pretrained:
            for p in self.wav2vec.parameters():
                p.requires_grad = False
            for p in self.text_model.parameters():
                p.requires_grad = False

    def forward(self, audio_inputs, text_inputs):
        device = next(self.parameters()).device
        input_values = audio_inputs["input_values"].to(device)
        attention_mask_audio = audio_inputs.get("attention_mask", None)
        if attention_mask_audio is not None:
            attention_mask_audio = attention_mask_audio.to(device)

        audio_out = self.wav2vec(input_values, attention_mask=attention_mask_audio, return_dict=True)
        audio_emb = audio_out.last_hidden_state.mean(dim=1)

        text_inputs = {k: v.to(device) for k, v in text_inputs.items()}
        text_out = self.text_model(**text_inputs, return_dict=True)
        text_emb = getattr(text_out, "pooler_output", None)
        if text_emb is None:
            text_emb = text_out.last_hidden_state.mean(dim=1)

        x = torch.cat([audio_emb, text_emb], dim=1)
        x = self.proj(x)
        score = self.score_head(x).squeeze(1)
        errors_logits = self.error_head(x)
        return score, errors_logits

# --------- Train function ----------
def train_model(csv_path: str, audio_folder: str,
                save_model: str = "shadow_model.pt",
                save_label: str = "error_labels.pkl",
                epochs: int = DEFAULT_EPOCHS,
                batch_size: int = DEFAULT_BATCH,
                lr: float = DEFAULT_LR,
                freeze_pretrained: bool = FREEZE_PRETRAINED,
                num_workers: int = NUM_WORKERS):
    dataset = ShadowDataset(csv_path, audio_folder)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True,
                            collate_fn=collate_fn, num_workers=num_workers, pin_memory=(DEVICE=="cuda"))

    model = ShadowNet(n_error_classes=len(dataset.mlb.classes_), freeze_pretrained=freeze_pretrained).to(DEVICE)
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=lr, weight_decay=1e-6)
    loss_score = nn.MSELoss()
    # use dataset-computed pos_weight (move to device)
    pos_w = dataset.class_pos_weight.to(DEVICE) if hasattr(dataset, "class_pos_weight") else None
    loss_error = nn.BCEWithLogitsLoss(pos_weight=pos_w) if pos_w is not None else nn.BCEWithLogitsLoss()

    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        for batch_idx, (audio_inputs, text_inputs, scores, errors) in enumerate(dataloader):
            scores = scores.to(DEVICE)
            errors = errors.to(DEVICE)

            optimizer.zero_grad()
            pred_score, pred_error_logits = model(audio_inputs, text_inputs)

            l_score = loss_score(pred_score, scores)
            l_error = loss_error(pred_error_logits, errors)
            loss = l_score + l_error
            if torch.isnan(loss):
                print(f"⚠ NaN loss detected at epoch {epoch+1}, batch {batch_idx+1}")
                continue

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            epoch_loss += loss.item()

            if (batch_idx + 1) % 20 == 0 or (batch_idx == 0 and epoch == 0):
                with torch.no_grad():
                    probs = torch.sigmoid(pred_error_logits).cpu().numpy()
                    pred_labels = (probs > 0.5).astype(int)
                    sample_pred = pred_labels[0]
                    names = dataset.mlb.classes_
                    pred_names = [names[i] for i, v in enumerate(sample_pred) if v == 1]
                    print(f"[Epoch {epoch+1}/{epochs}] Batch {batch_idx+1}/{len(dataloader)} "
                          f"loss={loss.item():.4f} score_loss={l_score.item():.4f} err_loss={l_error.item():.4f}")
                    print(" Example predicted error labels (sample 0):", pred_names)

        avg_loss = epoch_loss / max(1, len(dataloader))
        print(f"Epoch {epoch+1} finished. Avg loss: {avg_loss:.4f}")

    torch.save(model.state_dict(), save_model)
    with open(save_label, "wb") as f:
        pickle.dump(dataset.mlb, f)
    print("Saved:", save_model, save_label)
    return model, dataset.mlb

# --------- Load / Predict ----------
def load_model(model_path: str, label_path: str, freeze_pretrained: bool = True):
    with open(label_path, "rb") as f:
        mlb = pickle.load(f)
    model = ShadowNet(n_error_classes=len(mlb.classes_), freeze_pretrained=freeze_pretrained)
    model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model, mlb

def load_audio_tensor(audio_path: str):
    if not os.path.exists(audio_path):
        raise FileNotFoundError(audio_path)
    wav, _ = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    return wav.astype("float32")

def predict(model: nn.Module, mlb: MultiLabelBinarizer, audio_path: str, text: str, threshold: float = 0.5):
    model.eval()
    wav = load_audio_tensor(audio_path)
    audio_inputs = wav2vec_proc([wav], sampling_rate=SAMPLE_RATE, return_tensors="pt", padding=True)
    text_inputs = tokenizer([text], return_tensors="pt", padding=True, truncation=True, max_length=128)
    with torch.no_grad():
        score, err_logits = model(audio_inputs, text_inputs)
        probs = torch.sigmoid(err_logits).cpu().numpy()[0]
        preds = (probs > threshold).astype(int).reshape(1, -1)
        labels = mlb.inverse_transform(preds)[0]
    return float(score.cpu().item() * 100.0), list(labels), probs

# --------- Example CLI ----------
if __name__ == "__main__":
    TRAIN = True
    csv_file = "datasetraining2.csv"  # file is in server folder, not parent
    audio_folder = "wav"
    model_file = "shadow_model.pt"
    label_file = "error_labels.pkl"

    if TRAIN:
        model, mlb = train_model(csv_file, audio_folder,
                                 save_model=model_file, save_label=label_file,
                                 epochs=DEFAULT_EPOCHS, batch_size=DEFAULT_BATCH,
                                 lr=DEFAULT_LR, freeze_pretrained=FREEZE_PRETRAINED,
                                 num_workers=NUM_WORKERS)
    else:
        if not os.path.exists(model_file) or not os.path.exists(label_file):
            raise SystemExit("Missing model or label file; set TRAIN=True to train.")
        model, mlb = load_model(model_file, label_file)

    # quick predict example
    test_audio = "wav/test.wav"
    test_text = "上衣下の乾酪化病巣から、結核菌と結核菌抗原が、膜下腔へと放出されると、髄膜炎が生じる。"
    if os.path.exists(test_audio):
        sc, errs, probs = predict(model, mlb, test_audio, test_text, threshold=0.5)
        print("Predicted score:", sc)
        print("Predicted errors:", errs)
    else:
        print(f"Place test audio at {test_audio} to run quick predict.")
