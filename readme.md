const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "geheim",
    resave: false,
    saveUninitialized: false
}));

mongoose.connect(process.env.MONGO_URI);

// ================= Modelle =================
const User = mongoose.model("Benutzer", {
    username: String,
    password: String,
    role: String // manager oder mitarbeiter
});

const Item = mongoose.model("Eintrag", {
    type: String, // Bewegung, Fütterung, Notfall, Termine
    text: String,
    status: { type: String, default: "offen" }
});

// ================= Middleware =================
function isAuth(req, res, next) {
    if (req.session.userId) return next();
    res.redirect("/");
}

async function getUser(req) {
    return await User.findById(req.session.userId);
}

// ================= Layout =================
function layout(title, content, user) {
    let menu = `<div style="position:fixed; top:10px; left:10px;">`;

    if (!user) {
        menu += `<a href="/">Login</a><br><a href="/notfall">Notfall</a>`;
    } else {
        menu += `
        <a href="/bewegung">Bewegung</a><br>
        <a href="/fuetterung">Fütterung</a><br>
        <a href="/notfall">Notfall</a><br>
        <a href="/mitarbeiter">Mitarbeiter</a><br>
        <a href="/termine">Termine</a><br><br>
        <a href="/logout">Abmelden</a>
        `;
    }

    menu += "</div>";

    return `
    <html>
    <head>
    <title>${title}</title>
    </head>
    <body style="margin-left:150px; font-family:Arial;">
    ${menu}
    <h1>${title}</h1>
    ${content}
    </body>
    </html>
    `;
}

// ================= Start / Login =================
app.get("/", (req, res) => {
    res.send(layout("Login", `
    <form method="POST" action="/login">
        <input name="username" placeholder="Benutzername" required><br><br>
        <input type="password" name="password" placeholder="Passwort" required><br><br>
        <button>Login</button>
    </form>
    <br><a href="/register">Registrieren</a>
    `));
});

app.post("/login", async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.send("Benutzer nicht gefunden");
    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) return res.send("Falsches Passwort");

    req.session.userId = user._id;
    res.redirect("/bewegung");
});

// ================= Register =================
app.get("/register", (req, res) => {
    res.send(`
    <form method="POST" action="/register">
        <input name="username" placeholder="Benutzername" required><br><br>
        <input type="password" name="password" placeholder="Passwort" required><br><br>
        Rolle:
        <select name="role">
            <option value="mitarbeiter">Mitarbeiter</option>
            <option value="manager">Manager</option>
        </select><br><br>
        <button>Registrieren</button>
    </form>
    `);
});

app.post("/register", async (req, res) => {
    const hashed = await bcrypt.hash(req.body.password, 10);
    await User.create({
        username: req.body.username,
        password: hashed,
        role: req.body.role
    });
    res.redirect("/");
});

// ================= Dashboard-Seiten =================
async function pageHandler(req, res, type) {
    const user = await getUser(req);
    const items = await Item.find({ type });

    let list = items.map(i => `
        <li>
            ${i.text} - ${i.status}
            ${user.role === "mitarbeiter"
