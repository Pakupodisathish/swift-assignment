# Node.js REST API for Users, Posts, and Comments

## Description

This is a RESTful API built with Node.js, Express, and MongoDB. It provides endpoints to manage users, their posts, and associated comments, fetching initial data from the JSONPlaceholder API.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

* **Node.js:** (Version 18 or higher recommended) - [https://nodejs.org/](https://nodejs.org/)
* **npm** (Node Package Manager) - usually installed with Node.js
* **MongoDB:** (Community Edition or a cloud-based MongoDB service) - [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

## Installation

1.  **Clone the repository** (if applicable, if you're using Git):
    ```bash
    git clone <your_repository_url>
    cd <your_project_directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    * Create a `.env` file in the root directory of your project.
    * Add your MongoDB connection URI to the `.env` file. Replace `<your_mongodb_uri>` with your actual MongoDB connection string. For a local MongoDB instance, it might look like:
        ```
        MONGODB_URL=mongodb://localhost:27017/node_assignment
        ```
        *(Note: If you used a different database name like `mydatabase`, use that name in the URI instead.)*

4.  **Compile TypeScript:**
    ```bash
    npx tsc
    ```
    This command will compile your TypeScript code in the `src` directory and output the JavaScript files to the `dist` directory.

## Running the Application

1.  **Start the Node.js server:**
    ```bash
    node dist/index.js
    ```
    The server will start and should log a message like `Server is running on port 3000` (or the port specified in your `.env` file or default 3000).

## API Endpoints

Here's a list of the implemented API endpoints:

### 1. `GET /load`

* **Description:** Fetches user, post, and comment data from the JSONPlaceholder API and populates the MongoDB database. This endpoint will clear any existing data before loading.
* **Method:** `GET`
* **URL:** `/load`
* **Example Usage:**
    ```bash
    curl http://localhost:3000/load
    ```
* **Expected Response:** A `200 OK` status code upon successful data load. Check the server console for details on the number of items loaded.

### 2. `DELETE /users`

* **Description:** Deletes all users and their associated posts and comments from the database.
* **Method:** `DELETE`
* **URL:** `/users`
* **Example Usage:**
    ```bash
    curl -X DELETE http://localhost:3000/users
    ```
* **Expected Response:**
    ```json
    {"message": "All users deleted successfully"}
    ```
    or
    ```json
    {"message": "No users found to delete"}
    ```
    with a `200 OK` or `404 Not Found` status code respectively.

### 3. `DELETE /users/:userId`

* **Description:** Deletes a specific user and their associated posts and comments based on the provided `userId`.
* **Method:** `DELETE`
* **URL:** `/users/:userId` (replace `:userId` with the actual user ID, e.g., `/users/1`)
* **Example Usage:**
    ```bash
    curl -X DELETE http://localhost:3000/users/1
    ```
* **Expected Response:**
    ```json
    {"message": "User and related data deleted successfully"}
    ```
    with a `200 OK` status code if the user was found and deleted, or
    ```json
    {"message": "User not found"}
    ```
    with a `404 Not Found` status code if the user does not exist.

### 4. `GET /users/:userId`

* **Description:** Retrieves a specific user and their associated posts (including their comments) based on the provided `userId`.
* **Method:** `GET`
* **URL:** `/users/:userId` (replace `:userId` with the actual user ID, e.g., `/users/1`)
* **Example Usage:**
    ```bash
    curl http://localhost:3000/users/1
    ```
* **Expected Response:** A JSON object containing the user details, an array of their posts, and each post containing an array of its comments.

### 5. `PUT /users`

* **Description:** Creates a new user. The request body should be a JSON object representing the user.
* **Method:** `PUT`
* **URL:** `/users`
* **Request Body Example:**
    ```json
    {
        "id": 11,
        "name": "Test User",
        "username": "testuser",
        "email": "test@example.com",
        "address": {
            "street": "Test Street",
            "suite": "Apt. 1",
            "city": "Test City",
            "zipcode": "12345-6789",
            "geo": {
                "lat": "-37.3159",
                "lng": "81.1496"
            }
        },
        "phone": "1-555-123-4567",
        "website": "test.com",
        "company": {
            "name": "Test Corp",
            "catchPhrase": "Test catchphrase",
            "bs": "Test bs"
        }
    }
    ```
* **Example Usage (using `curl` in PowerShell):**
    ```powershell
    Invoke-WebRequest -Uri http://localhost:3000/users -Method Put -Headers @{'Content-Type' = 'application/json'} -Body (ConvertTo-Json @{
        # ... your user object here ...
    })
    ```
* **Expected Response:** The newly created user object in JSON format with a `201 Created` status code.

### 6. `GET /users`

* **Description:** Retrieves a list of all users from the database.
* **Method:** `GET`
* **URL:** `/users`
* **Example Usage:**
    ```bash
    curl http://localhost:3000/users
    ```
* **Expected Response:** A JSON array of user objects.
