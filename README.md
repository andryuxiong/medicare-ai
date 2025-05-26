# Medicare AI 🤖

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

A full-stack healthcare assistant that helps users identify possible conditions and over-the-counter medications based on symptoms. Built with modern technologies and a focus on user experience.

## ✨ Features

- 🤖 AI-powered symptom analysis using OpenAI's GPT-3.5
- 🎤 Voice input capability for easy symptom description
- 💊 Smart medication suggestions
- 🎨 Modern, responsive UI with dark/light mode
- 🔒 Secure API key management
- 🚀 Fast and reliable performance

## What will I probably work on in the future for this project
> **Note:** Bilingual support (English/Spanish) is currently disabled as the translation service is turned off.
 - Will add support translation services in future
 - Still adding more health databases to help with context, a bigger database means the AI uses less tokens and instead uses pure data from backend
 - Add better UX ie. user history to keep track and add context to the assistant
 - Mobile App using react native 
 - Add better support for follow-up questions and conversational aspects of the assistant

 ## What was difficult for this project?
_ API integration - integrating multiple API's like openAI or web speech was pretty difficult while trying to maintain real-time performance and handling various edge cases. Took a lot of testing lol

- Managing state interactions between voice input, ai processing, and UI updates while also mainting the smooth UX causing a lot of errors and bug fixes.

- There were a lot of API handling failures, network failures, I did a lot of testing on local development for it to work and then after deploying it just to not work :/ 

- Had to fix invalid inputs and change prompts as the prompts wouldnt output correctly or wasnt to my liking.

- Also deploying both frontend and backend so they both can work together was pretty difficult as sometime the frontend wouldnt call the backend correctly


## 🛠️ Tech Stack

- **Frontend:**
  - React.js
  - Material-UI
  - Speech Recognition API
  - Responsive Design

- **Backend:**
  - Java Spring Boot
  - OpenAI API Integration
  - RESTful API Architecture

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Java JDK 17 or higher
- OpenAI API key

### Installation
**Note: ** This is only for local development

1. **Clone the repository**
   ```bash
   git clone https://github.com/andryuxiong/medicare-ai.git
   cd medicare-ai
   ```

2. **Set up environment variables**

   Create a `.env` file in the `backend` directory:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   Create a `.env` file in the `frontend/medicare-ui` directory:
   ```bash
   REACT_APP_BACKEND_URL=http://localhost:8080
   ```

3. **Start the backend**
   ```bash
   cd backend
   ./gradlew bootRun
   ```

4. **Start the frontend**
   ```bash
   cd frontend/medicare-ui
   npm install
   npm start
   ```
## 🔧 Environment Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `PORT` | Server port (default: 8080) | No |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_BACKEND_URL` | Backend API URL | Yes |

## 🔒 Security

- API keys are managed through environment variables
- Sensitive files are excluded via `.gitignore`
- CORS is properly configured for production domains
- All API endpoints are secured

## 🚀 Deployment

The application is configured for deployment on:
- Frontend: Vercel
- Backend: Railway

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 👨‍💻 Author

- **Andrew Xiong** - [GitHub](https://github.com/andryuxiong)

## 🙏 Acknowledgments

- OpenAI for providing the AI capabilities
- The open-source community for various tools and libraries
