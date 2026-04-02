/* ---------------------------------------------------------
   FIREBASE INIT
--------------------------------------------------------- */

const firebaseConfig = {
  apiKey: "AIzaSyBNph6K-GYkmUJ4T0aPRoOMxOuxItAKXQY",
  authDomain: "the-orange-book.firebaseapp.com",
  projectId: "the-orange-book",
  storageBucket: "the-orange-book.firebasestorage.app",
  messagingSenderId: "938879982056",
  appId: "1:938879982056:web:18adb3f90434b59652ec5d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ---------------------------------------------------------
   SCREEN NAVIGATION
--------------------------------------------------------- */

const homeScreen = document.getElementById("homeScreen");
const interventionScreen = document.getElementById("interventionScreen");
const historyScreen = document.getElementById("historyScreen");
const tutorialScreen = document.getElementById("tutorialScreen");

function show(screen) {
    homeScreen.classList.remove("active");
    interventionScreen.classList.remove("active");
    historyScreen.classList.remove("active");
    tutorialScreen.classList.remove("active");
    screen.classList.add("active");

    if (screen === interventionScreen) {
        document.getElementById("interTech").value = "";
        document.getElementById("interCase").value = "";
        document.getElementById("interDesc").value = "";
        document.getElementById("interParts").value = "";
    }
}

// HOME BUTTONS
document.getElementById("homeButtonTop")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeButtonBottom")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeButtonTopHistory")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeButtonBottomHistory")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeButtonTutorial")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeButtonBottomTutorial")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeBigButton")?.addEventListener("click", () => show(homeScreen));

// OPEN TUTORIAL
document.getElementById("openTutorial").onclick = () => show(tutorialScreen);

/* ---------------------------------------------------------
   SERIAL INPUT RULES (MAJ + ALPHANUMÉRIQUE)
--------------------------------------------------------- */

function enforceSerial(input) {
    if (!input) return;
    input.addEventListener("input", () => {
        let v = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (v.length > 12) v = v.slice(0, 12);
        input.value = v;
    });
}

enforceSerial(document.getElementById("homeSearch"));
enforceSerial(document.getElementById("historySearch"));
enforceSerial(document.getElementById("newSerialInput"));

/* ---------------------------------------------------------
   SMART DROPDOWN FILTER (iOS LIST)
--------------------------------------------------------- */

const dropdown = document.getElementById("serialDropdown");
const suggestions = document.getElementById("searchSuggestions");

document.getElementById("homeSearch").addEventListener("input", () => {
    const query = document.getElementById("homeSearch").value.toUpperCase();

    if (!query) {
        suggestions.style.display = "none";
        return;
    }

    const matches = [];
    for (let i = 0; i < dropdown.options.length; i++) {
        const value = dropdown.options[i].value.toUpperCase();
        if (value.includes(query) && value !== "") {
            matches.push(dropdown.options[i].value);
        }
    }

    if (matches.length === 0) {
        suggestions.style.display = "none";
        return;
    }

    suggestions.innerHTML = matches
        .map(m => `<div class="suggestionItem">${m}</div>`)
        .join("");

    suggestions.style.display = "block";
});

// CLICK ON SUGGESTION
suggestions.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestionItem")) {
        document.getElementById("homeSearch").value = e.target.textContent;
        suggestions.style.display = "none";
    }
});

// CLOSE SUGGESTIONS WHEN CLICKING OUTSIDE
document.addEventListener("click", (e) => {
    if (!e.target.closest("#searchSuggestions") && !e.target.closest("#homeSearch")) {
        suggestions.style.display = "none";
    }
});

/* ---------------------------------------------------------
   SEARCH BUTTON LOGIC
--------------------------------------------------------- */

document.getElementById("searchSerialButton").onclick = () => {
    const serial = document.getElementById("homeSearch").value.trim();

    if (serial.length < 7 || serial.length > 12) {
        alert("Serial or Machine ID must be between 7 and 12 characters.");
        return;
    }

    document.getElementById("searchActions").style.display = "block";
};

/* ---------------------------------------------------------
   GO TO HISTORY
--------------------------------------------------------- */

document.getElementById("goHistory").onclick = () => {
    const serial = document.getElementById("homeSearch").value.trim();
    document.getElementById("historySearch").value = serial;
    show(historyScreen);
};

/* ---------------------------------------------------------
   DROPDOWN SYNC
--------------------------------------------------------- */

dropdown.onchange = () => {
    document.getElementById("homeSearch").value = dropdown.value;
};

/* ---------------------------------------------------------
   LOAD MACHINES FROM FIRESTORE
--------------------------------------------------------- */

