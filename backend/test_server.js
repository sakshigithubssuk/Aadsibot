const express = require('express');
const app = express();

// Use the PORT environment variable Render provides
const PORT = process.env.PORT;

app.get('/', (req, res) => {
    // This is the success message we want to see.
    res.status(200).send('✅ The Canary Test Server is running successfully!');
});

app.listen(PORT, () => {
    console.log(`✅✅✅ Canary Test Server started on port ${PORT}. If you see this, the environment is working.`);
});
