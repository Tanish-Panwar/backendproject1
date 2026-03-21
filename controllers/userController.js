const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');


// GET ALL USERS.
exports.getUsers = asyncHandler(async (req, res) => {
    const result = await pool.query(`SELECT * FROM users`);
    return res.status(200).json({
        success: true,
        data: result.rows,
        message: 'Returned successfully'
    });
})

// CREATE a user.
exports.createUser = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await pool.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [name.trim(), normalizedEmail]
    );

    return res.status(201).json({
        success: true,
        data: result.rows[0],
    });
});

// GET user by ID;
exports.getUserById = asyncHandler(async (req, res) => {

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ID"
        });
    }

    const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ success: false });
    }

    return res.status(200).json({
        success: true,
        data: result.rows[0],
    });
});

// UPADTE user.
exports.updateUser = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ID"
        });
    }
    const { name, email } = req.body;

    if (!name && !email) {
        return res.status(400).json({
            success: false,
            message: "Nothing to update"
        });
    }

    let fields = [];
    let values = [];
    let index = 1;

    if (name) {
        fields.push(`name = $${index++}`);
        values.push(name.trim());
    }

    if (email) {
        fields.push(`email = $${index++}`);
        values.push(email.toLowerCase().trim());
    }

    values.push(id);

    const query = `
            UPDATE users 
            SET ${fields.join(", ")} 
            WHERE id = $${index}
            RETURNING *
        `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    return res.status(200).json({
        success: true,
        data: result.rows[0],
        message: "User updated successfully."
    });
});


exports.deleteUser = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ID"
        });
    }

    const result = await pool.query(`
            DELETE FROM users where id = $1 RETURNING *`,
        [id]
    );
    if (result.rowCount === 0) {
        return res.status(404).json({
            success: false,
            data: [],
            message: `Cannot find user.`
        })
    }
    return res.status(200).json({
        success: true,
        data: result.rows[0],
        message: "User deleted successfully."
    })
});


