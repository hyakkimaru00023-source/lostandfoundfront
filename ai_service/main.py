"""
Lost & Found AI Service
Object Detection and Image Classification using YOLO
"""

import os
import io
import base64
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import cv2
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Configure port for HuggingFace Spaces (requires port 7860)
PORT = int(os.environ.get('PORT', 5000))

# Category mapping for lost & found items
CATEGORY_MAPPING = {
    'person': 'other',
    'backpack': 'bags',
    'bag': 'bags',
    'luggage': 'bags',
    'purse': 'bags',
    'wallet': 'accessories',
    'phone': 'electronics',
    'laptop': 'electronics',
    'computer': 'electronics',
    'tablet': 'electronics',
    'headphones': 'electronics',
    'camera': 'electronics',
    'watch': 'jewelry',
    'glasses': 'accessories',
    'umbrella': 'accessories',
    'book': 'books',
    'bottle': 'other',
    'cup': 'other',
    'keys': 'keys',
    'jacket': 'clothing',
    'shirt': 'clothing',
    'pants': 'clothing',
    'dress': 'clothing',
    'shoe': 'clothing',
    'ball': 'sports_equipment',
    'bat': 'sports_equipment',
    'racket': 'sports_equipment',
    'toy': 'toys',
    'teddy bear': 'toys',
    'document': 'documents',
    'paper': 'documents',
    'folder': 'documents'
}

# Valid categories
VALID_CATEGORIES = [
    'electronics', 'clothing', 'accessories', 'bags', 'books', 
    'keys', 'jewelry', 'sports_equipment', 'documents', 'toys', 
    'tools', 'furniture', 'other'
]

# Color mapping for categories
CATEGORY_COLORS = {
    'electronics': (255, 0, 0),
    'clothing': (0, 255, 0),
    'accessories': (0, 0, 255),
    'bags': (255, 255, 0),
    'books': (255, 0, 255),
    'keys': (0, 255, 255),
    'jewelry': (128, 0, 128),
    'sports_equipment': (255, 165, 0),
    'documents': (128, 128, 0),
    'toys': (128, 0, 0),
    'tools': (0, 128, 0),
    'furniture': (0, 0, 128),
    'other': (128, 128, 128)
}

print("Loading YOLO model...")

# Try to load YOLO model, fall back to mock if unavailable
try:
    from ultralytics import YOLO
    model = YOLO('yolov8m.pt')
    model_loaded = True
    print("✓ YOLO model loaded successfully")
except Exception as e:
    print(f"⚠ YOLO model not available: {e}")
    print("⚠ Running in fallback mode with mock detections")
    model_loaded = False


def preprocess_image(file_bytes):
    """Convert uploaded file to image array"""
    img = Image.open(io.BytesIO(file_bytes))
    img = img.convert('RGB')
    return np.array(img)


def map_to_category(detected_class):
    """Map detected object to lost & found category"""
    detected_class = detected_class.lower()
    return CATEGORY_MAPPING.get(detected_class, 'other')


def analyze_features(img):
    """Analyze image for additional features"""
    features = []
    
    # Convert to HSV for color analysis
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    
    # Check brightness
    brightness = np.mean(hsv[:,:,2])
    if brightness > 150:
        features.append('bright')
    elif brightness < 100:
        features.append('dark')
    
    # Check color saturation
    saturation = np.mean(hsv[:,:,1])
    if saturation < 50:
        features.append('neutral')
    elif saturation > 150:
        features.append('vibrant')
    
    # Check for specific colors
    # Red
    red_mask = cv2.inRange(hsv, (0, 100, 100), (10, 255, 255))
    if np.sum(red_mask) > 10000:
        features.append('red')
    
    # Blue
    blue_mask = cv2.inRange(hsv, (100, 100, 100), (130, 255, 255))
    if np.sum(blue_mask) > 10000:
        features.append('blue')
    
    # Green
    green_mask = cv2.inRange(hsv, (40, 100, 100), (80, 255, 255))
    if np.sum(green_mask) > 10000:
        features.append('green')
    
    # Black/White/Gray
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    if np.std(gray) < 30:
        features.append('neutral_color')
    elif np.mean(gray) > 200:
        features.append('light_color')
    elif np.mean(gray) < 50:
        features.append('dark_color')
    
    return features


