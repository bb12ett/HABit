FROM python:3.11-alpine

WORKDIR /app

RUN pip install --no-cache-dir flask cryptography

COPY . /app/

EXPOSE 8099

CMD ["python", "app.py"]
