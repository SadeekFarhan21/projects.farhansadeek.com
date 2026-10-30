import streamlit as st
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Load your dataset and preprocess 'Label' as you mentioned before
df = pd.read_csv('data.csv')
df['Label'] = df['Label'].map({"FAKE": 0, "REAL": 1})
df = df.drop('ID', axis=1)

# Assuming your dataset has 'Text' and 'Label' columns
X = df['Text'].values
y = df['Label'].values

# Vectorize the text data using TF-IDF from scikit-learn
vectorizer = TfidfVectorizer()
X_tfidf = vectorizer.fit_transform(X)

# Create and fit the Logistic Regression model
logreg_classifier = LogisticRegression(random_state=17)
logreg_classifier.fit(X_tfidf, y)

# Function to predict if a text is real or fake
def predict_text(label_text):
    # Vectorize the input text using the same vectorizer
    text_tfidf = vectorizer.transform([label_text])

    # Make a prediction
    prediction = logreg_classifier.predict(text_tfidf)

    # Return the prediction
    return "REAL" if prediction[0] == 1 else "FAKE"

# Set page configuration
st.set_page_config(
    page_title="Fake News Detection",
    page_icon=":newspaper:",
    layout="wide",
)

# Header
st.title("Fake News Detection App")
st.header("Using Machine Learning to Identify Real or Fake News")

# Sidebar with information
st.sidebar.header("About")
st.sidebar.markdown(
    "This app uses a machine learning model to predict if a given text is real or fake. "
    "It was trained on a dataset and is for educational purposes only."
)

# Add a link to your dataset or any relevant resources
st.sidebar.markdown("[Dataset Source](https://www.kaggle.com/datasets/clmentbisaillon/fake-and-real-news-dataset)")

# User input text
st.subheader("Enter a text below to see if it's predicted as real or fake.")
user_input = st.text_area("Input Text:", "This is a sample text.", height=150)

# Display prediction result
st.markdown("## Prediction Result:")
result_placeholder = st.empty()

# Make prediction on button click
if st.button("Predict", key="prediction_button"):
    result = predict_text(user_input)
    result_placeholder.success(f"The model predicts: {result}")

# Footer
st.markdown("---")
st.markdown("© 2023 Fake News Detection App. All rights reserved.")
