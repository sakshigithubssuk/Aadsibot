### Aadsibot - Your Intelligent Telegram Chat Companion

Aadsibot is a powerful and interactive Telegram chatbot designed to provide a seamless and engaging user experience. This project integrates a secure user authentication system, a user-friendly interface for interacting with the bot, and a credit-based usage model with integrated payment solutions.

### Key Features---------------------------------------------------------------------------------------------------------------

Secure User Authentication: A robust registration and login system ensures that user data and interactions remain private and secure.

Seamless Telegram Integration: Activate your personal bot by obtaining a unique ID from the chat page, searching for @Aadsibot on Telegram, and initiating a chat with the command /start <your_unique_id>. This instantly links your account and activates your bot.

Interactive Chat: Once connected, users can engage in natural and intuitive conversations with the bot.

Credit-Based System: To maintain a fair usage policy, each user is initially granted 10 credits upon registration. Every reply from the bot deducts one credit from the user's balance.

Usage History: A detailed usage history allows users to track their total credits spent, along with the date and time of each interaction.

Comprehensive User Profile: The profile section provides users with an overview of their account, including their Telegram linkage status and whether their bot is currently active.

Integrated Payment System: Users can easily replenish their credits through a secure payment gateway. We offer flexible plans to suit your needs:

1-Month Plan: Add 30 credits to your account.

3-Month Plan: Add 90 credits to your account.

Feedback Mechanism: A dedicated feedback button allows users to share their suggestions and report any issues, helping us to continuously improve the Aadsibot experience.

### Getting Started---------------------------------------------------------

To get a local copy up and running, follow these simple steps.

### Prerequisites---------------------------------------------------

Ensure you have Node.js and npm installed on your machine.

Installation

Clone the repository:

Generated sh
### git clone https://github.com/sakshigithubssuk/Aadsibot.git


Navigate to the project directory:

Generated sh
cd chatbot
Frontend Setup

Navigate to the frontend directory:
### ------------------------------------------------------------------
cd frontend
Install NPM packages:

npm install

npm run dev
### ------------------------------------------------------------------------
Backend Setup
Navigate to the backend directory:
Install NPM packages:

npm install
Create a .env file in the backend directory and add the following environment variables:
## if you want to create your own environment variables::-----
### how get TELEGRAM_BOT_TOKEN:
search @Bot father on telegram which has blue tick
send a text
/start

/newbot
now you get your BOT-token in text
## how to get geminiAPi key
search in google gemini2.5pro then click on GetApikey click on create api key now you get copy it paste in .env done
### how to get razorpay_id
register in razorpay copy you id and secret key and paste it here in .env

Generated env
PORT=5050
MONGO_URI="your_mongodb_connection_string"
JWT_SECRET="your_jwt_secret"
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
GEMINI_API_KEY="your_gemini_api_key"

Start the server:
npm start

#####
Local Development Configuration
To run the application locally, you will need to update the API endpoints in the frontend code to point to your local backend server (http://localhost:5050) and ensure the frontend is configured to run on its designated port (e.g., http://localhost:5173).


## Deployment
Backend Deployment (Render)

Go to Render and create a new Web Service.

Connect your GitHub repository.

Configure the build and start commands.

Add your environment variables.

Deploy the service.

Frontend Deployment (Vercel)

Go to Vercel and create a new project.

Import your GitHub repository.

Vercel will typically auto-detect the framework and configure the build settings.

Add any necessary environment variables for the frontend.

Deploy the project.
