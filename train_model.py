import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# Load dataset
data = pd.read_csv("students.csv")

# Input features
features = [
    "attendance",
    "previousMarks",
    "assignmentMarks",
    "internalMarks",
    "studyHours",
    "completedAssignments",
    "previousFailures"
]

X = data[features]

# Target value
y = data["finalMarks"]

# Split dataset into training and testing data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# Create Machine Learning model
model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

# Train model
model.fit(X_train, y_train)

# Test model
predictions = model.predict(X_test)

# Calculate accuracy-related metrics
mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print("===================================")
print("Student Performance ML Model")
print("===================================")
print(f"Mean Absolute Error: {mae:.2f}")
print(f"R2 Score: {r2:.2f}")

# Save trained model
joblib.dump(model, "student_model.pkl")

print("-----------------------------------")
print("Model trained successfully!")
print("Model saved as student_model.pkl")
print("-----------------------------------")