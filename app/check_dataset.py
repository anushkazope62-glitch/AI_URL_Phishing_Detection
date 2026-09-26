import pandas as pd

# Load dataset
df = pd.read_csv("dataset/PhiUSIIL_Phishing_URL_Dataset.csv")

print("Dataset loaded successfully!")

# Basic information
print("\nDataset shape:")
print(df.shape)

# Missing values
print("\nMissing values:")
print(df.isnull().sum().sort_values(ascending=False).head(10))

# Duplicate rows
print("\nDuplicate rows:")
print(df.duplicated().sum())

# Duplicate URLs
print("\nDuplicate URLs:")
print(df["URL"].duplicated().sum())

# Label distribution
print("\nLabel distribution:")
print(df["label"].value_counts())

# Percentage of each label
print("\nLabel percentage:")
print(df["label"].value_counts(normalize=True) * 100)

print("\nFeature data types:")
print(df.dtypes)