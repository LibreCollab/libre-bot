# libreBot - Your Friendly Neighborhood Bot for LibreCollab

libreBot is a versatile Discord bot built to serve the LibreCollab community. It offers a range of utilities and fun commands, with new features being added over time. One of its key features is a Hetzner Server Auction notifier.

## Core Features

*   **Utility Commands**: Helpful tools and information.
*   **Engagement**: Fun and interactive commands.
*   **Modular Design**: Built with a clean architecture to easily add new features.
*   **Dockerized**: Easy to set up and run using Docker and Docker Compose.

## Featured Module: Hetzner Auction Notifier

libreBot can help you stay updated on the Hetzner server auction!
*   **Customizable Notifications**: Set your desired server specifications:
    *   Price (EUR/USD, with VAT calculation)
    *   Location (Datacenter)
    *   CPU Type (AMD/Intel)
    *   RAM (Size, ECC support)
    *   Storage (Drive Size, Count, Type - NVMe, SSD, HDD)
*   **Direct Links**: Notifications include a direct link to the server on the Hetzner auction page.
*   **Periodic Checks**: The bot automatically checks the Hetzner auction every ~30 minutes.
*   **User Configuration Management**:
    *   Save up to 10 alert configurations per user for the Hetzner auction.
    *   Configurations automatically expire after 90 days.
    *   Clear all your active Hetzner configurations with a simple command.
*   **MongoDB Integration**: User configurations for the Hetzner notifier are stored in a MongoDB database.

## Available Commands

*   `/ping`: Checks the bot's responsiveness and latency.
*   `/helloworld`: A simple test command to ensure the bot is active.
*   **Hetzner Auction Module:**
    *   `/hetzner [options...]`: Set up a new Hetzner server auction alert.
        *   Example: `/hetzner price:70 currency:EUR location:FSN ram_size:64 ram_ecc:true drive_type:NVMe`
    *   `/hetzner_clear`: Deletes all of your currently active Hetzner alert configurations.
*   *(More commands to come!)*

## Quick Start with Docker

This is the recommended way to run libreBot for development and deployment.

### Prerequisites

*   [Docker](https://www.docker.com/get-started) installed and running.
*   [Docker Compose](https://docs.docker.com/compose/install/) installed (usually comes with Docker Desktop).
*   A Discord Bot Token and Application Client ID (from the [Discord Developer Portal](https://discord.com/developers/applications)).
*   A Discord Channel ID where Hetzner auction notifications should be sent.

### Setup

1.  **Clone the Repository (or create your project files):**
    ```bash
    # If you have a git repo:
    # git clone <your-repo-url>
    # cd libreBot
    ```

2.  **Create a `.env` file:**
    In the root of the project, create a file named `.env` and populate it with your credentials and settings.

    ```env
    # Discord Bot Credentials
    DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
    CLIENT_ID=YOUR_DISCORD_APPLICATION_CLIENT_ID_HERE
    GUILD_ID=YOUR_LIBRECOLLAB_SERVER_ID # Or your test server ID for slash command dev

    # MongoDB Credentials & Configuration (for Docker Compose setup - primarily for Hetzner feature)
    MONGO_ROOT_USER=yourmongouser          # Choose a username for MongoDB
    MONGO_ROOT_PASSWORD=yourmongopassword  # Choose a strong password for MongoDB
    MONGODB_URI=mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongo:27017/hetzner_alerts_db?authSource=admin

    # Hetzner Feature Configuration
    HETZNER_NOTIFICATIONS_CHANNEL_ID=YOUR_DISCORD_CHANNEL_ID_FOR_NOTIFICATIONS
    ```
    *   Replace placeholder values with your actual information.
    *   The `MONGODB_URI` is specifically formatted for the Docker Compose setup where `mongo` is the service name of the MongoDB container.
    *   Set `GUILD_ID` to your LibreCollab server ID for faster command propagation, or a test server ID during development.

3.  **Run up script:**
    Before starting the bot for the first time, or whenever you add/modify command definitions, you need to register them with Discord. Run the following script from your project root `./scripts/up.sh`. This script will register the commands and do a docker compose build.

### Managing the Bot

*   **View Logs:**
    *   Bot logs: `docker-compose logs -f librebot`
    *   MongoDB logs: `docker-compose logs -f mongo`
*   **Stop the Bot:**
    ```bash
    docker-compose down
    ```
    (This stops and removes the containers. The MongoDB data will persist in the Docker volume.)
*   **Stop and Remove Data (e.g., for a fresh start - BE CAREFUL, affects Hetzner data):**
    ```bash
    docker-compose down -v
    ```
*   **Restart the Bot:**
    ```bash
    docker-compose restart librebot
    ```
    Or, if you made changes that require a rebuild (like `Dockerfile` changes):
    ```bash
    docker-compose up --build -d
    ```

### Connecting to MongoDB (Optional, for Hetzner feature data)

If you want to connect to the Dockerized MongoDB instance from your host machine using a tool like MongoDB Compass:
1.  Ensure the `ports` section in `docker-compose.yml` for the `mongo` service is uncommented:
    ```yaml
    services:
      mongo:
        # ...
        ports:
          - "6969:27017" # Exposes MongoDB to your host on port 27017
        # ...
    ```
    (If you uncomment this, run `docker-compose up --build -d` again).
2.  Use the following connection URI in MongoDB Compass:
    `mongodb://yourmongouser:yourmongopassword@localhost:27017/hetzner_alerts_db?authSource=admin`
    (Replace `yourmongouser` and `yourmongopassword` with the values from your `.env` file).

## Development (Without Docker - if preferred)

1.  Install Node.js (v22+ recommended, or as per your `Dockerfile`) and npm.
2.  Install MongoDB and ensure it's running (if using features that require it, like the Hetzner notifier).
3.  Clone the repository.
4.  Install dependencies: `npm install`
5.  Create and configure your `.env` file (adjust `MONGODB_URI` to point to your local MongoDB instance if needed).
6.  Deploy commands: `npm run deploy`
7.  Start the bot: `npm start` or `npm run dev` (for nodemon).

## Contributing

Contributions to libreBot are welcome! If you have ideas for new features or improvements for the LibreCollab server, please feel free to submit a pull request or open an issue.

## License

MIT License

Copyright (c) 2025 LibreCollab

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
