/* ================================= */
/* SETTINGS */
/* ================================= */

let saveHistory = true;


/* ================================= */
/* NAVIGATION */
/* ================================= */

function showSection(sectionName) {

    const sections = document.querySelectorAll(".page-section");

    sections.forEach(section => {
        section.classList.remove("active-section");
    });


    const selectedSection =
        document.getElementById(sectionName);

    if (selectedSection) {
        selectedSection.classList.add("active-section");
    }


    const buttons =
        document.querySelectorAll(".nav-btn");

    buttons.forEach(button => {
        button.classList.remove("active");
    });


    buttons.forEach(button => {

        if (
            button.innerText
                .toLowerCase()
                .includes(sectionName)
        ) {
            button.classList.add("active");
        }

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    if (sectionName === "history") {
        loadHistory();
    }

    if (sectionName === "profile") {
        loadProfile();
    }

    if (sectionName === "dashboard") {
        updateDashboard();
    }

}


/* ================================= */
/* EXAMPLE URL */
/* ================================= */

function useExample(url) {

    document.getElementById("urlInput").value = url;

    document.getElementById("urlInput").focus();

}


/* ================================= */
/* URL SCANNER */
/* ================================= */

async function checkURL() {

    // Prime audio context on user interaction
    getOrCreateAudioContext();

    const input =
        document.getElementById("urlInput");

    const result =
        document.getElementById("result");

    const button =
        document.getElementById("scanButton");


    const url = input.value.trim();


    /* Empty input */

    if (url === "") {

        result.innerHTML = `

            <div class="result-card error-card">

                <div class="result-card-header">

                    <div class="result-icon">
                        ⚠️
                    </div>

                    <button class="result-close-btn" onclick="clearResult()" title="Close result">
                        ✕
                    </button>

                </div>

                <h2>
                    Please Enter a URL
                </h2>

                <p class="result-message">
                    Enter a website URL to start the security scan.
                </p>

            </div>

        `;

        return;

    }


    /* Basic URL validation */

    if (
        !url.includes(".") ||
        url.length < 4
    ) {

        result.innerHTML = `

            <div class="result-card error-card">

                <div class="result-card-header">

                    <div class="result-icon">
                        ⚠️
                    </div>

                    <button class="result-close-btn" onclick="clearResult()" title="Close result">
                        ✕
                    </button>

                </div>

                <h2>
                    Invalid URL
                </h2>

                <p class="result-message">
                    Please enter a valid website URL.
                    Example: https://example.com
                </p>

            </div>

        `;

        return;

    }


    /* Check if URL is already in Blacklist */
    if (isURLBlocked(url)) {

        playThreatAlert();

        result.innerHTML = `

            <div class="result-card phishing-card">

                <div class="result-card-header">

                    <div class="result-icon" style="background: #991b1b;">
                        ⛔
                    </div>

                    <button class="result-close-btn" onclick="clearResult()" title="Close result">
                        ✕
                    </button>

                </div>

                <div id="blockedStatusBanner" class="blocked-warning-banner">
                    ⛔ ACCESS BLOCKED: THIS URL IS ON YOUR SECURITY BLACKLIST
                </div>

                <h2>
                    Blocked Threat URL
                </h2>

                <p class="result-message">
                    Access to this URL has been blocked by your security settings to protect against phishing and credential theft.
                </p>

                <div class="confidence-header">
                    <span>Blacklist Status</span>
                    <strong>100% BLOCKED</strong>
                </div>

                <div class="confidence-bar">
                    <div class="confidence-fill phishing-fill" style="width: 100%;"></div>
                </div>

                <div class="threat-level high-threat">
                    <span>Threat Level</span>
                    <strong>🔴 BLOCKED MALICIOUS SITE</strong>
                </div>

                <div class="scanned-url" style="margin-top: 18px;">
                    <span>Scanned URL</span>
                    <p>${escapeHTML(url)}</p>
                </div>

                <div class="report-actions">

                    <button
                        id="blockThreatBtn"
                        class="block-threat-button blocked-state"
                        onclick="toggleBlockURL('${encodeURIComponent(url)}')"
                        title="Remove from Blacklist"
                    >
                        ⛔ URL is Blocked (Click to Unblock)
                    </button>

                    <button
                        class="export-report-button"
                        onclick="exportScanReport()"
                    >
                        📄 Export Scan Report
                    </button>

                    <button
                        class="dismiss-result-button"
                        onclick="clearResult()"
                    >
                        ✕ Close Result
                    </button>

                </div>

            </div>

        `;

        return;

    }


    /* Loading */

    button.disabled = true;

    button.innerHTML =
        "⏳ Scanning...";


    result.innerHTML = `

        <div class="result-card loading-card">

            <div class="spinner"></div>

            <h2>
                Analyzing URL...
            </h2>

            <p class="result-message">
                AI is checking the URL for suspicious patterns.
            </p>

        </div>

    `;


    try {

        const response =
            await fetch(
                "http://127.0.0.1:8000/predict",
                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        url: url
                    })

                }
            );


        if (!response.ok) {
            throw new Error("Server error");
        }


        const data =
            await response.json();


        const analysis =
            data.security_analysis;


        /* ============================= */
        /* ANALYSIS STATUS */
        /* ============================= */

        const httpsStatus =
            analysis.https === "Detected"
                ? "✓ Detected"
                : "✕ Not Detected";


        const ipStatus =
            analysis.ip_address === "Detected"
                ? "✕ Detected"
                : "✓ Not Detected";


        const keywordStatus =
            analysis.suspicious_keywords === "Detected"
                ? "✕ Detected"
                : "✓ Not Detected";


        const obfuscationStatus =
            analysis.obfuscation === "Detected"
                ? "✕ Detected"
                : "✓ Not Detected";


        /* ============================= */
        /* PHISHING */
        /* ============================= */

        if (data.prediction === "Phishing") {

            playThreatAlert();

            const isBlocked = isURLBlocked(data.url);
            const blockBtnText = isBlocked ? "⛔ URL is Blocked (Click to Unblock)" : "🚫 Block Phishing URL";
            const blockBtnClass = isBlocked ? "block-threat-button blocked-state" : "block-threat-button";

            result.innerHTML = `

                <div class="result-card phishing-card">

                    <div class="result-card-header">

                        <div class="result-icon">
                            ⚠️
                        </div>

                        <button class="result-close-btn" onclick="clearResult()" title="Close result">
                            ✕
                        </button>

                    </div>

                    ${isBlocked ? '<div id="blockedStatusBanner" class="blocked-warning-banner">⛔ THIS DOMAIN IS IN YOUR BLOCKED BLACKLIST</div>' : ''}

                    <h2>
                        Phishing URL Detected!
                    </h2>

                    <p class="result-message">
                        This URL appears suspicious and may be unsafe.
                    </p>


                    <div class="confidence-header">

                        <span>
                            AI Confidence
                        </span>

                        <strong>
                            ${data.confidence}%
                        </strong>

                    </div>


                    <div class="confidence-bar">

                        <div
                            class="confidence-fill phishing-fill"
                            style="width:${data.confidence}%"
                        ></div>

                    </div>


                    <div class="threat-level high-threat">

                        <span>
                            Threat Level
                        </span>

                        <strong>
                            🔴 HIGH
                        </strong>

                    </div>


                    <div class="security-analysis">

                        <h3>
                            🔍 Security Analysis
                        </h3>


                        <div class="analysis-row">

                            <span>
                                HTTPS
                            </span>

                            <strong>
                                ${httpsStatus}
                            </strong>

                        </div>


                        <div class="analysis-row">

                            <span>
                                IP Address
                            </span>

                            <strong>
                                ${ipStatus}
                            </strong>

                        </div>


                        <div class="analysis-row">

                            <span>
                                Suspicious Keywords
                            </span>

                            <strong>
                                ${keywordStatus}
                            </strong>

                        </div>


                        <div class="analysis-row">

                            <span>
                                Obfuscation
                            </span>

                            <strong>
                                ${obfuscationStatus}
                            </strong>

                        </div>


                        <div class="analysis-row">

                            <span>
                                URL Length
                            </span>

                            <strong>
                                ${analysis.url_length}
                                characters
                            </strong>

                        </div>

                    </div>


                    <div class="scanned-url">

                        <span>
                            Scanned URL
                        </span>

                        <p>
                            ${escapeHTML(data.url)}
                        </p>

                    </div>

                    <div class="report-actions">

                        <button
                            id="blockThreatBtn"
                            class="${blockBtnClass}"
                            onclick="toggleBlockURL('${encodeURIComponent(data.url)}')"
                            title="${isBlocked ? 'Remove from Blacklist' : 'Add URL to Blacklist'}"
                        >
                            ${blockBtnText}
                        </button>

                        <button
                            class="export-report-button"
                            onclick="exportScanReport()"
                        >
                            📄 Export Scan Report
                        </button>

                        <button
                            class="dismiss-result-button"
                            onclick="clearResult()"
                        >
                            ✕ Close Result
                        </button>

                    </div>

                </div>

            `;

        }


        /* ============================= */
        /* LEGITIMATE */
        /* ============================= */

        else {

            result.innerHTML = `

                <div class="result-card legitimate-card">

                    <div class="result-card-header">

                        <div class="result-icon">
                            ✓
                        </div>

                        <button class="result-close-btn" onclick="clearResult()" title="Close result">
                            ✕
                        </button>

                    </div>

                    <h2>
                        URL is Legitimate
                    </h2>

                    <p class="result-message">
                        This URL appears safe based on the AI model analysis.
                    </p>


                    <div class="confidence-header">

                        <span>
                            AI Confidence
                        </span>

                        <strong>
                            ${data.confidence}%
                        </strong>

                    </div>


                    <div class="confidence-bar">

                        <div
                            class="confidence-fill legitimate-fill"
                            style="width:${data.confidence}%"
                        ></div>

                    </div>


                    <div class="threat-level low-threat">

                        <span>
                            Threat Level
                        </span>

                        <strong>
                            🟢 LOW
                        </strong>

                    </div>


                    <div class="security-analysis">

                        <h3>
                            🔍 Security Analysis
                        </h3>


                        <div class="analysis-row">

                            <span>
                                HTTPS
                            </span>

                            <strong>
                                ${httpsStatus}
                            </strong>

                        </div>


                        <div class="analysis-row">

                            <span>
                                IP Address
                            </span>

                            <strong>
                                ${ipStatus}
                            </strong>

                        </div>


                        <div class="analysis-row">

                            <span>
                                Suspicious Keywords
                            </span>

                            <strong>
                                ${keywordStatus}
                            </strong>

                        </div>


                        <div class="analysis-row">

                            <span>
                                Obfuscation
                            </span>

                            <strong>
                                ${obfuscationStatus}
                            </strong>

                        </div>


                        <div class="analysis-row">

                            <span>
                                URL Length
                            </span>

                            <strong>
                                ${analysis.url_length}
                                characters
                            </strong>

                        </div>

                    </div>


                    <div class="scanned-url">

                        <span>
                            Scanned URL
                        </span>

                        <p>
                            ${escapeHTML(data.url)}
                        </p>

                    </div>

                    <div class="report-actions">

                        <button
                            class="export-report-button"
                            onclick="exportScanReport()"
                        >
                            📄 Export Scan Report
                        </button>

                        <button
                            class="dismiss-result-button"
                            onclick="clearResult()"
                        >
                            ✕ Close Result
                        </button>

                    </div>

                </div>

            `;

        }


        /* Save scan */

if (saveHistory) {

    saveScan({
        url: data.url,
        prediction: data.prediction,
        confidence: data.confidence,
        time: new Date().toLocaleString()
    });

}


/* Clear URL input after successful scan */

input.value = "";

updateStatistics();

loadRecentScans();

updateDashboard();

loadProfile();
    }


    catch (error) {

        result.innerHTML = `

            <div class="result-card error-card">

                <div class="result-card-header">

                    <div class="result-icon">
                        ❌
                    </div>

                    <button class="result-close-btn" onclick="clearResult()" title="Close result">
                        ✕
                    </button>

                </div>

                <h2>
                    Connection Error
                </h2>

                <p class="result-message">
                    Unable to connect to the FastAPI server.
                    Make sure the server is running.
                </p>

            </div>

        `;

        console.error(error);

    }


    finally {

        button.disabled = false;

        button.innerHTML =
            "🔍 Scan URL";

    }

}


