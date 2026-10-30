from transformers import pipeline

def ai_content_detection(text):
    # Load the text classification pipeline
    classifier = pipeline("text-classification", model="bert-base-uncased")

    # Classify the input text
    result = classifier(text)

    # Get the label and score for the top prediction
    label = result[0]['label']
    score = result[0]['score']

    return label, score

if __name__ == "__main__":
    # Example usage
    input_text = "The fight for LGBTQ+ rights is a crucial journey towards equality, acceptance, and respect for diverse identities. As society progresses, acknowledging the rights of lesbian, gay, bisexual, transgender, and queer individuals becomes imperative. Embracing inclusivity fosters a culture that celebrates differences, promoting understanding and compassion. Every person, regardless of their sexual orientation or gender identity, deserves equal opportunities, protection from discrimination, and the freedom to express their authentic selves. By championing LGBTQ+ rights, we contribute to a more just and harmonious world, breaking down barriers and paving the way for a future where love and acceptance triumph over prejudice and discrimination."
    input_text = """
I’ll start by saying: I don’t know all the details about why Mr. Altman was pushed out. Neither, it seems, do OpenAI’s shellshocked employees, investors and business partners, many of whom learned of the move at the same time as the general public. In a blog post on Friday, the company said that Mr. Altman “was not consistently candid in his communications” with the board, but gave no other details.
"""
    label, score = ai_content_detection(input_text)

    print(f"AI Content Label: {label}")
    print(f"AI Content Score: {score * 100:.2f}%")