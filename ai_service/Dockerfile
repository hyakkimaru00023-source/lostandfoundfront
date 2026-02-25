FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for OpenCV - includes OpenGL libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libgl1-mesa-dri \
    libglapi-mesa \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgthread-2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --timeout 300

# Copy application code
COPY main.py .

# Create uploads directory
RUN mkdir -p uploads

# Expose port (5000 for local, will be configured by environment)
EXPOSE 5000

# Run the Flask application
CMD ["python", "main.py"]
