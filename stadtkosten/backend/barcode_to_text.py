import io
import requests
import base64
import cv2
import numpy as np
import tempfile
import os
from PIL import Image
from pyzbar.pyzbar import decode

# Cloud Vision API Key
CLOUD_VISION_API_KEY = os.environ.get('CLOUD_VISION_API_KEY', '')

def get_upc_from_image(image_path):
    """
    Extracts UPC/barcode number from an image file using Google Cloud Vision API.
    This is an alias for get_upc_from_image_api for backward compatibility.
    
    Args:
        image_path (str): Path to the barcode image file
        
    Returns:
        str: The UPC/barcode number if found, None otherwise
    """
    return get_upc_from_image_api(image_path)

def analyze_image_quality(image_path):
    """
    Analyze image to provide feedback on why barcode might not be detected.
    
    Args:
        image_path (str): Path to the image file
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            print("⚠️  Could not read image file")
            return
        
        height, width = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        
        # Calculate image statistics
        mean_brightness = np.mean(gray)
        std_dev = np.std(gray)  # Contrast measure
        
        print(f"\n📊 Image Analysis:")
        print(f"   Dimensions: {width}x{height} pixels")
        print(f"   Brightness: {mean_brightness:.1f}/255 (optimal: 100-150)")
        print(f"   Contrast: {std_dev:.1f} (optimal: >30)")
        
        if width < 400 or height < 400:
            print("   ⚠️  Image might be too small for reliable barcode detection")
        if mean_brightness < 50:
            print("   ⚠️  Image is too dark - try better lighting")
        elif mean_brightness > 200:
            print("   ⚠️  Image is too bright - might be overexposed")
        if std_dev < 20:
            print("   ⚠️  Low contrast - barcode might not be clearly visible")
            
    except Exception as e:
        print(f"Could not analyze image: {e}")

def preprocess_image_for_barcode(image_path, save_debug=False):
    """
    Preprocess image to enhance barcode detection:
    - Convert to grayscale
    - Enhance contrast
    - Apply sharpening
    - Resize if too small
    
    Args:
        image_path (str): Path to the original image
        save_debug (bool): If True, save preprocessed image for debugging
        
    Returns:
        str: Path to the preprocessed image, or original if preprocessing fails
    """
    try:
        # Read the image
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Apply sharpening filter
        kernel = np.array([[-1, -1, -1],
                           [-1,  9, -1],
                           [-1, -1, -1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # Resize if image is too small (barcodes need good resolution)
        height, width = sharpened.shape
        if width < 800:
            scale = 800 / width
            new_width = int(width * scale)
            new_height = int(height * scale)
            sharpened = cv2.resize(sharpened, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Apply threshold to make barcode more distinct
        _, thresh = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Save preprocessed image
        if save_debug:
            debug_path = image_path.replace('.png', '_preprocessed.png').replace('.jpg', '_preprocessed.png')
            cv2.imwrite(debug_path, thresh)
            print(f"   💾 Saved preprocessed image: {debug_path}")
        
        # Save preprocessed image to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        temp_path = temp_file.name
        cv2.imwrite(temp_path, thresh)
        temp_file.close()
        
        return temp_path
        
    except Exception as e:
        print(f"Warning: Image preprocessing failed: {e}, using original image")
        return image_path

def send_image_to_cloud_vision(image_content_base64, feature_type="BARCODE_DETECTION"):
    """
    Send image to Cloud Vision API for barcode detection.
    
    Args:
        image_content_base64 (str): Base64 encoded image content
        feature_type (str): Type of detection (BARCODE_DETECTION or TEXT_DETECTION)
        
    Returns:
        dict: API response data, or None if error
    """
    url = f'https://vision.googleapis.com/v1/images:annotate?key={CLOUD_VISION_API_KEY}'
    
    payload = {
        "requests": [{
            "image": {
                "content": image_content_base64
            },
            "features": [{
                "type": feature_type,
                "maxResults": 10
            }]
        }]
    }
    
    try:
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 400:
            print("Bad request - check image format and API key")
        elif response.status_code == 403:
            print("Forbidden - check API key permissions")
        else:
            print(f"API request failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
        
        return None
    except Exception as e:
        print(f"Error making API request: {e}")
        return None

def try_pyzbar_detection(image_path):
    """
    Fallback: Try detecting barcode using pyzbar library.
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        str: Barcode value if found, None otherwise
    """
    try:
        img = Image.open(image_path)
        barcodes = decode(img)
        
        if barcodes:
            barcode_data = barcodes[0].data.decode('utf-8')
            barcode_type = barcodes[0].type
            print(f"✅ Pyzbar detected barcode format: {barcode_type}")
            return barcode_data
        return None
    except Exception as e:
        print(f"Pyzbar detection failed: {e}")
        return None

def get_upc_from_image_api(image_path):
    """
    Extract barcode using Cloud Vision API via REST API.
    Tries multiple preprocessing strategies to improve detection.
    
    Args:
        image_path (str): Path to the barcode image file
        
    Returns:
        str: The UPC/barcode number if found, None otherwise
    """
    temp_files = []
    
    try:
        # Analyze image quality first
        analyze_image_quality(image_path)
        
        # Strategy 1: Try original image first
        print("\n🔍 Strategy 1: Trying original image...")
        with open(image_path, 'rb') as image_file:
            image_content = base64.b64encode(image_file.read()).decode('utf-8')
        
        data = send_image_to_cloud_vision(image_content)
        if data:
            responses = data.get('responses', [])
            if responses and 'barcodeAnnotations' in responses[0]:
                barcodes = responses[0]['barcodeAnnotations']
                if barcodes:
                    barcode_value = barcodes[0].get('rawValue')
                    barcode_format = barcodes[0].get('format', 'Unknown')
                    print(f"✅ Detected barcode format: {barcode_format}")
                    return barcode_value
        
        # Strategy 2: Try preprocessed image
        print("\n🔍 Strategy 2: Trying preprocessed image...")
        preprocessed_path = preprocess_image_for_barcode(image_path, save_debug=True)
        temp_files.append(preprocessed_path)
        
        if preprocessed_path != image_path:
            with open(preprocessed_path, 'rb') as image_file:
                image_content = base64.b64encode(image_file.read()).decode('utf-8')
            
            data = send_image_to_cloud_vision(image_content)
            if data:
                responses = data.get('responses', [])
                if responses and 'barcodeAnnotations' in responses[0]:
                    barcodes = responses[0]['barcodeAnnotations']
                    if barcodes:
                        barcode_value = barcodes[0].get('rawValue')
                        barcode_format = barcodes[0].get('format', 'Unknown')
                        print(f"✅ Detected barcode format: {barcode_format} (preprocessed)")
                        return barcode_value
        
        # Strategy 3: Try with different preprocessing (grayscale only, no threshold)
        print("\n🔍 Strategy 3: Trying alternative preprocessing...")
        try:
            img = cv2.imread(image_path)
            if img is not None:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                enhanced = clahe.apply(gray)
                
                # Resize if needed
                height, width = enhanced.shape
                if width < 1000:
                    scale = 1000 / width
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    enhanced = cv2.resize(enhanced, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
                
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
                alt_path = temp_file.name
                cv2.imwrite(alt_path, enhanced)
                temp_file.close()
                temp_files.append(alt_path)
                
                with open(alt_path, 'rb') as image_file:
                    image_content = base64.b64encode(image_file.read()).decode('utf-8')
                
                data = send_image_to_cloud_vision(image_content)
                if data:
                    responses = data.get('responses', [])
                    if responses and 'barcodeAnnotations' in responses[0]:
                        barcodes = responses[0]['barcodeAnnotations']
                        if barcodes:
                            barcode_value = barcodes[0].get('rawValue')
                            barcode_format = barcodes[0].get('format', 'Unknown')
                            print(f"✅ Detected barcode format: {barcode_format} (alternative preprocessing)")
                            return barcode_value
        except Exception as e:
            print(f"Alternative preprocessing failed: {e}")
        
        # Strategy 4: Try pyzbar as fallback (sometimes works better for certain barcodes)
        print("\n🔍 Strategy 4: Trying pyzbar library as fallback...")
        result = try_pyzbar_detection(image_path)
        if result:
            return result
        
        # Also try pyzbar on preprocessed images
        for temp_path in temp_files:
            if os.path.exists(temp_path):
                result = try_pyzbar_detection(temp_path)
                if result:
                    return result
        
        print("\n❌ No barcode detected after trying all strategies")
        print("\n💡 Tips for better barcode detection:")
        print("   1. Ensure the barcode is clearly visible and in focus")
        print("   2. Hold the camera steady and at a good distance (not too close, not too far)")
        print("   3. Make sure the barcode is well-lit but not overexposed")
        print("   4. Try to capture the barcode straight-on (not at an angle)")
        print("   5. Ensure the barcode is not damaged, wrinkled, or partially obscured")
        print("   6. Check that you're capturing a standard barcode format (UPC, EAN, Code128, etc.)")
        print("   7. Try capturing again with better lighting or a different angle")
        print(f"\n   📁 Check the preprocessed image: live_captured_preprocessed.png")
        print("      to see how the image looks after enhancement")
        return None
        
    except FileNotFoundError:
        print(f"Error: Image file not found: {image_path}")
        return None
    except Exception as e:
        print(f"Error with Cloud Vision API: {e}")
        return None
    finally:
        # Clean up temporary files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except:
                pass

# Example usage when run directly
if __name__ == "__main__":
    # Test with the image.png file
    upc = get_upc_from_image_api("image.png")
    
    if upc:
        print(f"Barcode found: {upc}")
    else:
        print("No barcode was detected in the image.")