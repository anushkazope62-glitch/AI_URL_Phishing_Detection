import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from app.feature_extractor import extract_features


# Load dataset
df = pd.read_csv("dataset/PhiUSIIL_Phishing_URL_Dataset.csv")

print("Dataset loaded successfully!")
print("Dataset shape:", df.shape)


# Generate features using our feature extractor
print("\nCreating features from URLs...")
print("Please wait...")

feature_data = df["URL"].apply(extract_features)

X = pd.DataFrame(feature_data.tolist())
y = df["label"]

print("\nFeatures created successfully!")
print("Number of features:", X.shape[1])
print("X shape:", X.shape)
print("y shape:", y.shape)


# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nData split successfully!")
print("Training data:", X_train.shape)
print("Testing data:", X_test.shape)


# Train model
print("\nTraining model...")

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("Model training completed!")


# Evaluate model
y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)

print("\nModel Accuracy:")
print(f"{accuracy * 100:.2f}%")


print("\nClassification Report:")
print(classification_report(
    y_test,
    y_pred,
    target_names=["Phishing", "Legitimate"]
))


print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))


# Save model
joblib.dump(model, "model/phishing_model.joblib")

print("\nModel saved successfully!")
print("Location: model/phishing_model.joblib")