/* ================================= */
/* CLEAR RESULT */
/* ================================= */

function clearResult() {

    const result =
        document.getElementById("result");

    if (result) {
        result.innerHTML = "";
    }

    const input =
        document.getElementById("urlInput");

    if (input) {
        input.value = "";
        input.focus();
    }

}


/* ================================= */
/* HISTORY */
/* ================================= */

function getHistory() {

    return JSON.parse(
        localStorage.getItem("urlScanHistory") || "[]"
    );

}


function saveScan(scan) {

    let history = getHistory();

    history.unshift(scan);

    /* Keep latest 50 scans */

    history = history.slice(0, 50);

    localStorage.setItem(
        "urlScanHistory",
        JSON.stringify(history)
    );

}


function loadRecentScans() {

    const container =
        document.getElementById("recentScans");

    const history =
        getHistory().slice(0, 5);


    if (history.length === 0) {

        container.innerHTML = `

            <div class="empty-history">

                🔍

                <p>
                    No scans yet
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        history.map(scan => `

            <div class="scan-item">

                <div class="scan-url">

                    ${escapeHTML(scan.url)}

                </div>

                <div class="scan-result
                    ${scan.prediction === "Phishing"
                        ? "threat-result"
                        : "safe-result"}">

                    ${scan.prediction === "Phishing"
                        ? "🔴 Phishing"
                        : "🟢 Legitimate"}

                    • ${scan.confidence}%

                </div>

            </div>

        `).join("");

}


function loadHistory() {

    const container =
        document.getElementById("historyList");

    const history =
        getHistory();


    if (history.length === 0) {

        container.innerHTML = `

            <div class="empty-history large-empty">

                📜

                <h3>
                    No Scan History
                </h3>

                <p>
                    URLs that you scan will appear here.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        history.map(scan => `

            <div class="history-item">

                <div>

                    <div class="history-url">

                        ${escapeHTML(scan.url)}

                    </div>

                    <div class="history-time">

                        ${scan.time}

                    </div>

                </div>


                <div class="history-badge
                    ${scan.prediction === "Phishing"
                        ? "threat-result"
                        : "safe-result"}">

                    ${scan.prediction === "Phishing"
                        ? "🔴 Phishing"
                        : "🟢 Legitimate"}

                    <br>

                    ${scan.confidence}%

                </div>

            </div>

        `).join("");

}


function clearHistory() {

    const history =
        getHistory();


    if (history.length === 0) {
        return;
    }


    const confirmClear =
        confirm(
            "Are you sure you want to clear all scan history?"
        );


    if (!confirmClear) {
        return;
    }


    localStorage.removeItem(
        "urlScanHistory"
    );


    loadRecentScans();

    loadHistory();

    updateStatistics();

    updateDashboard();

    loadProfile();

}


/* ================================= */
/* STATISTICS */
/* ================================= */

function updateStatistics() {

    const history =
        getHistory();


    const total =
        history.length;


    const safe =
        history.filter(
            item => item.prediction === "Legitimate"
        ).length;


    const threats =
        history.filter(
            item => item.prediction === "Phishing"
        ).length;


    document.getElementById(
        "totalScans"
    ).innerText = total;


    document.getElementById(
        "safeScans"
    ).innerText = safe;


    document.getElementById(
        "threatScans"
    ).innerText = threats;

}


/* ================================= */
/* DASHBOARD */
/* ================================= */

function updateDashboard() {

    const history = getHistory();

    const total = history.length;

    const safe = history.filter(
        item => item.prediction === "Legitimate"
    ).length;

    const threats = history.filter(
        item => item.prediction === "Phishing"
    ).length;


    const threatRate =
        total > 0
            ? Math.round((threats / total) * 100)
            : 0;


    const safePercentage =
        total > 0
            ? Math.round((safe / total) * 100)
            : 0;


    /* Dashboard Statistics */

    document.getElementById(
        "dashboardTotal"
    ).innerText = total;


    document.getElementById(
        "dashboardSafe"
    ).innerText = safe;


    document.getElementById(
        "dashboardThreats"
    ).innerText = threats;


    document.getElementById(
        "dashboardThreatRate"
    ).innerText =
        threatRate + "%";


    /* Security Summary */

    document.getElementById(
        "summaryTotal"
    ).innerText = total;


    document.getElementById(
        "summarySafe"
    ).innerText = safe;


    document.getElementById(
        "summaryThreats"
    ).innerText = threats;


    document.getElementById(
        "summaryRate"
    ).innerText =
        threatRate + "%";


    /* Donut Chart */

    document.getElementById(
        "safePercentage"
    ).innerText =
        safePercentage + "%";


    document.getElementById(
        "safeLegend"
    ).innerText =
        safe + " scans";


    document.getElementById(
        "threatLegend"
    ).innerText =
        threats + " scans";


    const safeDegree =
        safePercentage * 3.6;


    const distributionCircle =
        document.querySelector(
            ".distribution-circle"
        );


    if (distributionCircle) {

        distributionCircle.style.background =
            `conic-gradient(
                #22c55e 0deg ${safeDegree}deg,
                #ef4444 ${safeDegree}deg 360deg
            )`;

    }


    /* Recent Dashboard Scans */

    const recentContainer =
        document.getElementById(
            "dashboardRecentScans"
        );


    if (!recentContainer) {
        return;
    }


    const recent =
        history.slice(0, 5);


    if (recent.length === 0) {

        recentContainer.innerHTML = `

            <div class="dashboard-empty">

                🔍

                <p>
                    No scans available yet.
                </p>

            </div>

        `;

        return;
    }


    recentContainer.innerHTML =
        recent.map(scan => `

            <div class="dashboard-scan-row">

                <div>

                    <strong>
                        ${escapeHTML(scan.url)}
                    </strong>

                    <span>
                        ${scan.time}
                    </span>

                </div>


                <div>

                    <strong>

                        ${scan.prediction === "Phishing"
                            ? "🔴 Phishing"
                            : "🟢 Legitimate"}

                    </strong>

                    <span>
                        ${scan.confidence}% confidence
                    </span>

                </div>

            </div>

        `).join("");


            recentContainer.innerHTML = 
        recent.map(scan => `

            <div class="dashboard-scan-row"> 

                <div> 

                    <strong> 
                        ${escapeHTML(scan.url)} 
                    </strong> 

                    <span> 
                        ${scan.time} 
                    </span> 

                </div> 

                <div> 

                    <strong> 
                        ${scan.prediction === "Phishing" 
                            ? "🔴 Phishing" 
                            : "🟢 Legitimate"} 
                    </strong> 

                    <span> 
                        ${scan.confidence}% confidence 
                    </span> 

                </div> 

            </div>

        `).join("");


    /* Scan Activity Chart */
    updateScanActivity();

}


/* ================================= */
/* ================================= */
/* SETTINGS & ENGINE CONFIG */
/* ================================= */

function openSettings() {

    const modal =
        document.getElementById("settingsModal");

    if (modal) {
        modal.style.display = "flex";
        modal.classList.add("show");
    }

    loadSettingsUI();

}


function closeSettings() {

    const modal =
        document.getElementById("settingsModal");

    if (modal) {
        modal.style.display = "none";
        modal.classList.remove("show");
    }

}


function loadSettingsUI() {

    // 1. History preference
    const savedHistoryPref =
        localStorage.getItem("saveHistory");

    saveHistory =
        savedHistoryPref !== "false";

    const historyToggle =
        document.getElementById("historyToggle");

    if (historyToggle) {
        historyToggle.checked = saveHistory;
    }


    // 2. Scanner sensitivity
    const savedSensitivity =
        localStorage.getItem("scannerSensitivity") || "standard";

    const sensitivityEl =
        document.getElementById("settingSensitivity");

    if (sensitivityEl) {
        sensitivityEl.value = savedSensitivity;
    }


    // 3. Strict HTTPS warning
    const savedHttps =
        localStorage.getItem("httpsWarning") !== "false";

    const httpsToggle =
        document.getElementById("httpsWarningToggle");

    if (httpsToggle) {
        httpsToggle.checked = savedHttps;
    }


    // 4. Sound alert
    const savedSound =
        localStorage.getItem("soundAlerts") !== "false";

    const soundToggle =
        document.getElementById("soundAlertToggle");

    if (soundToggle) {
        soundToggle.checked = savedSound;
    }


    // 5. Theme button
    const isLight =
        document.body.classList.contains("light-theme");

    const themeBtn =
        document.getElementById("themeButton");

    if (themeBtn) {
        themeBtn.innerText =
            isLight ? "☀️ Light" : "🌙 Dark";
    }

    // 6. Blocklist manager
    renderSettingsBlockedList();

}


function toggleHistorySetting() {

    const toggle =
        document.getElementById("historyToggle");

    saveHistory =
        toggle ? toggle.checked : true;

    localStorage.setItem(
        "saveHistory",
        saveHistory ? "true" : "false"
    );

    showSettingsToast("✅ History preference updated");

}


function saveScannerSettings() {

    const sensitivityEl =
        document.getElementById("settingSensitivity");

    const httpsToggle =
        document.getElementById("httpsWarningToggle");

    const soundToggle =
        document.getElementById("soundAlertToggle");


    if (sensitivityEl) {
        localStorage.setItem(
            "scannerSensitivity",
            sensitivityEl.value
        );
    }

    if (httpsToggle) {
        localStorage.setItem(
            "httpsWarning",
            httpsToggle.checked ? "true" : "false"
        );
    }

    if (soundToggle) {
        localStorage.setItem(
            "soundAlerts",
            soundToggle.checked ? "true" : "false"
        );
    }


    showSettingsToast("✅ Settings saved successfully");

}


function showSettingsToast(msg) {

    const statusEl =
        document.getElementById("settingsSaveStatus");

    if (statusEl) {

        statusEl.textContent = msg;

        statusEl.style.color = "#22c55e";

        setTimeout(() => {
            statusEl.textContent = "";
        }, 2500);

    }

}


/* ================================= */
/* BLOCKED URLS & BLACKLIST ENGINE */
/* ================================= */

function getBlockedURLs() {
    try {
        const stored = localStorage.getItem("blockedUrls");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}


function extractDomain(rawUrl) {
    try {
        let u = (rawUrl || "").trim();
        if (!u.startsWith("http://") && !u.startsWith("https://")) {
            u = "https://" + u;
        }
        return new URL(u).hostname.toLowerCase();
    } catch (e) {
        return (rawUrl || "").toLowerCase().trim();
    }
}


function isURLBlocked(rawUrl) {
    if (!rawUrl) return false;
    const blocked = getBlockedURLs();
    const cleanUrl = rawUrl.trim().toLowerCase();
    const domain = extractDomain(rawUrl);

    return blocked.some(item => {
        const bUrl = (item.url || "").toLowerCase().trim();
        const bDomain = item.domain ? item.domain.toLowerCase().trim() : "";
        return (
            cleanUrl === bUrl ||
            cleanUrl.startsWith(bUrl) ||
            (bDomain && domain === bDomain) ||
            (bDomain && domain.endsWith("." + bDomain))
        );
    });
}


function blockURL(rawUrl, reason = "Phishing Threat") {
    if (!rawUrl) return false;
    const blocked = getBlockedURLs();
    const domain = extractDomain(rawUrl);

    if (isURLBlocked(rawUrl)) {
        return false;
    }

    const newEntry = {
        url: rawUrl.trim(),
        domain: domain,
        time: new Date().toLocaleString(),
        reason: reason
    };

    blocked.unshift(newEntry);
    localStorage.setItem("blockedUrls", JSON.stringify(blocked));

    renderSettingsBlockedList();
    loadProfile();
    return true;
}


function unblockURL(rawUrl) {
    if (!rawUrl) return false;
    let blocked = getBlockedURLs();
    const cleanUrl = (rawUrl || "").trim().toLowerCase();
    const domain = extractDomain(rawUrl);

    blocked = blocked.filter(item => {
        const bUrl = (item.url || "").toLowerCase().trim();
        const bDomain = item.domain ? item.domain.toLowerCase().trim() : "";
        return cleanUrl !== bUrl && domain !== bDomain;
    });

    localStorage.setItem("blockedUrls", JSON.stringify(blocked));

    renderSettingsBlockedList();
    loadProfile();
    return true;
}


function toggleBlockURL(encodedUrl) {
    const url = decodeURIComponent(encodedUrl);
    const btn = document.getElementById("blockThreatBtn");
    const header = document.querySelector(".phishing-card .result-card-header");

    if (isURLBlocked(url)) {
        unblockURL(url);
        if (btn) {
            btn.className = "block-threat-button";
            btn.innerHTML = "🚫 Block Phishing URL";
            btn.title = "Add URL to Blacklist";
        }
        const banner = document.getElementById("blockedStatusBanner");
        if (banner) {
            banner.remove();
        }
        showSettingsToast("🔓 URL unblocked and removed from Blacklist");
    } else {
        blockURL(url, "Flagged Phishing Site");
        if (btn) {
            btn.className = "block-threat-button blocked-state";
            btn.innerHTML = "⛔ URL is Blocked (Click to Unblock)";
            btn.title = "Remove from Blacklist";
        }
        if (header && !document.getElementById("blockedStatusBanner")) {
            const banner = document.createElement("div");
            banner.id = "blockedStatusBanner";
            banner.className = "blocked-warning-banner";
            banner.innerHTML = "⛔ THIS DOMAIN IS IN YOUR BLOCKED BLACKLIST";
            header.insertAdjacentElement("afterend", banner);
        }
        showSettingsToast("🚫 URL blocked! Added to your Blacklist.");
    }
}


function addManualBlockedURL() {
    const input = document.getElementById("manualBlockInput");
    if (!input) return;
    const val = input.value.trim();

    if (!val || val.length < 3) {
        alert("Please enter a valid domain or URL to block.");
        return;
    }

    if (isURLBlocked(val)) {
        alert("This URL or domain is already in your Blocklist.");
        return;
    }

    blockURL(val, "Manual Blacklist");
    input.value = "";
    showSettingsToast("🚫 Domain added to Blacklist successfully");
}


function clearAllBlockedURLs() {
    if (getBlockedURLs().length === 0) {
        alert("Blocklist is already empty.");
        return;
    }

    if (confirm("Are you sure you want to clear all blocked URLs from your Blacklist?")) {
        localStorage.removeItem("blockedUrls");
        renderSettingsBlockedList();
        loadProfile();
        showSettingsToast("🗑️ Blocklist cleared successfully");
    }
}


function renderSettingsBlockedList() {
    const listContainer = document.getElementById("settingsBlockedList");
    const countPill = document.getElementById("settingsBlockedCount");
    const blocked = getBlockedURLs();

    if (countPill) {
        countPill.textContent = `${blocked.length} Blocked`;
    }

    if (!listContainer) return;

    if (blocked.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-blocklist-msg">
                No URLs currently blocked. Phishing URLs you block will appear here.
            </div>
        `;
        return;
    }

    listContainer.innerHTML = blocked.map(item => `
        <div class="blocked-list-item">
            <div class="blocked-item-info">
                <span class="blocked-item-url" title="${escapeHTML(item.url)}">
                    🚫 ${escapeHTML(item.domain || item.url)}
                </span>
                <span class="blocked-item-time">
                    Blocked: ${escapeHTML(item.time)} • ${escapeHTML(item.reason || "Phishing")}
                </span>
            </div>
            <button
                type="button"
                class="blocked-item-unblock-btn"
                onclick="unblockURL('${encodeURIComponent(item.url)}');"
                title="Unblock this URL"
            >
                🔓 Unblock
            </button>
        </div>
    `).join("");
}


function exportHistoryJSON() {

    const history = getHistory();

    if (history.length === 0) {
        alert("No scan history available to export.");
        return;
    }

    const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(history, null, 2));

    const downloadAnchor =
        document.createElement("a");

    downloadAnchor.setAttribute("href", dataStr);

    downloadAnchor.setAttribute("download", "url_security_scan_history.json");

    document.body.appendChild(downloadAnchor);

    downloadAnchor.click();

    downloadAnchor.remove();

}


function exportHistoryCSV() {

    const history = getHistory();

    if (history.length === 0) {
        alert("No scan history available to export.");
        return;
    }

    let csvContent =
        "data:text/csv;charset=utf-8,URL,Prediction,Confidence,Threat_Level,Scan_Time\n";

    history.forEach(item => {

        const row = [
            `"${item.url.replace(/"/g, '""')}"`,
            `"${item.prediction}"`,
            `"${item.confidence}%"`,
            `"${item.prediction === 'Phishing' ? 'HIGH' : 'LOW'}"`,
            `"${item.time}"`
        ].join(",");

        csvContent += row + "\n";

    });

    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);

    link.setAttribute("download", "url_security_scan_history.csv");

    document.body.appendChild(link);

    link.click();

    link.remove();

}


