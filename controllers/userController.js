const pool = require('../db');


// GET ALL USERS.
exports.getUsers = async (req, res) => {
    const result = await pool.query(`SELECT * FROM users`);
    return res.status(200).json({
        success: true,
        data: result.rows,
        message: 'Returned successfully'
    });
}

// CREATE a user.
exports.createUser = async (req, res) => {
    try {
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

    } catch (err) {
        if (err.code === '23505') { // unique violation
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// GET user by ID;
exports.getUserById = async (req, res) => {
    try {

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
    } catch (err) {
        return res.status(500).json({
            success: false,
            data: err.message,
        });
    }
};

// UPADTE user.
exports.updateUser = async (req, res) => {
    try {
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

    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({
                success: false,
                data: [],
                message: "email alreay in use"
            })
        }
        return res.status(500).json({
            success: false,
            data: [],
            message: `server error: ${err.message}`
        })
    }
}


exports.deleteUser = async (req, res) => {
    try {
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

    } catch (err) {
        return res.status(500).json({
            success: false,
            data: [],
            message: `server error: ${err.message}`
        })
    }
}


