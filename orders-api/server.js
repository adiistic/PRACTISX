
const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const path = require("path");

// Middleware: parse incoming JSON request bodies
app.use(express.json());

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Temporary in-memory order storage
const orders = [];
let nextOrderId = 1;

// GET /api/orders - Fetch all orders
app.get("/api/orders", (req, res) => {
    return res.json({
        success: true,
        count: orders.length,
        orders: [...orders].reverse()
    });
});

// POST /api/orders
app.post("/api/orders", (req, res) => {
    const { productId, quantity, customerEmail } = req.body || {};

    // 1. Validate required fields
    if (
        productId === undefined ||
        quantity === undefined ||
        customerEmail === undefined
    ) {
        return res.status(400).json({
            success: false,
            message: "productId, quantity and customerEmail are required"
        });
    }

    // 2. Validate productId
    if (
        typeof productId !== "string" ||
        productId.trim() === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "productId must be a non-empty string"
        });
    }

    // 3. Validate quantity
    if (
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "quantity must be a positive integer"
        });
    }

    // 4. Validate email format (basic check)
    if (
        typeof customerEmail !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    ) {
        return res.status(400).json({
            success: false,
            message: "A valid customerEmail is required"
        });
    }

    // 5. Create the order
    const order = {
        id: nextOrderId++,
        productId: productId.trim(),
        quantity,
        customerEmail: customerEmail.trim(),
        status: "pending",
        createdAt: new Date().toISOString()
    };

    orders.push(order);

    // 6. Return the created order
    return res.status(201).json({
        success: true,
        message: "Order created successfully",
        order
    });
});

// Handle malformed JSON and other Express errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON body"
        });
    }

    console.error(err);
    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
