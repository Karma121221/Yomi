# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for MeCab
RUN apt-get update && apt-get install -y \
    mecab \
    libmecab-dev \
    mecab-ipadic-utf8 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code into the container
COPY . .

# Make port 80 available to the world outside this container
# Render will automatically map this to its own network
EXPOSE 80

# Define environment variable for the port
ENV PORT 80

# Run app.py when the container launches
# Use Gunicorn for a production-ready server
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:80", "app:app"]