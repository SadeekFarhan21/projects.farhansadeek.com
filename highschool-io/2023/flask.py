from flask import Flask, render_template, request
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

app = Flask(__name__)

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    user_input = request.form['input_text']
    text_tfidf = vectorizer.transform([user_input])
    prediction = logreg_classifier.predict(text_tfidf)
    result = "REAL" if prediction[0] == 1 else "FAKE"
    return render_template('result.html', result=result)

if __name__ == '__main__':
    app.run(debug=True)
