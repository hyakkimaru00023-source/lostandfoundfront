FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required by OpenCV and YOLO
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Create uploads directory
RUN mkdir -p uploads

# Expose port (5000 for local, will be configured by environment)
EXPOSE 5000

# Run the Flask application
CMD ["python", "main.py"]
