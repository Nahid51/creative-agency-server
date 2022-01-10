const express = require('express');
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // data ke parse kore

app.get('/', (req, res) => {
    res.send('Hello Node JS!')
})

app.listen(port, () => {
    console.log('Running server at port:', port)
})