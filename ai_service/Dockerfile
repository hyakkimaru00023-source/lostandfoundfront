FROM python:3.12-slim

WORKDIR /app

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
