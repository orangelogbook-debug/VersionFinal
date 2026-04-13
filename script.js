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
   PIN LOCK SYSTEM
--------------------------------------------------------- */

const CORRECT_PIN = "2015";

const pinInput = document.getElementById("pinInput");
const pinBtn = document.getElementById("pinBtn");
const pinError = document.getElementById("pinError");

pinBtn.addEventListener("click", () => {
    const entered = pinInput.value.trim();

    if (entered === CORRECT_PIN) {
        pinError.style.display = "none";
        lockScreen.classList.remove("active");  // cache le login
        show(homeScreen);                       // 🔥 va à l'accueil
    } else {
        pinError.style.display = "block";
        pinInput.value = "";
    }
});


/* ---------------------------------------------------------
   GLOBAL VARIABLES
--------------------------------------------------------- */
let editingId = null;
let currentFilter = "";
let originalTimestamp = null;

/* ---------------------------------------------------------
   SCREEN NAVIGATION (FIXED)
--------------------------------------------------------- */

function show(screen) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    screen.classList.add("active");
}

const homeScreen = document.getElementById("homeScreen");
const interventionScreen = document.getElementById("interventionScreen");
const historyScreen = document.getElementById("historyScreen");
const tutorialScreen = document.getElementById("tutorialScreen");

// HOME BUTTONS
document.getElementById("homeButtonTop")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeButtonBottom")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeButtonTutorial")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeButtonBottomTutorial")?.addEventListener("click", () => show(homeScreen));
document.getElementById("homeBigButton")?.addEventListener("click", () => show(homeScreen));
document.getElementById("goHomeFromHistory")?.addEventListener("click", () => show(homeScreen));

// OPEN TUTORIAL
document.getElementById("openTutorial").onclick = () => show(tutorialScreen);

/* ---------------------------------------------------------
   SERIAL INPUT RULES
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
enforceSerial(document.getElementById("newSerialInput"));

/* ---------------------------------------------------------
   SMART DROPDOWN FILTER
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

// CLOSE SUGGESTIONS
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
    const serial = document.getElementById("homeSearch").value.trim().toUpperCase();

    if (!serial) {
        alert("Please enter a Serial or Machine ID first.");
        return;
    }

    document.getElementById("historySerialTitle").textContent = " — " + serial;

    show(historyScreen);

    loadHistory();
};

/* ---------------------------------------------------------
   DROPDOWN SYNC
--------------------------------------------------------- */

dropdown.onchange = () => {
    document.getElementById("homeSearch").value = dropdown.value;
};

/* ---------------------------------------------------------
   LOAD MACHINES
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
   START INTERVENTION
--------------------------------------------------------- */