/* ================================= */
/* AUDIO ALERT ENGINE */
/* ================================= */

let globalAudioCtx = null;

function getOrCreateAudioContext() {
    try {
        if (!globalAudioCtx) {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (AudioContextClass) {
                globalAudioCtx = new AudioContextClass();
            }
        }

        if (globalAudioCtx && globalAudioCtx.state === "suspended") {
            globalAudioCtx.resume();
        }

        return globalAudioCtx;
    } catch (e) {
        console.warn("AudioContext error:", e);
        return null;
    }
}

// Unlock audio on initial user gestures anywhere on the page
["click", "keydown", "touchstart"].forEach(evt => {
    document.addEventListener(evt, () => {
        getOrCreateAudioContext();
    }, { once: false, passive: true });
});


function playThreatAlert(force = false) {

    const soundPref =
        localStorage.getItem("soundAlerts");

    const soundEnabled =
        soundPref !== "false";

    if (!soundEnabled && !force) {
        return;
    }

    try {

        const ctx = getOrCreateAudioContext();

        if (!ctx) {
            playFallbackBeep();
            return;
        }

        if (ctx.state === "suspended") {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // Pulse 1: Urgent high-to-low alarm
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(820, now);
        osc1.frequency.exponentialRampToValueAtTime(440, now + 0.18);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.18);

        // Pulse 2: Second alarm burst
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(920, now + 0.22);
        osc2.frequency.exponentialRampToValueAtTime(460, now + 0.42);
        gain2.gain.setValueAtTime(0.35, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.42);

        // Pulse 3: Deep warning siren
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = "triangle";
        osc3.frequency.setValueAtTime(1020, now + 0.46);
        osc3.frequency.exponentialRampToValueAtTime(320, now + 0.75);
        gain3.gain.setValueAtTime(0.4, now + 0.46);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now + 0.46);
        osc3.stop(now + 0.75);

    }

    catch (e) {
        console.warn("AudioContext playback error, using fallback beep:", e);
        playFallbackBeep();
    }

}


