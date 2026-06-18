const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = 3000;
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const eventsFile = path.join(dataDir, "events.json");
const knownUsersFile = path.join(dataDir, "known-users.json");

const mimeTypes = {
    ".html":"text/html; charset=utf-8",
    ".css":"text/css; charset=utf-8",
    ".js":"text/javascript; charset=utf-8",
    ".json":"application/json; charset=utf-8"
};

function ensureDataFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    if (!fs.existsSync(eventsFile)) {
        fs.writeFileSync(eventsFile, "[]", "utf8");
    }

    if (!fs.existsSync(knownUsersFile)) {
        fs.writeFileSync(knownUsersFile, "[]", "utf8");
    }
}

function readEvents() {
    ensureDataFile();

    try {
        return JSON.parse(fs.readFileSync(eventsFile, "utf8"));
    } catch {
        return [];
    }
}

function writeEvents(events) {
    ensureDataFile();
    fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2), "utf8");
}

function readKnownUsers() {
    ensureDataFile();

    try {
        return JSON.parse(fs.readFileSync(knownUsersFile, "utf8"));
    } catch {
        return [];
    }
}

function writeKnownUsers(users) {
    ensureDataFile();
    fs.writeFileSync(knownUsersFile, JSON.stringify(users, null, 2), "utf8");
}

function sanitizeKnownUser(payload) {
    const knownPoints = String(payload.knownPoints || "")
        .split("\n")
        .map(point => point.trim())
        .filter(Boolean);

    return {
        id:payload.id || crypto.randomUUID(),
        fullName:String(payload.fullName || "").trim(),
        email:String(payload.email || "").trim(),
        age:String(payload.age || "").trim(),
        sex:String(payload.sex || "").trim(),
        photoFileName:String(payload.photoFileName || "").trim(),
        guideMessage:String(payload.guideMessage || "").trim(),
        knownPoints,
        prefill:{
            favoriteHobby:String(payload.favoriteHobby || "").trim(),
            favoriteGame:String(payload.favoriteGame || "").trim(),
            personalityType:String(payload.personalityType || "").trim(),
            energyType:String(payload.energyType || "").trim()
        }
    };
}

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function safeKnownUser(profile) {
    return {
        id:profile.id,
        displayName:profile.fullName,
        guideMessage:profile.guideMessage,
        knownPoints:Array.isArray(profile.knownPoints) ? profile.knownPoints : [],
        prefill:profile.prefill && typeof profile.prefill === "object" ? profile.prefill : {}
    };
}

function matchKnownUser(input) {
    const users = readKnownUsers();
    const name = normalize(input.fullName);
    const sex = normalize(input.sex);
    const email = normalize(input.email);
    const age = normalize(input.age);
    const photoFileName = normalize(input.photoFileName);

    return users.find(user => {
        const nameMatches = normalize(user.fullName) === name;
        const sexMatches = normalize(user.sex) === sex;
        const extraMatches = [
            normalize(user.email) === email,
            normalize(user.age) === age,
            photoFileName && normalize(user.photoFileName) === photoFileName
        ].filter(Boolean).length;

        return nameMatches && sexMatches && extraMatches >= 1;
    });
}

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        "Content-Type":"application/json; charset=utf-8",
        "Cache-Control":"no-store"
    });
    response.end(JSON.stringify(payload));
}

function getRequestBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", chunk => {
            body += chunk;

            if (body.length > 1_000_000) {
                request.destroy();
                reject(new Error("Request body is too large."));
            }
        });

        request.on("end", () => resolve(body));
        request.on("error", reject);
    });
}

function getClientIp(request) {
    return request.headers["x-forwarded-for"]?.split(",")[0]?.trim()
        || request.socket.remoteAddress
        || "unknown";
}

function sanitizeEvent(payload, request) {
    return {
        id:crypto.randomUUID(),
        type:String(payload.type || "event").slice(0, 60),
        page:String(payload.page || "").slice(0, 120),
        sessionId:String(payload.sessionId || "").slice(0, 120),
        createdAt:new Date().toISOString(),
        userAgent:String(request.headers["user-agent"] || "").slice(0, 300),
        ip:getClientIp(request),
        data:payload.data && typeof payload.data === "object" ? payload.data : {}
    };
}

async function handleApi(request, response) {
    if (request.method === "GET" && request.url === "/api/known-users") {
        sendJson(response, 200, { users:readKnownUsers() });
        return;
    }

    if (request.method === "POST" && request.url === "/api/known-users") {
        try {
            const body = await getRequestBody(request);
            const payload = body ? JSON.parse(body) : {};
            const knownUser = sanitizeKnownUser(payload);

            if (!knownUser.fullName || !knownUser.sex) {
                sendJson(response, 400, { ok:false, error:"Name and sex are required." });
                return;
            }

            const users = readKnownUsers();
            const existingIndex = users.findIndex(user => user.id === knownUser.id);

            if (existingIndex >= 0) {
                users[existingIndex] = knownUser;
            } else {
                users.push(knownUser);
            }

            writeKnownUsers(users);
            sendJson(response, 201, { ok:true, user:knownUser });
        } catch {
            sendJson(response, 400, { ok:false, error:"Invalid known-user payload." });
        }

        return;
    }

    if (request.method === "GET" && request.url === "/api/events") {
        sendJson(response, 200, { events:readEvents().slice().reverse() });
        return;
    }

    if (request.method === "POST" && request.url === "/api/events") {
        try {
            const body = await getRequestBody(request);
            const payload = body ? JSON.parse(body) : {};
            const events = readEvents();
            const savedEvent = sanitizeEvent(payload, request);

            events.push(savedEvent);
            writeEvents(events);
            sendJson(response, 201, { ok:true, event:savedEvent });
        } catch {
            sendJson(response, 400, { ok:false, error:"Invalid event payload." });
        }

        return;
    }

    if (request.method === "POST" && request.url === "/api/match-user") {
        try {
            const body = await getRequestBody(request);
            const payload = body ? JSON.parse(body) : {};
            const match = matchKnownUser(payload);

            sendJson(response, 200, {
                matched:Boolean(match),
                profile:match ? safeKnownUser(match) : null
            });
        } catch {
            sendJson(response, 400, { matched:false, profile:null, error:"Invalid match payload." });
        }

        return;
    }

    sendJson(response, 404, { ok:false, error:"API route not found." });
}

function serveFile(request, response) {
    const cleanUrl = decodeURIComponent(request.url.split("?")[0]);
    const requestedPath = cleanUrl === "/" ? "/Index.html" : cleanUrl;
    const filePath = path.normalize(path.join(rootDir, requestedPath));

    if (!filePath.startsWith(rootDir)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(404, { "Content-Type":"text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }

        response.writeHead(200, {
            "Content-Type":mimeTypes[path.extname(filePath)] || "application/octet-stream"
        });
        response.end(content);
    });
}

ensureDataFile();

http.createServer((request, response) => {
    if (request.url.startsWith("/api/")) {
        handleApi(request, response);
        return;
    }

    serveFile(request, response);
}).listen(port, () => {
    console.log(`PersonaQuest running at http://localhost:${port}`);
    console.log(`Admin dashboard: http://localhost:${port}/admin.html`);
});
