# BDF Lab 3 – REST API, Query Parameters, Validation & Debugging

> **Backend Development Fundamentals | Node.js + Express + SQLite**

A fully functional REST API for a **Book Store**, built as part of the BDF Lab 3 assignment. It demonstrates RESTful design, query parameters, input validation, proper HTTP status codes, and SQLite database integration.

---

## 📋 Features

| Feature | Details |
|---|---|
| REST API | Full CRUD for books (GET, POST, PUT, DELETE) |
| Query Parameters | Search, sort, paginate, and filter by price |
| Input Validation | Returns 400 with clear error messages |
| HTTP Status Codes | 200, 201, 400, 404, 500 used correctly |
| Database | SQLite with 10 pre-seeded books |
| Error Handling | Try/catch on all routes, graceful shutdown |
| Testing | Automated test script covering all scenarios |

---

## 🗂️ Project Structure

```
bdf-lab3/
├── app.js          ← Main server (Express + SQLite routes)
├── setupDb.js      ← Creates and seeds the database
├── bookStore.db    ← SQLite database (auto-created)
├── package.json    ← Project metadata and dependencies
├── test-apis.js    ← Automated API tests
└── README.md       ← This file
```

---

## ⚙️ Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or above
- npm (comes with Node.js)

### Steps

```bash
# 1. Navigate into the project folder
cd bdf-lab3

# 2. Install dependencies
npm install

# 3. Set up the database (run once)
node setupDb.js

# 4. Start the server
node app.js
```

The server will start at **http://localhost:3000**

---

## 🚀 How to Run

```bash
# Start the server
node app.js

# In a separate terminal, run the automated tests
node test-apis.js
```

---

## 🔗 API Endpoints

### Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/books` | Get all books (supports filters) |
| GET | `/books/:id` | Get a single book by ID |
| POST | `/books` | Add a new book |
| PUT | `/books/:id` | Update an existing book |
| DELETE | `/books/:id` | Delete a book |

---

### GET /books – Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search_q` | string | — | Partial title search (SQL LIKE) |
| `order_by` | string | `id` | Sort field: `title`, `author`, `price`, `id` |
| `order` | string | `ASC` | Sort direction: `ASC` or `DESC` |
| `limit` | number | `10` | Number of results to return |
| `offset` | number | `0` | Number of results to skip |
| `min_price` | number | — | Minimum price filter |
| `max_price` | number | — | Maximum price filter |

---

## 🔎 Query Parameter Examples

```bash
# Get all books
GET /books

# Search by title
GET /books?search_q=harry

# Sort by price (ascending)
GET /books?order_by=price&order=ASC

# Sort by price (descending)
GET /books?order_by=price&order=DESC

# Pagination – page 1 (first 3 books)
GET /books?limit=3&offset=0

# Pagination – page 2 (next 3 books)
GET /books?limit=3&offset=3

# Price filter – books between ₹300 and ₹700
GET /books?min_price=300&max_price=700

# Combined – search + sort + pagination
GET /books?search_q=the&order_by=price&order=ASC&limit=5&offset=0
```

---

## 📬 Postman Testing Guide

### Setup
1. Open Postman
2. Create a new **Collection** named `BDF Lab 3`
3. Set the base URL variable to `http://localhost:3000`

---

### 1. GET All Books

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:3000/books` |

**Expected Response (200 OK):**
```json
{
  "total": 10,
  "limit": 10,
  "offset": 0,
  "books": [ ... ]
}
```

📸 *Screenshot placeholder – GET all books*
> ![GET All Books](screenshots/get-all-books.png)

---

### 2. GET Single Book

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `http://localhost:3000/books/1` |

**Expected Response (200 OK):**
```json
{
  "id": 1,
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "price": 299.99
}
```

📸 *Screenshot placeholder – GET single book*
> ![GET Single Book](screenshots/get-single-book.png)

---

### 3. POST – Add a New Book

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `http://localhost:3000/books` |
| Body | `raw` → `JSON` |

**Request Body:**
```json
{
  "title": "Node.js Design Patterns",
  "author": "Mario Casciaro",
  "price": 549.99
}
```

**Expected Response (201 Created):**
```json
{
  "message": "Book added successfully.",
  "book": {
    "id": 11,
    "title": "Node.js Design Patterns",
    "author": "Mario Casciaro",
    "price": 549.99
  }
}
```

📸 *Screenshot placeholder – POST book*
> ![POST Book](screenshots/post-book.png)

---

### 4. PUT – Update a Book

| Field | Value |
|-------|-------|
| Method | `PUT` |
| URL | `http://localhost:3000/books/1` |
| Body | `raw` → `JSON` |

**Request Body (partial update is supported):**
```json
{
  "price": 349.99
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Book updated successfully.",
  "book": {
    "id": 1,
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "price": 349.99
  }
}
```

📸 *Screenshot placeholder – PUT book*
> ![PUT Book](screenshots/put-book.png)

---

### 5. DELETE – Remove a Book

| Field | Value |
|-------|-------|
| Method | `DELETE` |
| URL | `http://localhost:3000/books/1` |

**Expected Response (200 OK):**
```json
{
  "message": "Book with id 1 deleted successfully.",
  "deletedBook": {
    "id": 1,
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "price": 299.99
  }
}
```

📸 *Screenshot placeholder – DELETE book*
> ![DELETE Book](screenshots/delete-book.png)

---

### 6. Validation – Missing Title (400)

```json
POST /books
Body: { "author": "Someone", "price": 199 }

Response 400:
{ "error": "Title is required." }
```

### 7. Validation – Non-numeric Price (400)

```json
POST /books
Body: { "title": "X", "author": "Y", "price": "cheap" }

Response 400:
{ "error": "Price must be a valid number." }
```

### 8. Book Not Found (404)

```
GET /books/9999  →  404
{ "error": "Book with id 9999 not found." }
```

---

### 📸 Database View

📸 *Screenshot placeholder – Database view in DB Browser for SQLite*
> ![Database View](screenshots/database-view.png)

You can open `bookStore.db` with [DB Browser for SQLite](https://sqlitebrowser.org/) to visually inspect the data.

---

## 📊 HTTP Status Code Summary

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input / missing fields |
| 404 | Not Found | Book ID doesn't exist |
| 500 | Internal Server Error | Unexpected server error |

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js v4
- **Database:** SQLite (via `sqlite3` package)
- **Testing:** Custom Node.js test script
- **API Testing Tool:** Postman

---

## 📝 Notes

- Do **not** commit `node_modules/` to GitHub. It is listed in `.gitignore`.
- Do **not** commit `.env` files if you add them later.
- The `bookStore.db` file is auto-created when you run `node setupDb.js`.
- Port defaults to `3000`. Set `PORT` environment variable to override.

---

*BDF Lab 3 | Backend Development Fundamentals*
