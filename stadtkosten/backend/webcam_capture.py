import cv2
import os
from datetime import datetime

def capture_barcode_image(output_path="live_captured.png", camera_index=0):
    """
    Captures an image from the webcam for barcode scanning.
    
    Args:
        output_path (str): Path where the captured image will be saved
        camera_index (int): Index of the camera to use (default: 0)
        
    Returns:
        str: Path to the captured image, or None if capture failed
    """
    # Initialize the camera
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print(f"Error: Could not open camera {camera_index}")
        return None
    
    print("Camera opened. Press SPACE to capture, ESC to exit")
    
    try:
        while True:
            # Read frame from camera
            ret, frame = cap.read()
            
            if not ret:
                print("Error: Could not read frame from camera")
                break
            
            # Display the frame
            cv2.imshow('Barcode Scanner - Press SPACE to capture, ESC to exit', frame)
            
            # Wait for key press
            key = cv2.waitKey(1) & 0xFF
            
            # If SPACE is pressed, capture the image
            if key == ord(' '):
                # Save the captured frame
                cv2.imwrite(output_path, frame)
                print(f"Image captured and saved to: {output_path}")
                break
            
            # If ESC is pressed, exit without capturing
            elif key == 27:  # ESC key
                print("Capture cancelled")
                output_path = None
                break
                
    finally:
        # Release the camera and close windows
        cap.release()
        cv2.destroyAllWindows()
    
    return output_path

def capture_barcode_image_auto(output_path="live_captured.png", camera_index=0, timeout=10):
    """
    Automatically captures an image from the webcam after a short delay.
    
    Args:
        output_path (str): Path where the captured image will be saved
        camera_index (int): Index of the camera to use (default: 0)
        timeout (int): Seconds to wait before auto-capturing (default: 10)
        
    Returns:
        str: Path to the captured image, or None if capture failed
    """
    # Initialize the camera
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print(f"Error: Could not open camera {camera_index}")
        return None
    
    print(f"Camera opened. Auto-capturing in {timeout} seconds...")
    print("Press ESC to cancel")
    
    import time
    start_time = time.time()
    
    try:
        while True:
            # Read frame from camera
            ret, frame = cap.read()
            
            if not ret:
                print("Error: Could not read frame from camera")
                break
            
            # Calculate elapsed time
            elapsed = time.time() - start_time
            remaining = max(0, timeout - elapsed)
            
            # Add countdown text to frame
            cv2.putText(frame, f"Capturing in {int(remaining)}s...", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Display the frame
            cv2.imshow('Barcode Scanner - Auto Capture', frame)
            
            # Check if timeout reached
            if elapsed >= timeout:
                # Save the captured frame
                cv2.imwrite(output_path, frame)
                print(f"Image auto-captured and saved to: {output_path}")
                break
            
            # If ESC is pressed, exit without capturing
            key = cv2.waitKey(1) & 0xFF
            if key == 27:  # ESC key
                print("Capture cancelled")
                output_path = None
                break
                
    finally:
        # Release the camera and close windows
        cap.release()
        cv2.destroyAllWindows()
    
    return output_path

# Example usage when run directly
if __name__ == "__main__":
    # Capture image manually (press SPACE to capture)
    captured_path = capture_barcode_image()
    
    if captured_path:
        print(f"\nImage successfully captured: {captured_path}")
    else:
        print("\nImage capture cancelled or failed.")
