import streamlit as st
from transformers import GPT2LMHeadModel, GPT2Tokenizer
import torch

def calculate_perplexity(text, model, tokenizer):
    input_ids = tokenizer.encode(text, return_tensors='pt')

    with torch.no_grad():
        outputs = model(input_ids, labels=input_ids)
        log_likelihood = outputs.loss.item()

    word_count = len(tokenizer.tokenize(text))
    perplexity = 2 ** (log_likelihood / word_count)
    return perplexity

# Load pre-trained GPT-3 model and tokenizer
model_name = 'EleutherAI/gpt-neo-2.7B'
model = GPT2LMHeadModel.from_pretrained(model_name)
tokenizer = GPT2Tokenizer.from_pretrained(model_name)

# Streamlit app
st.title("Perplexity Calculator")

# Text input for user to enter text
text = st.text_area("Enter text for perplexity calculation:", "")

# Calculate perplexity when the user clicks the button
if st.button("Calculate Perplexity"):
    if text:    
        perplexity = calculate_perplexity(text, model, tokenizer)
        st.success(f"Perplexity: {perplexity}")
    else:
        st.warning("Please enter text for perplexity calculation.")