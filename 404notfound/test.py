from transformers import pipeline

# Replace 'roberta-large-openai-detector' with the actual name of the model
model_name = 'roberta-large-openai-detector'

# Create a text classification pipeline
classifier = pipeline('text-classification', model=model_name)

# Example text
text = """LGBTQ rights encompass legal and social efforts to secure equal treatment for lesbian, gay, bisexual, transgender, and queer individuals. Advocates work to establish anti-discrimination laws, safeguard against hate crimes, and promote recognition of same-sex relationships. Protection of gender identity and expression rights, including healthcare access and accurate identification, is a crucial aspect. Striving for inclusivity in areas like employment, housing, and education, the LGBTQ rights movement aims to eliminate disparities and create a society where individuals are free from discrimination based on their sexual orientation or gender identity. Ultimately, the goal is to ensure equal opportunities and acceptance for all, fostering a more inclusive and diverse world."""
# Make the prediction
result = classifier(text)[0]
prediction = result['label']

score = result['score'] * 100
if score >= 70:
    prediction = 'AI generated'
else:
    prediction = 'Not AI generated'
# Print the prediction
print(f"Prediction: {prediction}")