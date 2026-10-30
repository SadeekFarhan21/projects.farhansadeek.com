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
JACKSONVILLE, FL—With the standard curriculum of anatomy, biology, risks, and consent continually being challenged by parent groups, sources confirmed Thursday that the only sex education that remains in the United States is pressing one’s ear against a shared wall to better hear the noises next door. “Listening for the muffled slapping noises that come from an adjacent room is the best way for today’s teens to learn about sexual health and well-being,” said education consultant James Thorne, confirming that every school in the nation had restricted what could be taught to the point that children now relied on the occasional audible moan to figure out what happens before, during, and after sex. “The generation of Americans currently under the age of 18 will be the first in modern times to learn about their changing bodies by placing an empty juice glass up to a thin wall. Whether it’s a couple in a neighboring apartment, an older sibling, or their parents, these kids will need to decode what’s going on in the next room by guessing what that vibrating noise is, or wondering why the activity in progress apparently requires so much grunting. Anything they learn about safe sex will of course have to come from overhearing a panicked argument about a broken condom.” Reached for comment, the nation’s children stated that the most important part of the human reproductive system was playing “Grind On Me” by Pretty Ricky."""
    label, score = ai_content_detection(input_text)

    print(f"AI Content Label: {label}")
    print(f"AI Content Score: {score * 100:.2f}%")