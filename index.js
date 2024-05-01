const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;

app.use('/css', express.static(__dirname + '/public/css'));
app.use('/html', express.static(__dirname + '/public/html'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/html/home.html');

});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
