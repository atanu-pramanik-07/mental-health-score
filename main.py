import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Literal

# Load the trained model once at startup
model = joblib.load("mental_health_model.pkl")

TOP_COUNTRIES = {
    "Other", "India", "USA", "Canada", "Australia",
    "UK", "Germany", "Mexico", "Turkey", "France"
}

app = FastAPI(
    title="Mental Health Score API",
    description="Predicts student mental health scores based on lifestyle and screen usage metrics.",
    version="1.0.0"
)


class StudentData(BaseModel):
    age: int = Field(..., ge=10, le=100)
    gender: Literal["Male", "Female"]
    country: str = Field(..., min_length=1)
    academic_level: Literal["Undergraduate", "Graduate", "High School"]
    most_used_platform: Literal[
        "Facebook", "LinkedIn", "Instagram", "Snapchat", "Twitter", "YouTube",
        "TikTok", "LINE", "KakaoTalk", "VKontakte", "WhatsApp", "WeChat"
    ]
    purpose_of_use: Literal["Networking", "Education", "Entertainment", "News"]
    avg_daily_usage_hours: float = Field(..., ge=0, le=24)
    daily_unlocks: int = Field(..., ge=0)
    study_hours: float = Field(..., ge=0, le=24)
    physical_activity_hours: float = Field(..., ge=0, le=24)
    sleep_hours_per_night: float = Field(..., ge=0, le=24)
    stress_level: Literal["Low", "Medium", "High", "Very High"]


class PredictionResponse(BaseModel):
    predicted_mental_health_score: float


@app.get("/health")
def greet():
    return {"message": "Welcome to Mental Health Score Application"}


@app.post("/predict", response_model=PredictionResponse)
def predict(data: StudentData):
    cleaned_country = data.country.strip()
    country_group = cleaned_country if cleaned_country in TOP_COUNTRIES else "Other"

    input_row = pd.DataFrame([{
        "Age": data.age,
        "Gender": data.gender,
        "Country": cleaned_country,
        "Academic_Level": data.academic_level,
        "Most_Used_Platform": data.most_used_platform,
        "Purpose_Of_Use": data.purpose_of_use,
        "Avg_Daily_Usage_Hours": data.avg_daily_usage_hours,
        "Daily_Unlocks": data.daily_unlocks,
        "Study_Hours": data.study_hours,
        "Physical_Activity_Hours": data.physical_activity_hours,
        "Sleep_Hours_Per_Night": data.sleep_hours_per_night,
        "Stress_Level": data.stress_level,
        "Grouped_country": country_group
    }])

    try:
        prediction = model.predict(input_row)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {str(e)}")

    return PredictionResponse(
        predicted_mental_health_score=round(float(prediction), 2)
    )


# Keep StaticFiles mount at the very bottom so it doesn't shadow API routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")