// setupDb.js
// Run this file once to create the SQLite database and seed it with sample data.
// Command: node setupDb.js

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Path to the database file
const DB_PATH = path.join(__dirname, "bookStore.db");

// Open (or create) the database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to SQLite database:", DB_PATH);
});

// Use serialize so the statements run one after another (in order)
db.serialize(() => {
  // ── 1. Create the books table ────────────────────────────────────────────
  db.run(
    `CREATE TABLE IF NOT EXISTS books (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      title  TEXT    NOT NULL,
      author TEXT    NOT NULL,
      price  REAL    NOT NULL
    )`,
    (err) => {
      if (err) {
        console.error("❌ Error creating table:", err.message);
        return;
      }
      console.log("✅ Table 'books' is ready.");
    }
  );

  // ── 2. Clear existing data so we don't duplicate on re-run ───────────────
  db.run(`DELETE FROM books`, (err) => {
    if (err) {
      console.error("❌ Error clearing table:", err.message);
      return;
    }
    console.log("🗑️  Cleared existing rows from 'books'.");
  });

  // Reset auto-increment counter
  db.run(`DELETE FROM sqlite_sequence WHERE name='books'`);

  // ── 3. Insert 10 sample books ────────────────────────────────────────────
  const sampleBooks = [
    ["The Great Gatsby",                 "F. Scott Fitzgerald",  299.99],
    ["To Kill a Mockingbird",            "Harper Lee",           349.00],
    ["1984",                             "George Orwell",        199.50],
    ["Harry Potter and the Sorcerer's Stone", "J.K. Rowling",   499.00],
    ["The Alchemist",                    "Paulo Coelho",         249.00],
    ["Clean Code",                       "Robert C. Martin",     699.00],
    ["The Pragmatic Programmer",         "Andrew Hunt",          749.00],
    ["Introduction to Algorithms",       "Thomas H. Cormen",     999.00],
    ["Atomic Habits",                    "James Clear",          399.00],
    ["Deep Work",                        "Cal Newport",          349.00],
  ];

  const stmt = db.prepare(
    `INSERT INTO books (title, author, price) VALUES (?, ?, ?)`
  );

  sampleBooks.forEach(([title, author, price]) => {
    stmt.run(title, author, price, (err) => {
      if (err) console.error("❌ Insert error:", err.message);
    });
  });

  stmt.finalize((err) => {
    if (err) {
      console.error("❌ Error finalizing statement:", err.message);
      return;
    }
    console.log(`✅ Inserted ${sampleBooks.length} sample books.`);
  });

  // ── 4. Verify the inserts ────────────────────────────────────────────────
  db.all(`SELECT * FROM books`, [], (err, rows) => {
    if (err) {
      console.error("❌ Error reading books:", err.message);
      return;
    }
    console.log("\n📚 Books in database:");
    console.table(rows);

    // Close the connection
    db.close((closeErr) => {
      if (closeErr) console.error("❌ Error closing DB:", closeErr.message);
      else console.log("\n🎉 Database setup complete! You can now run: node app.js");
    });
  });
});