function playFallbackBeep() {

    try {
        const audioCtx =
            new (window.AudioContext || window.webkitAudioContext)();

        if (audioCtx) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.value = 880;
            gain.gain.value = 0.25;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        }
    } catch (err) {
        // Suppress if audio fully blocked
    }

}


function testThreatAlertSound() {

    playThreatAlert(true);

    showSettingsToast("🔊 Playing threat sound preview...");

}


/* ================================= */
/* THEME */
/* ================================= */

function toggleTheme() {

    document.body.classList.toggle(
        "light-theme"
    );


    const isLight =
        document.body.classList.contains(
            "light-theme"
        );


    localStorage.setItem(
        "theme",
        isLight ? "light" : "dark"
    );


    const themeBtn =
        document.getElementById("themeButton");

    if (themeBtn) {
        themeBtn.innerText =
            isLight ? "☀️ Light" : "🌙 Dark";
    }

}


/* ================================= */
/* ESCAPE HTML */
/* ================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


/* ================================= */
/* INITIALIZE */
/* ================================= */

window.addEventListener(
    "DOMContentLoaded",
    () => {

        const savedTheme =
            localStorage.getItem("theme");


        if (savedTheme === "light") {

            document.body.classList.add(
                "light-theme"
            );

            const themeBtn =
                document.getElementById("themeButton");

            if (themeBtn) {
                themeBtn.innerText = "☀️ Light";
            }

        }


        loadRecentScans();

        updateStatistics();

        updateDashboard();

        updateLoginUI();

        loadSettingsUI();

    }
);


