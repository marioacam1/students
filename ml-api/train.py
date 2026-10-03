import pickle
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# Path relativo al script: ml-api/train.py -> ml-api/data/students.csv
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_PATH = SCRIPT_DIR / "data" / "students.csv"
MODEL_DIR = SCRIPT_DIR / "model"
MODEL_PATH = MODEL_DIR / "model.pkl"

df = pd.read_csv(DATA_PATH)

print(f"Dataset cargado: {len(df)} filas, {len(df.columns)} columnas")
print(df.head())

# Misma regla que en la app: aprueba matemáticas con 60 o más
df["pass_math"] = (df["math_score"] >= 60).astype(int)

print("\nDistribución de pass_math:")
print(df["pass_math"].value_counts())

features = [
    "gender",
    "ethnicity",
    "parental_education",
    "lunch",
    "test_prep",
    "reading_score",
    "writing_score",
]
target = "pass_math"

X = df[features].copy()
y = df[target]

encoders = {}
categorical_cols = ["gender", "ethnicity", "parental_education", "lunch", "test_prep"]

for col in categorical_cols:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col])
    encoders[col] = le
    print(f"{col}: {dict(zip(le.classes_, le.transform(le.classes_)))}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"\nTrain: {len(X_train)} filas — Test: {len(X_test)} filas")

model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
)

model.fit(X_train, y_train)
print("\nModelo entrenado exitosamente")

y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\nAccuracy: {accuracy:.2%}")
print("\nReporte completo:")
print(classification_report(y_test, y_pred, target_names=["Reprueba", "Aprueba"]))

print("\nImportancia de cada feature:")
for feat, imp in sorted(
    zip(features, model.feature_importances_),
    key=lambda x: x[1],
    reverse=True,
):
    print(f"  {feat}: {imp:.3f}")

model_data = {
    "model": model,
    "encoders": encoders,
    "features": features,
    "target": target,
}

MODEL_DIR.mkdir(parents=True, exist_ok=True)
with open(MODEL_PATH, "wb") as f:
    pickle.dump(model_data, f)

print(f"\n[OK] Modelo guardado en {MODEL_PATH}")
print(f"   Tamaño del archivo: {MODEL_PATH.stat().st_size / 1024:.1f} KB")
