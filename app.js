// app.js
// BDF Lab 3 – REST API with Express + SQLite
// Run: node app.js

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path    = require("path");

// ─────────────────────────────────────────────
//  App & DB setup
// ─────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// Parse incoming JSON bodies
app.use(express.json());

// Open the SQLite database (created automatically if it does not exist)
const DB_PATH = path.join(__dirname, "bookStore.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Could not open database:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to SQLite database:", DB_PATH);

  // Create the books table if it doesn't exist yet (safe for Render cold starts)
  db.run(
    `CREATE TABLE IF NOT EXISTS books (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      title  TEXT    NOT NULL,
      author TEXT    NOT NULL,
      price  REAL    NOT NULL
    )`,
    (createErr) => {
      if (createErr) {
        console.error("❌ Error creating books table:", createErr.message);
        return;
      }
      // Seed only when the table is empty
      db.get("SELECT COUNT(*) AS count FROM books", [], (countErr, row) => {
        if (countErr) return;
        if (row.count === 0) {
          const seeds = [
            ["The Great Gatsby",                      "F. Scott Fitzgerald", 299.99],
            ["To Kill a Mockingbird",                 "Harper Lee",          349.00],
            ["1984",                                  "George Orwell",       199.50],
            ["Harry Potter and the Sorcerer's Stone", "J.K. Rowling",        499.00],
            ["The Alchemist",                         "Paulo Coelho",        249.00],
            ["Clean Code",                            "Robert C. Martin",    699.00],
            ["The Pragmatic Programmer",              "Andrew Hunt",         749.00],
            ["Introduction to Algorithms",            "Thomas H. Cormen",    999.00],
            ["Atomic Habits",                         "James Clear",         399.00],
            ["Deep Work",                             "Cal Newport",         349.00],
          ];
          const stmt = db.prepare("INSERT INTO books (title, author, price) VALUES (?, ?, ?)");
          seeds.forEach(([t, a, p]) => stmt.run(t, a, p));
          stmt.finalize(() => console.log("✅ Database seeded with 10 sample books."));
        } else {
          console.log(`ℹ️  Database already has ${row.count} book(s) – skipping seed.`);
        }
      });
    }
  );
});

// ─────────────────────────────────────────────
//  Helper: wrap db.run / db.get / db.all in
//  Promises so we can use async/await
// ─────────────────────────────────────────────

/** Run a query that changes data (INSERT / UPDATE / DELETE). */
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    // 'this' inside the callback has lastID and changes
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/** Fetch a single row. */
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/** Fetch all matching rows. */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// ─────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────

// ── GET / ───────────────────────────────────
// Health-check / welcome route (fixes Render root-URL 404)
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Book Store API is running!",
    version: "1.0.0",
    endpoints: {
      "GET /books":        "Get all books (supports search_q, order_by, order, limit, offset, min_price, max_price)",
      "GET /books/:id":    "Get a single book by ID",
      "POST /books":       "Add a new book",
      "PUT /books/:id":    "Update a book",
      "DELETE /books/:id": "Delete a book",
    },
  });
});

