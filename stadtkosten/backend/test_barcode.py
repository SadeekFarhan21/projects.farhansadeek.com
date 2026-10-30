import os
import base64
from dotenv import load_dotenv
load_dotenv()

gemini_api_key = os.getenv('GEMINI_API_KEY')

import requests

def chat_with_gemini(user_message, image_path=None):
    """
    Send a message to Gemini API with optional image context.
    
    Args:
        user_message (str): The text message/prompt to send
        image_path (str, optional): Path to an image file to include in the request
        
    Returns:
        str: The response text from Gemini
    """
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables.")
    
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": gemini_api_key
    }
    
    # Build the parts array
    parts = [
        {
            "text": user_message
        }
    ]
    
    # Add image if provided
    if image_path:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        # Read and encode the image
        with open(image_path, 'rb') as image_file:
            image_data = image_file.read()
            image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Determine MIME type from file extension
        file_ext = os.path.splitext(image_path)[1].lower()
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        mime_type = mime_types.get(file_ext, 'image/png')
        
        # Add image part
        parts.append({
            "inline_data": {
                "mime_type": mime_type,
                "data": image_base64
            }
        })
    
    data = {
        "contents": [
            {
                "parts": parts
            }
        ]
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    resp_json = response.json()
    try:
        return resp_json["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return resp_json

if __name__ == "__main__":
    # Get the absolute path to live_captured.png
    script_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(script_dir, 'live_captured.png')
    
    # Hardcoded prompt for barcode extraction
    prompt = "This is an image of the food that I am about to eat. I am based in the US, so the barcode should be 12 digits, return the 12 digit code bar code to me, and nothing else i just want the 12 digit barcode"
    
    # Check if image exists
    if os.path.exists(image_path):
        print(f"📸 Processing image: {image_path}")
        print("🔍 Extracting 12-digit barcode...")
        reply = chat_with_gemini(prompt, image_path=image_path)
        print("\n" + "=" * 60)
        print("BARCODE RESULT:")
        print("=" * 60)
        print(reply.strip())
        print("=" * 60)
    else:
        print(f"❌ Error: Image not found: {image_path}")
        exit(1)
