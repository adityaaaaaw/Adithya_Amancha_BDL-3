// test-apis.js
// BDF Lab 3 – Automated API tests
// Make sure the server is running first: node app.js
// Then in another terminal: node test-apis.js

const http = require("http");

const BASE_URL = "http://localhost:3000";

// ─────────────────────────────────────────────
//  Minimal HTTP helper (no extra dependencies)
// ─────────────────────────────────────────────
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: "localhost",
      port: 3000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─────────────────────────────────────────────
//  Simple assertion helper
// ─────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
//  Test Suite
// ─────────────────────────────────────────────
async function runTests() {
  console.log("=".repeat(55));
  console.log("  BDF Lab 3 – API Test Suite");
  console.log("=".repeat(55));

  let createdId; // will store the ID of the book we POST

  // ── 1. GET all books ───────────────────────
  console.log("\n📌 Test 1: GET /books – Get all books");
  {
    const res = await request("GET", "/books");
    assert("Status is 200",           res.status === 200);
    assert("Response has 'books' key", Array.isArray(res.body.books));
    assert("Returns at least 10 books", res.body.books.length >= 10);
    assert("Response has 'total' key", typeof res.body.total === "number");
    assert("Response has 'limit' key", typeof res.body.limit === "number");
    assert("Response has 'offset' key",typeof res.body.offset === "number");
  }

  // ── 2. GET single book ─────────────────────
  console.log("\n📌 Test 2: GET /books/1 – Get a single book");
  {
    const res = await request("GET", "/books/1");
    assert("Status is 200",         res.status === 200);
    assert("Has 'id' field",        res.body.id === 1);
    assert("Has 'title' field",     typeof res.body.title === "string");
    assert("Has 'author' field",    typeof res.body.author === "string");
    assert("Has 'price' field",     typeof res.body.price === "number");
  }

  // ── 3. POST a new book ─────────────────────
  console.log("\n📌 Test 3: POST /books – Add a new book");
  {
    const res = await request("POST", "/books", {
      title:  "Node.js Design Patterns",
      author: "Mario Casciaro",
      price:  549.99,
    });
    assert("Status is 201",           res.status === 201);
    assert("Has success message",     res.body.message !== undefined);
    assert("New book has id",         res.body.book.id !== undefined);
    assert("Title matches",           res.body.book.title === "Node.js Design Patterns");
    assert("Author matches",          res.body.book.author === "Mario Casciaro");
    assert("Price matches",           res.body.book.price === 549.99);
    createdId = res.body.book.id;
  }

  // ── 4. PUT (update) a book ─────────────────
  console.log(`\n📌 Test 4: PUT /books/${createdId} – Update the book`);
  {
    const res = await request("PUT", `/books/${createdId}`, {
      title: "Node.js Design Patterns (3rd Edition)",
      price: 599.00,
    });
    assert("Status is 200",           res.status === 200);
    assert("Title updated",           res.body.book.title === "Node.js Design Patterns (3rd Edition)");
    assert("Price updated",           res.body.book.price === 599);
    assert("Author unchanged",        res.body.book.author === "Mario Casciaro");
  }

  // ── 5. DELETE a book ───────────────────────
  console.log(`\n📌 Test 5: DELETE /books/${createdId} – Delete the book`);
  {
    const res = await request("DELETE", `/books/${createdId}`);
    assert("Status is 200",             res.status === 200);
    assert("Has success message",       res.body.message !== undefined);
    assert("Returns deleted book data", res.body.deletedBook.id === createdId);
  }

  // Confirm deleted book is gone
  {
    const res = await request("GET", `/books/${createdId}`);
    assert("Deleted book returns 404",  res.status === 404);
  }

  // ── 6. Search by title (search_q) ──────────
  console.log("\n📌 Test 6: GET /books?search_q=harry – Search by title");
  {
    const res = await request("GET", "/books?search_q=harry");
    assert("Status is 200",                 res.status === 200);
    assert("Returns at least 1 result",     res.body.books.length >= 1);
    assert("Result contains 'Harry'",
      res.body.books.some((b) => b.title.toLowerCase().includes("harry"))
    );
  }

  // ── 7. Sort by price ASC ───────────────────
  console.log("\n📌 Test 7: GET /books?order_by=price&order=ASC – Sort by price");
  {
    const res = await request("GET", "/books?order_by=price&order=ASC");
    assert("Status is 200", res.status === 200);
    const prices = res.body.books.map((b) => b.price);
    const isSorted = prices.every((p, i) => i === 0 || p >= prices[i - 1]);
    assert("Books are sorted by price ASC", isSorted);
  }

  // ── 8. Sort by price DESC ──────────────────
  console.log("\n📌 Test 8: GET /books?order_by=price&order=DESC – Sort descending");
  {
    const res = await request("GET", "/books?order_by=price&order=DESC");
    assert("Status is 200", res.status === 200);
    const prices = res.body.books.map((b) => b.price);
    const isSorted = prices.every((p, i) => i === 0 || p <= prices[i - 1]);
    assert("Books are sorted by price DESC", isSorted);
  }

  // ── 9. Pagination – limit & offset ─────────
  console.log("\n📌 Test 9: GET /books?limit=3&offset=0 – Pagination");
  {
    const res = await request("GET", "/books?limit=3&offset=0");
    assert("Status is 200",        res.status === 200);
    assert("Returns 3 books",      res.body.books.length === 3);
    assert("limit is 3",           res.body.limit === 3);
    assert("offset is 0",          res.body.offset === 0);
  }

  // Offset test
  console.log("\n📌 Test 9b: GET /books?limit=3&offset=3 – Next page");
  {
    const page1 = await request("GET", "/books?limit=3&offset=0");
    const page2 = await request("GET", "/books?limit=3&offset=3");
    assert("Page 2 returns 3 books",    page2.body.books.length === 3);
    assert("Page 2 has different books",
      page1.body.books[0].id !== page2.body.books[0].id
    );
  }

  // ── 10. Price filter ───────────────────────
  console.log("\n📌 Test 10: GET /books?min_price=300&max_price=700 – Price filter");
  {
    const res = await request("GET", "/books?min_price=300&max_price=700");
    assert("Status is 200", res.status === 200);
    const allInRange = res.body.books.every(
      (b) => b.price >= 300 && b.price <= 700
    );
    assert("All books are within price range", allInRange);
  }

  // ── 11. Invalid POST – missing title ───────
  console.log("\n📌 Test 11: POST /books – Missing title (expect 400)");
  {
    const res = await request("POST", "/books", {
      author: "Some Author",
      price:  199,
    });
    assert("Status is 400",           res.status === 400);
    assert("Error message present",   res.body.error !== undefined);
    console.log(`     Error: "${res.body.error}"`);
  }

  // ── 12. Invalid POST – missing author ──────
  console.log("\n📌 Test 12: POST /books – Missing author (expect 400)");
  {
    const res = await request("POST", "/books", {
      title: "Some Book",
      price: 199,
    });
    assert("Status is 400",           res.status === 400);
    assert("Error message present",   res.body.error !== undefined);
    console.log(`     Error: "${res.body.error}"`);
  }

  // ── 13. Invalid POST – non-numeric price ───
  console.log("\n📌 Test 13: POST /books – Non-numeric price (expect 400)");
  {
    const res = await request("POST", "/books", {
      title:  "Valid Title",
      author: "Valid Author",
      price:  "not-a-price",
    });
    assert("Status is 400",           res.status === 400);
    assert("Error message present",   res.body.error !== undefined);
    console.log(`     Error: "${res.body.error}"`);
  }

  // ── 14. Non-existent book GET ──────────────
  console.log("\n📌 Test 14: GET /books/9999 – Non-existent book (expect 404)");
  {
    const res = await request("GET", "/books/9999");
    assert("Status is 404",         res.status === 404);
    assert("Error message present", res.body.error !== undefined);
    console.log(`     Error: "${res.body.error}"`);
  }

  // ── 15. Non-existent book PUT ──────────────
  console.log("\n📌 Test 15: PUT /books/9999 – Non-existent book (expect 404)");
  {
    const res = await request("PUT", "/books/9999", { title: "Ghost Book" });
    assert("Status is 404",         res.status === 404);
    assert("Error message present", res.body.error !== undefined);
  }

  // ── 16. Non-existent book DELETE ───────────
  console.log("\n📌 Test 16: DELETE /books/9999 – Non-existent book (expect 404)");
  {
    const res = await request("DELETE", "/books/9999");
    assert("Status is 404",         res.status === 404);
    assert("Error message present", res.body.error !== undefined);
  }

  // ── 17. Invalid min_price param ────────────
  console.log("\n📌 Test 17: GET /books?min_price=abc – Invalid price param (expect 400)");
  {
    const res = await request("GET", "/books?min_price=abc");
    assert("Status is 400",         res.status === 400);
    assert("Error message present", res.body.error !== undefined);
  }

  // ── Summary ────────────────────────────────
  console.log("\n" + "=".repeat(55));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(55));

  if (failed === 0) {
    console.log("  🎉 All tests passed!\n");
  } else {
    console.log("  ⚠️  Some tests failed. Check the output above.\n");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("\n❌ Could not connect to the server.");
  console.error("   Make sure the server is running: node app.js");
  console.error("   Error:", err.message);
  process.exit(1);
});
