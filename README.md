# 🧠 MindMetrics — Student Mental Health Score Predictor

An end-to-end machine learning project: from exploratory data analysis and model selection to a **FastAPI** inference service and an interactive web dashboard that predicts a student's mental health score from their screen-time and lifestyle habits.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikit-learn&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-150458?logo=pandas&logoColor=white)
![Status](https://img.shields.io/badge/status-complete-brightgreen)

---

## 📌 Overview

Students spend hours on social media every day, and that time competes with sleep, study and exercise. This project asks: **how well can we predict a student's self-reported mental health score (≈ 3.6 – 9.4, higher is better) from their daily habits?**

The repo covers the full ML lifecycle:

1. **EDA** — univariate analysis of 13 features with written observations and data-quality checks
2. **Feature engineering** — country grouping, skew handling, ordinal/nominal encoding
3. **Model comparison** — 6 regressors benchmarked on the same preprocessing pipeline
4. **Hyperparameter tuning** — `RandomizedSearchCV` on the best model
5. **Deployment** — the trained pipeline served through a validated REST API
6. **Frontend** — a responsive dashboard with presets, a live gauge and prediction history

---

## 📊 Results

Dataset: **5,000 students × 13 columns** (*Student Social Media and Mental Health Impact*). Train/test split of 70/30, `random_state=42`.

| Model | Test R² | Train R² | MAE | RMSE |
|---|---|---|---|---|
| **Random Forest (tuned)** ⭐ | **0.890** | 0.980 | **0.331** | **0.440** |
| Random Forest (default) | 0.878 | 0.981 | 0.347 | 0.463 |
| XGBoost | 0.877 | 0.975 | 0.352 | 0.464 |
| Support Vector Regressor | 0.807 | 0.826 | 0.436 | 0.582 |
| Gradient Boosting | 0.799 | 0.813 | 0.465 | 0.594 |
| Decision Tree | 0.747 | 1.000 | 0.425 | 0.667 |
| Linear Regression (baseline) | 0.740 | 0.724 | 0.536 | 0.676 |

**Final model:** a tuned Random Forest inside a single scikit-learn `Pipeline` (preprocessing + regressor), explaining ~89% of the variance on unseen data with an average error of ~0.33 points on the score scale.

**Takeaways**
- Tree ensembles beat the linear baseline by ~15 R² points, which suggests non-linear relationships between habits and wellbeing.
- The tuned Random Forest improved test R² from 0.878 → 0.890 over the default settings.
- The train–test gap (~0.09) shows some overfitting; it is typical for Random Forests and is kept in check by `max_samples` subsampling and 5-fold CV during tuning.

---

## 🏗️ Architecture

```
┌────────────────────┐   POST /predict    ┌───────────────────────────┐
│  Web dashboard     │ ─────────────────► │  FastAPI + Pydantic       │
│  HTML / CSS / JS   │ ◄───────────────── │  input validation         │
└────────────────────┘   JSON score       │            │              │
                                          │  sklearn Pipeline (.pkl)  │
                                          │  preprocess → RandomForest│
                                          └───────────────────────────┘
```

### Preprocessing pipeline (`ColumnTransformer`)

| Feature type | Columns | Transformation |
|---|---|---|
| Skewed numeric | `Study_Hours` | `log1p` → `StandardScaler` |
| Numeric | `Age`, `Avg_Daily_Usage_Hours`, `Daily_Unlocks`, `Physical_Activity_Hours`, `Sleep_Hours_Per_Night` | `StandardScaler` |
| Ordinal | `Stress_Level` | `OrdinalEncoder` (Low < Medium < High < Very High) |
| Nominal | `Gender`, `Academic_Level`, `Most_Used_Platform`, `Purpose_Of_Use`, `Grouped_country` | `OneHotEncoder(handle_unknown="ignore")` |

**Feature engineering:** the `Country` column has 111 unique values, so only the top 10 are kept and the rest are grouped into `"Other"` to avoid sparse one-hot columns.

Because the whole transformation lives inside the pipeline, **training and inference use identical preprocessing**, which avoids train/serve skew.

---

## ✨ Features

- **Validated REST API** — Pydantic models enforce types, ranges and allowed categories (e.g. sleep 0–24 h, stress ∈ {Low, Medium, High, Very High}), returning clear `422` errors for bad input.
- **Interactive dashboard** — sliders and dropdowns for all 12 inputs, an animated score gauge with a rating badge, and a history of previous predictions.
- **One-click presets** — *Balanced*, *Exam Crunch* and *High Screen* scenarios for quick demos.
- **Live API status** — the UI pings `/health` and shows connection state.
- **Auto-generated docs** — Swagger UI at `/docs`, ReDoc at `/redoc`.
- **Single-command deploy** — FastAPI serves both the API and the static frontend.

---

## 🗂️ Project Structure

```
.
├── main.py                    # FastAPI app: schema validation, /predict, /health, static hosting
├── Mental_Health_Score.ipynb  # EDA, feature engineering, model comparison, tuning, export
├── mental_health_model.pkl    # Trained scikit-learn pipeline (tuned Random Forest)
├── requirements.txt           # Python dependencies (scikit-learn pinned to the training version)
├── static/
│   ├── index.html             # Dashboard UI
│   ├── style.css              # Styling
│   └── script.js              # Form logic, API calls, gauge animation, presets
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

> **Note:** `scikit-learn` is pinned to `1.9.1` because the `.pkl` file was trained with that version and pickled models may not load on others. To use a different version, re-run the notebook to regenerate the model.

### 2. Run the app

```bash
uvicorn main:app --reload
```

Then open:

| URL | What you get |
|---|---|
| http://127.0.0.1:8000 | Web dashboard |
| http://127.0.0.1:8000/docs | Interactive Swagger API docs |
| http://127.0.0.1:8000/health | Health check |

---

## 🔌 API Reference

### `GET /health`

```json
{ "message": "Welcome to Mental Health Score Application" }
```

### `POST /predict`

**Request**

```json
{
  "age": 21,
  "gender": "Male",
  "country": "India",
  "academic_level": "Undergraduate",
  "most_used_platform": "Instagram",
  "purpose_of_use": "Entertainment",
  "avg_daily_usage_hours": 5.5,
  "daily_unlocks": 120,
  "study_hours": 3.0,
  "physical_activity_hours": 1.5,
  "sleep_hours_per_night": 6.5,
  "stress_level": "Medium"
}
```

**Response**

```json
{ "predicted_mental_health_score": 6.42 }
```

**cURL example**

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"age":21,"gender":"Male","country":"India","academic_level":"Undergraduate","most_used_platform":"Instagram","purpose_of_use":"Entertainment","avg_daily_usage_hours":5.5,"daily_unlocks":120,"study_hours":3.0,"physical_activity_hours":1.5,"sleep_hours_per_night":6.5,"stress_level":"Medium"}'
```

**Field constraints**

| Field | Type | Allowed values |
|---|---|---|
| `age` | int | 10 – 100 |
| `gender` | enum | Male, Female |
| `country` | string | any (non-top-10 countries are grouped as "Other") |
| `academic_level` | enum | Undergraduate, Graduate, High School |
| `most_used_platform` | enum | Facebook, LinkedIn, Instagram, Snapchat, Twitter, YouTube, TikTok, LINE, KakaoTalk, VKontakte, WhatsApp, WeChat |
| `purpose_of_use` | enum | Networking, Education, Entertainment, News |
| `avg_daily_usage_hours`, `study_hours`, `physical_activity_hours`, `sleep_hours_per_night` | float | 0 – 24 |
| `daily_unlocks` | int | ≥ 0 |
| `stress_level` | enum | Low, Medium, High, Very High |

---

## 🔍 Key EDA Findings

- Students average **~5 hours/day** on social media but only **~3 hours** studying.
- **~61%** report High or Very High stress; only ~13% report Low.
- Average sleep is **~6.6 hours**, below the recommended 7–9 h.
- Entertainment is the main purpose for ~51% of users; Instagram, TikTok and Facebook cover ~55% of the sample.
- Data-quality issue found: negative values in `Physical_Activity_Hours` (min −0.4) and 2 duplicate rows were flagged during EDA.

---

## ⚠️ Limitations & Future Work

- The score is **self-reported** and the dataset is relatively small and narrow (ages 18–24), so predictions are **not a clinical or diagnostic tool**.
- The model shows a moderate train/test gap; more data or regularisation could narrow it.
- Planned improvements:
  - [ ] SHAP / feature-importance explanations in the UI
  - [ ] Dockerfile and cloud deployment
  - [ ] Unit tests for the API and CI via GitHub Actions
  - [ ] Model versioning (e.g. MLflow)
  - [ ] Bivariate analysis and correlation section in the notebook

---

## 🛠️ Tech Stack

**ML / Data:** Python · Pandas · NumPy · scikit-learn · XGBoost · Matplotlib · Seaborn
**Backend:** FastAPI · Pydantic · Uvicorn · Joblib
**Frontend:** HTML5 · CSS3 · Vanilla JavaScript

---

## 👤 Author

**Atanu Pramanik**
📧 pramanikatanu2004@gmail.com
🔗 [GitHub](https://github.com/<your-username>) · [LinkedIn](https://linkedin.com/in/<your-profile>)

---

*If you found this project interesting, feel free to ⭐ the repo!*