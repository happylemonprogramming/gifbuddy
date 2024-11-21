# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies, including ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Ensure the correct port is dynamically assigned by Heroku
ENV PORT=8000

# Expose the port for the app (this is for documentation purposes)
EXPOSE $PORT

# Define the default command to run the application
CMD ["gunicorn", "-t", "600", "-b", "0.0.0.0:$PORT", "api:app"]
