# Medicare AI

This project is a simple full-stack application that helps users identify possible conditions and over-the-counter medications based on symptoms. It supports English and Spanish and lets users enter symptoms using text or voice.

## Features

- Supports both English and Spanish for input and output.
- Users can describe symptoms by typing or by speaking.
- The backend uses simple keyword-matching to suggest possible conditions and medications.
- Translations are handled by LibreTranslate running in Docker.
- Built with React.js for the frontend and Java Spring Boot for the backend.

## How to Run the Project

### 1. Clone this repository

```bash/terminal
git clone https://github.com/andryuxiong/medicare-ai.git
cd medicare-ai

```start libretranslator(requires docker)
docker run -d --name libretranslate \
  -p 5001:5000 \
  -e LT_LOAD_ONLY=en,es \
  libretranslate/libretranslate:latest

```start backend