// ── GET /books ──────────────────────────────
// Supports: search_q, order_by, order, limit, offset, min_price, max_price
app.get("/books", async (req, res) => {
  try {
    const {
      search_q,
      order_by,
      order,
      min_price,
      max_price,
    } = req.query;

    // Defaults for pagination
    const limit  = parseInt(req.query.limit)  || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Build WHERE clauses safely (parameterized)
    const conditions = [];
    const params     = [];

    if (search_q) {
      conditions.push("title LIKE ?");
      params.push(`%${search_q}%`);
    }

    if (min_price !== undefined) {
      const minVal = parseFloat(min_price);
      if (isNaN(minVal)) {
        return res.status(400).json({ error: "min_price must be a number." });
      }
      conditions.push("price >= ?");
      params.push(minVal);
    }

    if (max_price !== undefined) {
      const maxVal = parseFloat(max_price);
      if (isNaN(maxVal)) {
        return res.status(400).json({ error: "max_price must be a number." });
      }
      conditions.push("price <= ?");
      params.push(maxVal);
    }

    // WHERE clause (optional)
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // ORDER BY clause – whitelist allowed columns to prevent SQL injection
    const allowedOrderBy = ["title", "author", "price", "id"];
    const allowedOrder   = ["ASC", "DESC"];

    const sortColumn    = allowedOrderBy.includes(order_by)         ? order_by         : "id";
    const sortDirection = allowedOrder.includes((order || "").toUpperCase()) ? order.toUpperCase() : "ASC";

    const orderClause = `ORDER BY ${sortColumn} ${sortDirection}`;

    // Final SQL
    const sql = `
      SELECT * FROM books
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const books = await dbAll(sql, params);

    // Also get total count (useful for pagination info)
    const countSql    = `SELECT COUNT(*) AS total FROM books ${whereClause}`;
    const countParams = params.slice(0, params.length - 2); // remove limit/offset
    const countRow    = await dbGet(countSql, countParams);

    return res.status(200).json({
      total:  countRow.total,
      limit,
      offset,
      books,
    });
  } catch (err) {
    console.error("GET /books error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /books/:id ──────────────────────────
app.get("/books/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID must be a number." });
    }

    const book = await dbGet("SELECT * FROM books WHERE id = ?", [id]);

    if (!book) {
      return res.status(404).json({ error: `Book with id ${id} not found.` });
    }

    return res.status(200).json(book);
  } catch (err) {
    console.error("GET /books/:id error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ── POST /books ─────────────────────────────
app.post("/books", async (req, res) => {
  try {
    const { title, author, price } = req.body;

    // ── Validation ───────────────────────────
    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required." });
    }

    if (!author || author.trim() === "") {
      return res.status(400).json({ error: "Author is required." });
    }

    if (price === undefined || price === null || price === "") {
      return res.status(400).json({ error: "Price is required." });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      return res.status(400).json({ error: "Price must be a valid number." });
    }

    if (priceNum < 0) {
      return res.status(400).json({ error: "Price cannot be negative." });
    }
    // ─────────────────────────────────────────

    const result = await dbRun(
      "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
      [title.trim(), author.trim(), priceNum]
    );

    // Fetch the newly created book to return it
    const newBook = await dbGet("SELECT * FROM books WHERE id = ?", [result.lastID]);

    return res.status(201).json({
      message: "Book added successfully.",
      book: newBook,
    });
  } catch (err) {
    console.error("POST /books error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ── PUT /books/:id ──────────────────────────
app.put("/books/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID must be a number." });
    }

    // Check the book exists first
    const existing = await dbGet("SELECT * FROM books WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ error: `Book with id ${id} not found.` });
    }

    // Allow partial updates – fall back to existing values if not provided
    const title  = req.body.title  !== undefined ? req.body.title.trim()   : existing.title;
    const author = req.body.author !== undefined ? req.body.author.trim()  : existing.author;
    const price  = req.body.price  !== undefined ? req.body.price           : existing.price;

    if (title === "") {
      return res.status(400).json({ error: "Title cannot be empty." });
    }
    if (author === "") {
      return res.status(400).json({ error: "Author cannot be empty." });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      return res.status(400).json({ error: "Price must be a valid number." });
    }
    if (priceNum < 0) {
      return res.status(400).json({ error: "Price cannot be negative." });
    }

    await dbRun(
      "UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?",
      [title, author, priceNum, id]
    );

    const updatedBook = await dbGet("SELECT * FROM books WHERE id = ?", [id]);

    return res.status(200).json({
      message: "Book updated successfully.",
      book: updatedBook,
    });
  } catch (err) {
    console.error("PUT /books/:id error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ── DELETE /books/:id ───────────────────────
app.delete("/books/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID must be a number." });
    }

    // Check the book exists before deleting
    const existing = await dbGet("SELECT * FROM books WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ error: `Book with id ${id} not found.` });
    }

    await dbRun("DELETE FROM books WHERE id = ?", [id]);

    return res.status(200).json({
      message: `Book with id ${id} deleted successfully.`,
      deletedBook: existing,
    });
  } catch (err) {
    console.error("DELETE /books/:id error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ─────────────────────────────────────────────
//  404 catch-all for unknown routes
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─────────────────────────────────────────────
//  Start the server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log("   Press Ctrl+C to stop.\n");
});

// Gracefully close the DB when the process exits
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) console.error("Error closing DB:", err.message);
    else console.log("\n🛑 Database connection closed. Server stopped.");
    process.exit(0);
  });
});