@app.route('/detect', methods=['POST'])
def detect_objects():
    """Detect objects in uploaded image"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        img_bytes = file.read()
        img = preprocess_image(img_bytes)
        
        detections = []
        
        if model_loaded:
            # Run YOLO detection
            results = model(img, verbose=False)
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    conf = float(box.conf[0])
                    if conf > 0.3:  # Confidence threshold
                        cls = int(box.cls[0])
                        class_name = model.names[cls]
                        category = map_to_category(class_name)
                        
                        # Get bounding box
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        
                        detections.append({
                            'class': class_name,
                            'category': category,
                            'confidence': round(conf, 2),
                            'bbox': [int(x1), int(y1), int(x2), int(y2)]
                        })
        else:
            # Fallback mock detection
            detections = [
                {'class': 'bag', 'category': 'bags', 'confidence': 0.75, 'bbox': [50, 50, 200, 200]},
                {'class': 'electronics', 'category': 'electronics', 'confidence': 0.60, 'bbox': [100, 100, 180, 180]}
            ]
        
        return jsonify({
            'detections': detections,
            'status': 'SUCCESS' if detections else 'LOW_CONFIDENCE',
            'count': len(detections)
        })
        
    except Exception as e:
        print(f"Error in detect: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/analyze-hybrid', methods=['POST'])
def analyze_hybrid():
    """Hybrid analysis combining detection + feature extraction"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        img_bytes = file.read()
        img = preprocess_image(img_bytes)
        
        # Get detections
        detections = []
        best_category = 'other'
        best_confidence = 0
        
        if model_loaded:
            results = model(img, verbose=False)
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    conf = float(box.conf[0])
                    if conf > 0.25:
                        cls = int(box.cls[0])
                        class_name = model.names[cls]
                        category = map_to_category(class_name)
                        
                        detections.append({
                            'class': class_name,
                            'category': category,
                            'confidence': round(conf, 2),
                            'bbox': box.xyxy[0].cpu().numpy().tolist()
                        })
                        
                        if conf > best_confidence:
                            best_confidence = conf
                            best_category = category
        else:
            # Fallback
            detections = [{'class': 'bag', 'category': 'bags', 'confidence': 0.70}]
            best_category = 'bags'
        
        # Analyze features
        features = analyze_features(img)
        
        # Generate secondary tags
        secondary_tags = []
        if 'red' in features:
            secondary_tags.append('red')
        if 'blue' in features:
            secondary_tags.append('blue')
        if 'dark_color' in features:
            secondary_tags.append('dark')
        if 'vibrant' in features:
            secondary_tags.append('colorful')
        
        # Add importance indicators
        if best_category in ['electronics', 'jewelry', 'keys']:
            secondary_tags.append('valuable')
        elif best_category in ['documents', 'books']:
            secondary_tags.append('important')
        
        return jsonify({
            'detections': detections,
            'category': best_category,
            'features': features,
            'secondary_tags': secondary_tags,
            'status': 'SUCCESS' if detections else 'LOW_CONFIDENCE',
            'confidence': best_confidence
        })
        
    except Exception as e:
        print(f"Error in analyze-hybrid: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/extract', methods=['POST'])
def extract_features():
    """Extract embedding/features from image for similarity search"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        img_bytes = file.read()
        img = preprocess_image(img_bytes)
        
        # Generate mock embedding vector
        # In production, use a proper embedding model
        embedding = np.random.randn(128).tolist()
        
        return jsonify({
            'embedding': embedding,
            'dimensions': len(embedding)
        })
        
    except Exception as e:
        print(f"Error in extract: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'service': 'lost-found-ai'
    })


@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'service': 'Lost & Found AI Service',
        'version': '1.0.0',
        'endpoints': [
            '/detect',
            '/analyze-hybrid',
            '/extract',
            '/health'
        ]
    })


if __name__ == '__main__':
    print(f"Starting AI Service on port {PORT}...")
    app.run(host='0.0.0.0', port=PORT, debug=False)