/* ================================= */
/* PRINT / SAVE PDF REPORT */
/* ================================= */

function exportScanReport() {

    const history = getHistory();

    if (history.length === 0) {
        alert("No scan report available.");
        return;
    }

    const latestScan = history[0];

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>

            <title>URL Security Scan Report</title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    color: #222;
                }

                .header {
                    text-align: center;
                    border-bottom: 2px solid #222;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }

                .header h1 {
                    margin: 0;
                    font-size: 26px;
                }

                .header p {
                    margin-top: 8px;
                    color: #666;
                }

                .result {
                    padding: 15px;
                    margin-bottom: 25px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                }

                .row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid #eee;
                }

                .row:last-child {
                    border-bottom: none;
                }

                .label {
                    font-weight: bold;
                }

                .phishing {
                    color: #dc2626;
                    font-weight: bold;
                }

                .safe {
                    color: #16a34a;
                    font-weight: bold;
                }

                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                }

            </style>

        </head>

        <body>

            <div class="header">

                <h1>
                    🛡️ AI URL Security Scanner
                </h1>

                <p>
                    URL Security Scan Report
                </p>

            </div>


            <div class="result">

                <div class="row">
                    <span class="label">Scanned URL</span>
                    <span>${escapeHTML(latestScan.url)}</span>
                </div>

                <div class="row">
                    <span class="label">Prediction</span>

                    <span class="${latestScan.prediction === "Phishing" ? "phishing" : "safe"}">
                        ${latestScan.prediction === "Phishing"
                            ? "🔴 Phishing"
                            : "🟢 Legitimate"}
                    </span>

                </div>

                <div class="row">
                    <span class="label">AI Confidence</span>
                    <span>${latestScan.confidence}%</span>
                </div>

                <div class="row">
                    <span class="label">Threat Level</span>

                    <span class="${latestScan.prediction === "Phishing" ? "phishing" : "safe"}">
                        ${latestScan.prediction === "Phishing"
                            ? "HIGH"
                            : "LOW"}
                    </span>

                </div>

                <div class="row">
                    <span class="label">Scan Time</span>
                    <span>${latestScan.time}</span>
                </div>

            </div>


            <div class="footer">

                Generated by AI URL Security Scanner<br>
                Machine Learning Based Phishing Detection System

            </div>


            <script>

                window.onload = function() {
                    window.print();
                };

            <\/script>

        </body>
        </html>
    `);

    printWindow.document.close();

}

/* ================================= */
/* 7-DAY SCAN ACTIVITY */
/* ================================= */

function updateScanActivity() {

    const container =
        document.getElementById("activityBars");

    if (!container) {
        return;
    }

    const history = getHistory();

    const today = new Date();

    const days = [];

    /* Last 7 days */

    for (let i = 6; i >= 0; i--) {

        const date = new Date(today);

        date.setDate(today.getDate() - i);

        const dateKey =
            date.toLocaleDateString();

        const dayName =
            date.toLocaleDateString(
                "en-US",
                { weekday: "short" }
            );

        const count =
            history.filter(scan => {

                const scanDate =
                    new Date(scan.time)
                        .toLocaleDateString();

                return scanDate === dateKey;

            }).length;

        days.push({
            day: dayName,
            count: count
        });

    }


    /* Find highest value */

    const maxCount =
        Math.max(
            ...days.map(day => day.count),
            1
        );


    /* Create bars */

    container.innerHTML =
        days.map(day => {

            const height =
                day.count === 0
                    ? 5
                    : (day.count / maxCount) * 100;

            return `

                <div class="activity-column">

                    <div class="activity-count">
                        ${day.count}
                    </div>

                    <div
                        class="activity-bar"
                        style="height:${height}%"
                    ></div>

                    <div class="activity-day">
                        ${day.day}
                    </div>

                </div>

            `;

        }).join("");

}

/* ================================= */
/* LOGIN SYSTEM */
/* ================================= */

function openLogin() {

    const loginModal =
        document.getElementById("loginModal");

    if (loginModal) {
        loginModal.style.display = "flex";
    }
}


function closeLogin() {

    const loginModal =
        document.getElementById("loginModal");

    if (loginModal) {
        loginModal.style.display = "none";
    }
}


/* ================================= */
/* LOGIN USER */
/* ================================= */

function loginUser() {

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value.trim();

    const message =
        document.getElementById("loginMessage");


    /* Empty fields */

    if (email === "" || password === "") {

        message.textContent =
            "⚠️ Please enter email and password.";

        message.style.color = "#dc2626";

        return;
    }


    /* Demo Login */

    if (
        email === "admin@gmail.com" &&
        password === "123456"
    ) {

        localStorage.setItem(
            "isLoggedIn",
            "true"
        );

        localStorage.setItem(
            "loggedInUser",
            email
        );


        message.textContent =
            "✅ Login successful!";

        message.style.color = "#16a34a";


        setTimeout(() => {

            closeLogin();

            updateLoginUI();

        }, 500);

    }

    else {

        message.textContent =
            "❌ Invalid email or password.";

        message.style.color = "#dc2626";

    }

}


/* ================================= */
/* UPDATE LOGIN UI */
/* ================================= */

function updateLoginUI() {

    const signInButton =
        document.querySelector(".sign-in-button");

    const profile = getProfileData();

    /* Always ensure account menu name is set */
    const accountNameEl =
        document.getElementById("accountName");
    const accountEmailEl =
        document.getElementById("accountEmail");

    if (accountNameEl) {
        accountNameEl.textContent = profile.name;
    }

    if (accountEmailEl) {
        accountEmailEl.textContent = profile.email;
    }


    if (!signInButton) {
        return;
    }


    const isLoggedIn =
        localStorage.getItem("isLoggedIn");


    if (isLoggedIn === "true") {

        /* Change Sign In → Account */

        signInButton.innerHTML =
            "👤 Account";

        signInButton.onclick =
            openAccountMenu;

    }

    else {

        /* Change Account → Sign In */

        signInButton.innerHTML =
            "🔐 Sign In";

        signInButton.onclick =
            openLogin;


        /* Hide account menu */

        const menu =
            document.getElementById("accountMenu");

        if (menu) {
            menu.style.display = "none";
        }

    }

}


/* ================================= */
/* OPEN ACCOUNT MENU */
/* ================================= */

function openAccountMenu() {

    const menu =
        document.getElementById("accountMenu");

    const profile = getProfileData();

    if (!menu) {
        return;
    }

    const accountNameEl =
        document.getElementById("accountName");
    const emailElement =
        document.getElementById("accountEmail");


    /* Show current user details */

    if (accountNameEl) {
        accountNameEl.textContent = profile.name;
    }

    if (emailElement) {
        emailElement.textContent = profile.email;
    }


    /* Toggle account menu */

    if (menu.style.display === "block") {

        menu.style.display = "none";

    }

    else {

        menu.style.display = "block";

    }

}


/* ================================= */
/* LOGOUT */
/* ================================= */

function logoutUser() {

    /* Remove login information */

    localStorage.removeItem("isLoggedIn");

    localStorage.removeItem("loggedInUser");


    /* Hide account menu */

    const menu =
        document.getElementById("accountMenu");

    if (menu) {

        menu.style.display = "none";

    }


    /* Change Account → Sign In */

    updateLoginUI();


    alert("✅ You have been logged out.");

}


/* ================================= */
/* PROFILE MANAGEMENT */
/* ================================= */

function getProfileData() {

    return {
        name: localStorage.getItem("userName") || "Anushka",
        email: localStorage.getItem("userEmail") || localStorage.getItem("loggedInUser") || "anushka@gmail.com",
        role: localStorage.getItem("userRole") || "AI Security Analyst",
        bio: localStorage.getItem("userBio") || "Threat Intelligence & URL Safety Explorer"
    };

}


function loadProfile() {

    const profile = getProfileData();


    /* Account dropdown elements */

    const accountNameEl =
        document.getElementById("accountName");

    const accountEmailEl =
        document.getElementById("accountEmail");

    if (accountNameEl) {
        accountNameEl.textContent = profile.name;
    }

    if (accountEmailEl) {
        accountEmailEl.textContent = profile.email;
    }


    /* Profile page display elements */

    const displayNameEl =
        document.getElementById("profileDisplayName");

    const displayEmailEl =
        document.getElementById("profileDisplayEmail");

    const displayTagEl =
        document.getElementById("profileDisplayTag");

    const displayBioEl =
        document.getElementById("profileDisplayBio");


    if (displayNameEl) {
        displayNameEl.textContent = profile.name;
    }

    if (displayEmailEl) {
        displayEmailEl.textContent = profile.email;
    }

    if (displayTagEl) {
        displayTagEl.textContent = profile.role;
    }

    if (displayBioEl) {
        displayBioEl.textContent = profile.bio;
    }


    /* Profile edit form fields */

    const inputName =
        document.getElementById("profileInputName");

    const inputEmail =
        document.getElementById("profileInputEmail");

    const inputRole =
        document.getElementById("profileInputRole");

    const inputBio =
        document.getElementById("profileInputBio");


    if (inputName) {
        inputName.value = profile.name;
    }

    if (inputEmail) {
        inputEmail.value = profile.email;
    }

    if (inputRole) {
        inputRole.value = profile.role;
    }

    if (inputBio) {
        inputBio.value = profile.bio;
    }


    /* Profile scan statistics */

    const history =
        getHistory();

    const total =
        history.length;

    const safe =
        history.filter(
            item => item.prediction === "Legitimate"
        ).length;

    const threats =
        history.filter(
            item => item.prediction === "Phishing"
        ).length;

    const safetyScore =
        total > 0
            ? Math.round((safe / total) * 100) + "%"
            : "100%";


    const blocked =
        getBlockedURLs().length;

    const totalEl =
        document.getElementById("profileTotalScans");

    const safeEl =
        document.getElementById("profileSafeScans");

    const threatsEl =
        document.getElementById("profileThreatScans");

    const blockedEl =
        document.getElementById("profileBlockedScans");

    const scoreEl =
        document.getElementById("profileSecurityScore");


    if (totalEl) {
        totalEl.textContent = total;
    }

    if (safeEl) {
        safeEl.textContent = safe;
    }

    if (threatsEl) {
        threatsEl.textContent = threats;
    }

    if (blockedEl) {
        blockedEl.textContent = blocked;
    }

    if (scoreEl) {
        scoreEl.textContent = safetyScore;
    }

}


function showProfile() {

    const menu =
        document.getElementById("accountMenu");

    if (menu) {
        menu.style.display = "none";
    }

    showSection("profile");

}


function saveProfileDetails(event) {

    if (event) {
        event.preventDefault();
    }


    const nameInput =
        document.getElementById("profileInputName");

    const emailInput =
        document.getElementById("profileInputEmail");

    const roleInput =
        document.getElementById("profileInputRole");

    const bioInput =
        document.getElementById("profileInputBio");


    const name =
        (nameInput ? nameInput.value.trim() : "") || "Anushka";

    const email =
        (emailInput ? emailInput.value.trim() : "") || "anushka@gmail.com";

    const role =
        (roleInput ? roleInput.value.trim() : "") || "AI Security Analyst";

    const bio =
        (bioInput ? bioInput.value.trim() : "") || "Threat Intelligence & URL Safety Explorer";


    localStorage.setItem("userName", name);

    localStorage.setItem("userEmail", email);

    localStorage.setItem("userRole", role);

    localStorage.setItem("userBio", bio);


    loadProfile();

    updateLoginUI();


    const messageEl =
        document.getElementById("profileSaveMessage");

    if (messageEl) {

        messageEl.textContent =
            "✅ Profile updated successfully!";

        messageEl.style.color = "#22c55e";


        setTimeout(() => {
            messageEl.textContent = "";
        }, 3500);

    }

}


function resetProfileDetails() {

    localStorage.setItem("userName", "Anushka");

    localStorage.setItem("userEmail", "anushka@gmail.com");

    localStorage.setItem("userRole", "AI Security Analyst");

    localStorage.setItem("userBio", "Threat Intelligence & URL Safety Explorer");


    loadProfile();

    updateLoginUI();


    const messageEl =
        document.getElementById("profileSaveMessage");

    if (messageEl) {

        messageEl.textContent =
            "🔄 Profile reset to default (Anushka).";

        messageEl.style.color = "#818cf8";


        setTimeout(() => {
            messageEl.textContent = "";
        }, 3500);

    }

}


/* ================================= */
/* GLOBAL EVENT LISTENERS */
/* ================================= */

/* Close dropdowns and modals when clicking outside */

window.addEventListener("click", function (event) {

    const menu =
        document.getElementById("accountMenu");

    const signInButton =
        document.querySelector(".sign-in-button");

    const settingsModal =
        document.getElementById("settingsModal");

    const loginModal =
        document.getElementById("loginModal");


    if (menu && menu.style.display === "block") {

        if (
            !menu.contains(event.target) &&
            (!signInButton || !signInButton.contains(event.target))
        ) {
            menu.style.display = "none";
        }

    }

    if (event.target === settingsModal) {
        closeSettings();
    }

    if (event.target === loginModal) {
        closeLogin();
    }

});


/* Close on Escape key */

window.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        closeSettings();

        closeLogin();

        const menu =
            document.getElementById("accountMenu");

        if (menu) {
            menu.style.display = "none";
        }

    }

});


/* Initial page load */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateLoginUI();

        loadProfile();

        loadSettingsUI();

    }
);