document.getElementById("startIntervention").onclick = async () => {
    const serial = document.getElementById("homeSearch").value.trim().toUpperCase();

    if (serial.length < 7 || serial.length > 12) {
        alert("Please select a valid Serial or Machine ID.");
        return;
    }

    editingId = null;

    document.getElementById("interDate").value = "";
    document.getElementById("interTech").value = "";
    document.getElementById("interCase").value = "";
    document.getElementById("interDesc").value = "";
    document.getElementById("interParts").value = "";

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
   SAVE INTERVENTION
--------------------------------------------------------- */

document.getElementById("saveIntervention").onclick = async () => {
    const entry = {
        location: document.getElementById("interLocation").value,
        serial: document.getElementById("interSerial").value.trim().toUpperCase(),
        date: document.getElementById("interDate").value,
        tech: document.getElementById("interTech").value,
        caseNumber: document.getElementById("interCase").value,
        desc: document.getElementById("interDesc").value,
        parts: document.getElementById("interParts").value
    };

    if (!entry.serial || entry.serial.length < 7 || entry.serial.length > 12) {
        alert("Invalid Serial or Machine ID.");
        return;
    }

    if (!entry.date) {
        alert("Please enter a date.");
        return;
    }

    const parsedDate = new Date(entry.date);
    if (isNaN(parsedDate.getTime())) {
        alert("Invalid date format.");
        return;
    }

    try {
        if (editingId) {
            entry.timestamp = (originalTimestamp != null)
                ? originalTimestamp
                : parsedDate.getTime();

            await db.collection("history").doc(editingId).update(entry);

            editingId = null;
            originalTimestamp = null;

        } else {
            entry.timestamp = parsedDate.getTime();
            await db.collection("history").add(entry);
        }

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
   HIGHLIGHT FUNCTION
--------------------------------------------------------- */

function highlight(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, `<span style="background:yellow;">$1</span>`);
}

/* ---------------------------------------------------------
   HISTORY — FIRESTORE LIVE + FILTER
--------------------------------------------------------- */

function loadHistory() {
    const container = document.getElementById("historyResults");

    const serial = document
        .getElementById("historySerialTitle")
        .textContent.replace(" — ", "")
        .trim()
        .toUpperCase();

    if (!serial) {
        container.innerHTML = "<p>No machine selected.</p>";
        document.getElementById("historyCount").textContent = "0 interventions found";
        return;
    }

    db.collection("history")
        .where("serial", "==", serial)
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {

            if (snapshot.metadata.hasPendingWrites) return;

            document.getElementById("historyCount").textContent =
                snapshot.size + " interventions found";

            if (snapshot.empty) {
                container.innerHTML = "<p>No intervention found.</p>";
                return;
            }

            const timestamps = [];
            snapshot.forEach(doc => {
                const h = doc.data();
                if (h.timestamp) timestamps.push(h.timestamp);
            });

            let warningHtml = "";

            if (timestamps.length >= 2) {
                const newest = timestamps[0];
                const secondNewest = timestamps[1];
                const diff = newest - secondNewest;
                const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

                if (diff <= THIRTY_DAYS) {
                    warningHtml = `
                        <div class="attentionWarning">
                            ⚠️ Machine needs attention — Two or more interventions in the last 30 days
                        </div>
                    `;
                }
            }

            const items = [];
            snapshot.forEach(doc => {
                const h = doc.data();

                items.push(`
                    <div class="historyItem" data-id="${doc.id}">
                        <span class="undoIcon">↺</span>
                        <span class="deleteIcon">🗑️</span>

                        <strong data-raw="${h.date || ""}">
                            ${highlight(h.date || "", currentFilter)}
                        </strong> — 
                        <span data-raw="${h.tech || ""}">
                            ${highlight(h.tech || "", currentFilter)}
                        </span><br>

                        <strong>Case:</strong>
                        <span data-raw="${h.caseNumber || "N/A"}">
                            ${highlight(h.caseNumber || "N/A", currentFilter)}
                        </span><br>

                        <strong>Location:</strong>
                        <span data-raw="${h.location || "N/A"}">
                            ${highlight(h.location || "N/A", currentFilter)}
                        </span><br>

                        <div class="descField" data-raw="${h.desc || ""}">
                            ${highlight(h.desc || "", currentFilter)}
                        </div>

                        <em data-raw="${h.parts || ""}">
                            ${highlight(h.parts || "", currentFilter)}
                        </em>
                    </div>
                `);
            });

            container.innerHTML = warningHtml + items.join("");

            /* DELETE */
            document.querySelectorAll(".deleteIcon").forEach(icon => {
                icon.addEventListener("click", async (e) => {
                    const parent = e.target.closest(".historyItem");
                    const docId = parent.getAttribute("data-id");

                    if (!docId) return;
                    if (!confirm("Do you really want to delete this intervention?\n\nThis action cannot be undone.")) return;

                    try {
                        await db.collection("history").doc(docId).delete();
                        alert("Intervention deleted.");
                    } catch (err) {
                        alert("Error deleting intervention.");
                        console.error(err);
                    }
                });
            });

            /* UNDO */
            document.querySelectorAll(".undoIcon").forEach(icon => {
                icon.addEventListener("click", async (e) => {
                    const parent = e.target.closest(".historyItem");
                    const docId = parent.getAttribute("data-id");

                    if (!docId) return;

                    try {
                        const docSnap = await db.collection("history").doc(docId).get();
                        if (!docSnap.exists) return;

                        const h = docSnap.data();

                        editingId = docId;
                        originalTimestamp = h.timestamp;

                        document.getElementById("interLocation").value = h.location || "";
                        document.getElementById("interSerial").value = h.serial || "";
                        document.getElementById("interDate").value = h.date || "";
                        document.getElementById("interTech").value = h.tech || "";
                        document.getElementById("interCase").value = h.caseNumber || "";
                        document.getElementById("interDesc").value = h.desc || "";
                        document.getElementById("interParts").value = h.parts || "";

                        show(interventionScreen);
                        window.scrollTo({ top: 0, behavior: "smooth" });

                        alert("Intervention loaded for editing.");

                    } catch (err) {
                        console.error("Undo error:", err);
                    }
                });
            });

        });
}

/* ---------------------------------------------------------
   FILTER INPUT
--------------------------------------------------------- */

document.getElementById("historyFilter").addEventListener("input", () => {
    currentFilter = document.getElementById("historyFilter").value.toLowerCase();

    document.querySelectorAll(".historyItem").forEach(item => {
        const rawText = item.innerText.toLowerCase();
        const match = rawText.includes(currentFilter);

        item.style.display = match ? "block" : "none";

        item.querySelectorAll("[data-raw]").forEach(el => {
            el.innerHTML = highlight(el.dataset.raw, currentFilter);
        });
    });
});

/* ---------------------------------------------------------
   EXPORT PDF
--------------------------------------------------------- */

document.getElementById("exportHistory").onclick = async () => {
    const serial = document.getElementById("historySerialTitle")
        .textContent.replace(" — ", "")
        .trim()
        .toUpperCase();

    if (!serial) {
        alert("Nothing to export.");
        return;
    }

    const snapshot = await db.collection("history")
        .where("serial", "==", serial)
        .orderBy("timestamp", "desc")
        .get();

    if (snapshot.empty) {
        alert("No interventions to export.");
        return;
    }

    let interventionsHtml = "";

    snapshot.forEach(doc => {
        const h = doc.data();

        interventionsHtml += `
            <div style="margin-bottom:20px;">
                <strong>${h.date || "N/A"} — ${h.tech || "N/A"}</strong><br>
                <strong>Case:</strong> ${h.caseNumber || "N/A"}<br>
                <strong>Location:</strong> ${h.location || "N/A"}<br>
                <div>${h.desc || ""}</div>
                <em>${h.parts || ""}</em>
            </div>
        `;
    });

    const today = new Date().toLocaleDateString("en-CA");

    const pdfWindow = window.open("", "_blank");

    pdfWindow.document.write(`
        <html>
        <head>
            <title>Machine History - ${serial}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }
                h1 {
                    margin-bottom: 5px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .footer {
                    margin-top: 40px;
                    font-size: 12px;
                    text-align: center;
                    color: #555;
                }
            </style>
        </head>
        <body>

            <div class="header">
                <div style="font-size:40px;">🍊</div>
                <h1>Machine History</h1>
                <p><strong>Serial or Machine ID:</strong> ${serial}</p>
                <p><strong>Date:</strong> ${today}</p>
                <h2>Interventions</h2>
            </div>

            ${interventionsHtml}

            <div class="footer">
                Page 1 sur 1 — ${today}
            </div>


        </body>
        </html>
    `);

    pdfWindow.document.close();
    pdfWindow.print();
};

/* ---------------------------------------------------------
   BOTTOM SHEET LOGIC
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
   ADD MACHINE
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
   SECRET ADMIN: 30 TAPS
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
            document.body.classList.add("admin-mode");

            if (importPanel) {
                importPanel.style.display =
                    importPanel.style.display === "none" || importPanel.style.display === ""
                        ? "block"
                        : "none";
            }
        }
    });
}

/* ---------------------------------------------------------
   IMPORT CSV
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
   DELETE MACHINE
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
   MODIFY SERIAL / MACHINE ID
--------------------------------------------------------- */

async function updateSerial(oldSerial, newSerial) {
    if (!oldSerial || !newSerial) {
        alert("Both fields are required.");
        return;
    }

    if (oldSerial === newSerial) {
        alert("The new serial must be different from the old one.");
        return;
    }

    const machinesRef = db.collection("machines");
    const historyRef = db.collection("history");

    try {
        const oldDoc = await machinesRef.doc(oldSerial).get();
        if (!oldDoc.exists) {
            alert("Old serial not found.");
            return;
        }

        const newDoc = await machinesRef.doc(newSerial).get();
        if (newDoc.exists) {
            alert("The new serial already exists. Choose another.");
            return;
        }

        await machinesRef.doc(newSerial).set(oldDoc.data());
        await machinesRef.doc(oldSerial).delete();

        const snap = await historyRef.where("serial", "==", oldSerial).get();
        const batch = db.batch();

        snap.forEach(doc => {
            batch.update(doc.ref, { serial: newSerial });
        });

        await batch.commit();

        alert("Serial updated successfully!");

        for (let i = 0; i < dropdown.options.length; i++) {
            if (dropdown.options[i].value === oldSerial) {
                dropdown.options[i].value = newSerial;
                dropdown.options[i].textContent = newSerial;
                break;
            }
        }

        document.getElementById("oldSerialInput").value = "";
        document.getElementById("newSerialInput2").value = "";

    } catch (err) {
        console.error("Error updating serial:", err);
        alert("Error updating serial.");
    }
}

document.getElementById("updateSerialBtn").addEventListener("click", () => {
    const oldS = document.getElementById("oldSerialInput").value.trim().toUpperCase();
    const newS = document.getElementById("newSerialInput2").value.trim().toUpperCase();
    updateSerial(oldS, newS);
});