async function loadMachines() {
    try {
        const snapshot = await db.collection("machines").get();
        dropdown.innerHTML = `<option value="">-- Select --</option>`;
        snapshot.forEach(doc => {
            const serial = doc.id;
            const opt = document.createElement("option");
            opt.value = serial;
            opt.textContent = serial;
            dropdown.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading machines:", e);
    }
}

loadMachines();

/* ---------------------------------------------------------
   START INTERVENTION (FIRESTORE LOCATION)
--------------------------------------------------------- */

document.getElementById("startIntervention").onclick = async () => {
    const serial = document.getElementById("homeSearch").value.trim().toUpperCase();

    if (serial.length < 7 || serial.length > 12) {
        alert("Please select a valid Serial or Machine ID.");
        return;
    }

    document.getElementById("interSerial").value = serial;

    try {
        const docSnap = await db.collection("machines").doc(serial).get();
        const location = docSnap.exists ? (docSnap.data().location || "") : "";
        document.getElementById("interLocation").value = location;
    } catch (e) {
        console.error("Error loading location:", e);
        document.getElementById("interLocation").value = "";
    }

    show(interventionScreen);
};

/* ---------------------------------------------------------
   SAVE INTERVENTION (HISTORY + LOCATION IN FIRESTORE)
--------------------------------------------------------- */

document.getElementById("saveIntervention").onclick = async () => {
    const entry = {
        location: document.getElementById("interLocation").value,
        serial: document.getElementById("interSerial").value.trim().toUpperCase(),
        date: document.getElementById("interDate").value,
        tech: document.getElementById("interTech").value,
        caseNumber: document.getElementById("interCase").value,
        desc: document.getElementById("interDesc").value,
        parts: document.getElementById("interParts").value,
        timestamp: Date.now()
    };

    if (!entry.serial || entry.serial.length < 7 || entry.serial.length > 12) {
        alert("Invalid Serial or Machine ID.");
        return;
    }

    try {
        await db.collection("history").add(entry);
        await db.collection("machines").doc(entry.serial).set({
            location: entry.location || ""
        }, { merge: true });

        alert("Intervention saved.");
        show(homeScreen);
    } catch (e) {
        console.error("Error saving intervention:", e);
        alert("Error saving intervention.");
    }
};

/* ---------------------------------------------------------
   SEARCH HISTORY (FIRESTORE)
--------------------------------------------------------- */

document.getElementById("searchHistory").onclick = async () => {
    const serial = document.getElementById("historySearch").value.trim().toUpperCase();
    const container = document.getElementById("historyResults");
    container.innerHTML = "";

    if (!serial) {
        container.innerHTML = "<p>No intervention found.</p>";
        return;
    }

    try {
        const snapshot = await db.collection("history")
            .where("serial", "==", serial)
            .orderBy("timestamp", "desc")
            .get();

        if (snapshot.empty) {
            container.innerHTML = "<p>No intervention found.</p>";
            return;
        }

        const items = [];
        snapshot.forEach(doc => {
            const h = doc.data();
            items.push(`
                <div class="historyItem">
                    <strong>${h.date || ""}</strong> — ${h.tech || ""}<br>
                    <strong>Case:</strong> ${h.caseNumber || "N/A"}<br>
                    <strong>Location:</strong> ${h.location || "N/A"}<br>
                    ${h.desc || ""}<br>
                    <em>${h.parts || ""}</em>
                </div>
            `);
        });

        container.innerHTML = items.join("");
    } catch (e) {
        console.error("Error loading history:", e);
        container.innerHTML = "<p>Error loading history.</p>";
    }
};

/* ---------------------------------------------------------
   EXPORT PDF (GARDÉ COMME TA VERSION ORIGINALE)
--------------------------------------------------------- */

document.getElementById("exportPdf").onclick = () => {
    const serial = document.getElementById("historySearch").value.trim().toUpperCase();
    const html = document.getElementById("historyResults").innerHTML;

    if (!serial || !html) {
        alert("Nothing to export.");
        return;
    }

    const today = new Date().toLocaleDateString("en-CA");

    const win = window.open("", "_blank");

    win.document.write(`
        <html>
        <head>
            <title>Machine History - ${serial}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    padding: 30px;
                    line-height: 1.6;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 48px;
                }
                h1 {
                    margin: 10px 0 0 0;
                    font-size: 28px;
                }
                .meta {
                    margin-top: 10px;
                    font-size: 16px;
                    color: #555;
                }
                .historyItem {
                    padding: 12px;
                    border-bottom: 1px solid #ddd;
                    margin-bottom: 12px;
                }
                strong {
                    font-size: 18px;
                }
            </style>
        </head>

        <body>

            <div class="header">
                <div class="logo">🍊</div>
                <h1>Machine History</h1>
                <div class="meta">
                    <strong>Serial or Machine ID:</strong> ${serial}<br>
                    <strong>Date:</strong> ${today}
                </div>
            </div>

            <h2>Interventions</h2>

            ${html}

        </body>
        </html>
    `);

    win.document.close();
    win.print();
};

/* ---------------------------------------------------------
   BOTTOM SHEET LOGIC (IDENTIQUE)
--------------------------------------------------------- */

const addSheet = document.getElementById("addSerialSheet");
const overlay = document.getElementById("overlayAddSerial");
const newSerialInput = document.getElementById("newSerialInput");

document.getElementById("addSerialButton").onclick = () => {
    addSheet.classList.add("open");
    overlay.style.display = "block";
    newSerialInput.value = "";
    newSerialInput.focus();
};

overlay.onclick = () => {
    addSheet.classList.remove("open");
    overlay.style.display = "none";
};

/* ---------------------------------------------------------
   ADD MACHINE WITH DUPLICATE CHECK (FIRESTORE + DROPDOWN)
--------------------------------------------------------- */

document.getElementById("confirmAddSerial").onclick = async () => {
    const serial = newSerialInput.value.trim().toUpperCase();

    if (serial.length < 7 || serial.length > 12) {
        alert("Serial or Machine ID must be between 7 and 12 characters.");
        return;
    }

    try {
        const docSnap = await db.collection("machines").doc(serial).get();
        if (docSnap.exists) {
            alert("This Serial or Machine ID already exists.");
            return;
        }

        await db.collection("machines").doc(serial).set({ location: "" });

        const option = document.createElement("option");
        option.value = serial;
        option.textContent = serial;
        dropdown.appendChild(option);

        alert("Machine added!");

        addSheet.classList.remove("open");
        overlay.style.display = "none";
    } catch (e) {
        console.error("Error adding machine:", e);
        alert("Error adding machine.");
    }
};

/* ---------------------------------------------------------
   SECRET ADMIN: 30 TAPS ON HOME BIG BUTTON
--------------------------------------------------------- */

let tapCount = 0;
let tapTimer = null;
const homeBigButton = document.getElementById("homeBigButton");
const importPanel = document.getElementById("importPanel");
const csvInput = document.getElementById("csvInput");
const importCsvBtn = document.getElementById("importCsvBtn");

if (homeBigButton) {
    homeBigButton.addEventListener("click", () => {
        tapCount++;

        if (tapTimer) clearTimeout(tapTimer);
        tapTimer = setTimeout(() => {
            tapCount = 0;
        }, 4000);

        if (tapCount >= 30) {
            tapCount = 0;
            if (importPanel) {
                importPanel.style.display = importPanel.style.display === "none" || importPanel.style.display === "" ? "block" : "none";
            }
        }
    });
}

/* ---------------------------------------------------------
   IMPORT CSV (ADMIN)
--------------------------------------------------------- */

if (importCsvBtn) {
    importCsvBtn.addEventListener("click", async () => {
        if (!csvInput || !csvInput.files || !csvInput.files.length) {
            alert("Please select a CSV file.");
            return;
        }

        const file = csvInput.files[0];
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

        let added = 0;

        for (const raw of lines) {
            let serial = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (serial.length < 7 || serial.length > 12) continue;

            try {
                const docSnap = await db.collection("machines").doc(serial).get();
                if (!docSnap.exists) {
                    await db.collection("machines").doc(serial).set({ location: "" });
                    added++;

                    const option = document.createElement("option");
                    option.value = serial;
                    option.textContent = serial;
                    dropdown.appendChild(option);
                }
            } catch (e) {
                console.error("Error importing serial:", serial, e);
            }
        }

        alert(`Import complete. ${added} machines added.`);
    });
}

/* ---------------------------------------------------------
   DELETE MACHINE (ADMIN)
--------------------------------------------------------- */

const deleteSerialInput = document.getElementById("deleteSerialInput");
const deleteSerialBtn = document.getElementById("deleteSerialBtn");

if (deleteSerialBtn) {
    deleteSerialBtn.addEventListener("click", async () => {
        const serial = deleteSerialInput.value.trim().toUpperCase();

        if (!serial) {
            alert("Please enter a Serial or Machine ID.");
            return;
        }

        if (!confirm(`Delete machine "${serial}"? This cannot be undone.`)) {
            return;
        }

        try {
            await db.collection("machines").doc(serial).delete();

            // Remove from dropdown
            for (let i = 0; i < dropdown.options.length; i++) {
                if (dropdown.options[i].value === serial) {
                    dropdown.remove(i);
                    break;
                }
            }

            alert(`Machine "${serial}" deleted.`);
            deleteSerialInput.value = "";

        } catch (e) {
            console.error("Error deleting machine:", e);
            alert("Error deleting machine.");
        }
    });
}
/* ---------------------------------------------------------
   SIMPLE PIN LOCK
--------------------------------------------------------- */

const CORRECT_PIN = "2015";  // 🔥 Change ton PIN ici

const lockScreen = document.getElementById("lockScreen");
const pinInput = document.getElementById("pinInput");
const pinBtn = document.getElementById("pinBtn");
const pinError = document.getElementById("pinError");

if (pinBtn) {
    pinBtn.addEventListener("click", () => {
        const entered = pinInput.value.trim();

        if (entered === CORRECT_PIN) {
            lockScreen.style.display = "none";   // 🔓 Déverrouille l’app
        } else {
            pinError.style.display = "block";    // ❌ Mauvais PIN
            pinInput.value = "";
        }
    });
}

