import streamlit as st
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from transformers import pipeline
import pandas as pd
st.title('Truth Trakker')
st.write('TruthTrakker is a cutting-edge program that uses machine learning to perform three main functions: to classify news articles as true or false, to determine whether the article was human-written or AI-generated, and to determine the mood of the article to allow you to be aware of any potential biases. We used over 60,000 data points from Kaggle to train and test our model, where 80% of the data was used for training and developing pattern identification, and the remaining 20% was used for evaluating the pattern’s accuracy. The program utilizes different parts of this unique pattern to determine each of the three functions. Now, we would like to show you a demonstration of our program and each of its aspects.')
# Function to train the Random Forest model for Fake News Detection
def train_random_forest_model(X_train, X_test, y_train):
    vectorizer = TfidfVectorizer()
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)

    rf_classifier = RandomForestClassifier(n_estimators=100, random_state=17)
    rf_classifier.fit(X_train_tfidf, y_train)

    return rf_classifier, vectorizer

# Function to predict if a text is real or fake using the trained Random Forest model
def predict_text_rf(model, vectorizer, label_text):
    text_tfidf = vectorizer.transform([label_text])
    prediction = model.predict(text_tfidf)
    return "REAL" if prediction[0] == 1 else "FAKE"

# Streamlit App for AI Text Detection
def main():
    st.title("Enter your text")

    # User Input
    text = st.text_area("Enter Text:", key="text_area")

    # Choose which analysis to perform
    analysis_choice = st.radio("Select Analysis:", ["Fake News Detection", "AI Generated Text Detection", "Sentiment Analysis"])

    if st.button("Perform Analysis"):
        if analysis_choice == "Fake News Detection":
            # Load the fake news detection model and vectorizer
            df = pd.read_csv('fake_news_dataset.csv')
            df['Label'] = df['Label'].map({"FAKE": 0, "REAL": 1})
            df = df.drop('ID', axis=1)

            X_train, X_test, y_train, _ = train_test_split(df['Text'].values, df['Label'].values, test_size=0.2, random_state=42)

            rf_classifier, vectorizer = train_random_forest_model(X_train, X_test, y_train)

            # Predict using the fake news detection model
            prediction = predict_text_rf(rf_classifier, vectorizer, text)
            st.write(f"Prediction: {prediction}")

        elif analysis_choice == "AI Generated Text Detection":
            model_name = 'roberta-large-openai-detector'
            # Load a pre-trained text generation model from Hugging Face
            text_generator = pipeline("text-generation")
            classifier = pipeline('text-classification', model=model_name)

            # Generate text continuation
            generated_text = text_generator(text, max_length=50, num_return_sequences=1)[0]['generated_text']
            result = classifier(text)[0]
            score = result['score'] * 100
            if score >= 70:
                prediction = 'AI generated'
            else:
                prediction = 'Not AI generated'

            
            # Print the prediction
            st.write(f"Prediction: {prediction}")
                        

        elif analysis_choice == "Sentiment Analysis":
            
            # Load a pre-trained sentiment analysis model from Hugging Face
            sentiment_classifier = pipeline('sentiment-analysis')

            # Make sentiment prediction
            sentiment_result = sentiment_classifier(text)[0]
            sentiment_label = sentiment_result['label']
            sentiment_score = sentiment_result['score']

            # Display Sentiment Result
            st.write(f"Sentiment Prediction: {sentiment_label.lower()}")
            st.write(f"Confidence: {sentiment_score:.4f}")

if __name__ == "__main__":
    main()