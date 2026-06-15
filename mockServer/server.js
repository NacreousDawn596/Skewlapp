const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Database Persistence
const DB_PATH = path.join(__dirname, 'db.json');

function loadDB() {
    if (fs.existsSync(DB_PATH)) {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
    return {
        profile: {
            full_name: "Mock Student",
            code: "20260001",
            filiere: "Génie Informatique",
            niveau: "4A"
        },
        currentElems: [
            { code: "INFO401_1", name: "Algorithmique", cc: "14,50", ex: "12,00", moy: "13,00" },
            { code: "INFO402_1", name: "SQL", cc: "--", ex: "--", moy: "--" }
        ],
        currentMods: [
            { code: "INFO401", name: "Algorithmique Avancée", moy: "13,00", dec: "Validé" }
        ],
        historyElems: [
            { code: "MATH301", name: "Analyse III", moy: "15,00", au: "2024/2025" }
        ],
        historyMods: [
            { code: "MATH3", name: "Mathématiques III", moy: "14,50", au: "2024/2025" }
        ],
        semestres: [
            { name: "S7", au: "2025/2026", moy: "13,75", dec: "Validé" }
        ],
        annees: [
            { name: "3A", au: "2024/2025", moy: "14,10", dec: "Admis" }
        ],
        absences: [
            { element: "INFO401_1", date: "2026-06-01", justified: "NON" }
        ],
        sanctions: {
            status: "Avertissement",
            count: 1
        }
    };
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let db = loadDB();

// Latency Simulation
app.use((req, res, next) => {
    const delay = Math.floor(Math.random() * 200) + 50; 
    setTimeout(next, delay);
});

// Auth Middleware
const SESSION_COOKIE = 'JSESSIONID';
const MOCK_SESSION = 'MOCK_SESS_12345';

function checkAuth(req, res, next) {
    if (req.cookies[SESSION_COOKIE] === MOCK_SESSION || req.path === '/login') {
        next();
    } else {
        res.send('<html><div class="login-box"><input name="email"></div></html>');
    }
}

// HTML Templates
const layout = (content) => `
<!DOCTYPE html>
<html>
<head>
    <title>SchoolApp Mock</title>
    <meta name="csrf-token" content="MOCK_CSRF_${Math.random().toString(36).substring(7)}">
</head>
<body>
    <div id="wrapper">
        <nav class="navbar navbar-dark bg-primary">Mock Navbar</nav>
        <div class="container-fluid">
            ${content}
        </div>
    </div>
</body>
</html>
`;

const tableTemplate = (headers, rows, className = "table table-striped table-sm") => `
<table class="${className}">
    <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
        ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
    </tbody>
</table>
`;

// --- API Endpoints ---

// Auth
app.get('/login', (req, res) => {
    const html = `
        <div class="login-box">
            <form action="/login" method="post">
                <input type="hidden" name="_csrf" value="MOCK_CSRF_TOKEN">
                <input name="email" type="text"><input name="password" type="password">
                <button type="submit">Sign In</button>
            </form>
        </div>
    `;
    res.send(layout(html));
});

app.post('/login', (req, res) => {
    res.cookie(SESSION_COOKIE, MOCK_SESSION, { httpOnly: true });
    res.redirect('/index');
});

// Profile
app.get('/index', checkAuth, (req, res) => {
    const html = `
        <div class="profile-card">
            <h5 class="full_name">${db.profile.full_name}</h5>
            <span class="code">${db.profile.code}</span>
            <div class="academic-info">
                <table>
                    <tr><td>Filière</td><td>${db.profile.filiere}</td></tr>
                    <tr><td>Niveau</td><td>${db.profile.niveau}</td></tr>
                </table>
            </div>
        </div>
    `;
    res.send(layout(html));
});

// Plan d'études (HTML table required by parsers/filieres.js)
app.get('/plan-etudes-view/filieres', checkAuth, (req, res) => {
    const headers = ["Code", "Intitule", "Departement", "Accreditation", "Descriptif", "Plan_Etudes"];
    const rows = [["GINF", "Génie Informatique", "Informatique", "2026", "Link", "View"]];
    res.send(layout(tableTemplate(headers, rows, "table table-striped table-sm mb-1 display")));
});

// Plan d'études Modules (Complex HTML required by parsers/modules.js)
app.get('/plan-etudes-view/modules', checkAuth, (req, res) => {
    const html = `
    <table class="table table-striped table-sm mb-1 display">
        <tbody>
            <tr class="clickable">
                <td></td><td>INFO401</td><td>Algorithmique Avancée</td><td></td><td>4A</td><td>S1</td><td>45</td><td>4</td><td>10</td><td>0</td>
            </tr>
            <tr class="collapse">
                <td colspan="10">
                    <table>
                        <tbody>
                            <tr>
                                <td>INFO401_1</td><td>Algorithmique</td><td>15</td><td>0</td><td>2</td><td>0.4</td><td>0.6</td><td>1</td><td>0</td><td>1</td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>`;
    res.send(layout(html));
});

// Grades (HTML tables)
app.get('/student/noteselem-encours', checkAuth, (req, res) => {
    const headers = ["CodeElem", "AU", "CC", "EX", "TP", "MoySO", "RAT", "MoySR", "Moy", "Dec"];
    const rows = db.currentElems.map(e => [e.code, "2025/2026", e.cc, e.ex, "--", e.moy, "--", "--", e.moy, "Validé"]);
    res.send(layout(tableTemplate(headers, rows)));
});

app.get('/student/notesmod-encours', checkAuth, (req, res) => {
    const headers = ["CodeMod", "AU", "Moy", "Dec"];
    const rows = db.currentMods.map(m => [m.code, "2025/2026", m.moy, m.dec]);
    res.send(layout(tableTemplate(headers, rows)));
});

// Stats (HTML table required by parsers/stats.js)
app.get('/notes-stat/elemevalsat', checkAuth, (req, res) => {
    const code = req.query.code;
    const elem = db.currentElems.find(e => e.code === code);
    const note = elem ? elem.moy : "13,00";

    const html = `
    <div class="stat-container">
        <table>
            <tr><th>Votre note</th><td>${note}</td></tr>
            <tr><th>Moyenne promo</th><td>11,20</td></tr>
            <tr><th>Max</th><td>19,00</td></tr>
            <tr><th>Min</th><td>04,50</td></tr>
            <tr><th>Ecart type</th><td>02,10</td></tr>
            <tr><th>Effectif</th><td>150</td></tr>
            <tr><th>Votre classement</th><td>12</td></tr>
        </table>
    </div>`;
    res.send(layout(html));
});

// Re-use stats logic for other stat endpoints
app.get('/notes-stat/modsat', checkAuth, (req, res) => res.redirect('/notes-stat/elemevalsat'));
app.get('/notes-stat/anneesat', checkAuth, (req, res) => res.redirect('/notes-stat/elemevalsat'));
app.get('/notes-stat/semsat', checkAuth, (req, res) => res.redirect('/notes-stat/elemevalsat'));

// Absences
app.get('/student/absence/bilan', checkAuth, (req, res) => {
    const headers = ["Element", "Date", "Heure", "Justifiée", "Motif"];
    const rows = db.absences.map(a => [a.element, a.date, "08:30", a.justified, "--"]);
    res.send(layout(tableTemplate(headers, rows)));
});

app.get('/student/absence/sanctions', checkAuth, (req, res) => {
    const html = `<div class="stat"><table><tr><th>Sanction</th><td>${db.sanctions.status}</td></tr><tr><th>Effectif</th><td>${db.sanctions.count}</td></tr></table></div>`;
    res.send(layout(html));
});

// Other historical grades
app.get('/student/noteselem', checkAuth, (req, res) => res.redirect('/student/noteselem-encours'));
app.get('/student/notesmod', checkAuth, (req, res) => res.redirect('/student/notesmod-encours'));
app.get('/student/notessem', checkAuth, (req, res) => {
    const headers = ["Semestre", "AU", "Moy_SEM", "Decision", "Statut"];
    const rows = db.semestres.map(s => [s.name, s.au, s.moy, s.dec, "Régulier"]);
    res.send(layout(tableTemplate(headers, rows)));
});
app.get('/student/notesannee', checkAuth, (req, res) => {
    const headers = ["Niveau", "AU", "Moy_Annee", "Decision", "Statut"];
    const rows = db.annees.map(a => [a.name, a.au, a.moy, a.dec, "Régulier"]);
    res.send(layout(tableTemplate(headers, rows)));
});

// Mock Control
app.post('/mock/update-grade', (req, res) => {
    const { code, grade } = req.body;
    const elem = db.currentElems.find(e => e.code === code);
    if (elem) {
        elem.cc = grade; elem.ex = grade; elem.moy = grade;
        saveDB(db); res.json({ success: true });
    } else { res.status(404).json({ error: 'Not found' }); }
});

app.post('/mock/add-element', (req, res) => {
    const { code, name, grade } = req.body;
    db.currentElems.push({ code, name, cc: grade, ex: grade, moy: grade });
    saveDB(db); res.json({ success: true });
});

app.listen(port, '0.0.0.0', () => console.log(`Full HTML Mock Server running at http://0.0.0.0:${port}`));
