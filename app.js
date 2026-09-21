const KAABAH_LAT = 21.422487;
const KAABAH_LON = 39.826206;

let currentLatitude = null;
let currentLongitude = null;

let qiblaAzimuth = null;
let currentHeading = null;

let gpsStarted = false;
let compassStarted = false;

let lastRawHeading = null;
let filteredHeading = null;

// ===============================
// MATEMATIKA
// ===============================

function toRadians(deg) {
    return deg * Math.PI / 180;
}

function toDegrees(rad) {
    return rad * 180 / Math.PI;
}

function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}

// ===============================
// HITUNG AZIMUT KIBLAT
// ===============================

function calculateQibla(lat, lon) {

    const lat1 = toRadians(lat);
    const lat2 = toRadians(KAABAH_LAT);

    const deltaLon = toRadians(KAABAH_LON - lon);

    const y = Math.sin(deltaLon) * Math.cos(lat2);

    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearing = toDegrees(Math.atan2(y, x));

    return normalizeAngle(bearing);
}

// ===============================
// HITUNG JARAK KE KA'BAH
// ===============================

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

// ===============================
// GPS
// ===============================

function updateGPS(position) {

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    currentLatitude = lat;
    currentLongitude = lon;

    document.getElementById("latitude").textContent =
        lat.toFixed(6) + "°";

    document.getElementById("longitude").textContent =
        lon.toFixed(6) + "°";

    document.getElementById("accuracy").textContent =
        "± " + accuracy.toFixed(1) + " m";

    // Hitung azimut kiblat
    qiblaAzimuth = calculateQibla(lat, lon);

    document.getElementById("qibla").textContent =
        qiblaAzimuth.toFixed(1) + "°";

    // Hitung jarak
    const distance = calculateDistance(
        lat,
        lon,
        KAABAH_LAT,
        KAABAH_LON
    );

    document.getElementById("distance").textContent =
        distance.toFixed(1) + " km";

    if (currentHeading !== null) {
        updateNeedle();
    }

    document.getElementById("status").textContent =
        "GPS aktif. Menunggu arah kompas...";
}

function gpsError(error) {

    document.getElementById("status").textContent =
        "GPS error: " + error.message;

    console.error("GPS ERROR:", error);
}

function startGPS() {

    if (!navigator.geolocation) {

        document.getElementById("status").textContent =
            "Browser tidak mendukung GPS.";

        return;
    }

    if (gpsStarted) {
        return;
    }

    gpsStarted = true;

    navigator.geolocation.watchPosition(
        updateGPS,
        gpsError,
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000
        }
    );
}

// ===============================
// FILTER SUDUT
// ===============================

function smoothHeading(newHeading) {

    newHeading = normalizeAngle(newHeading);

    if (filteredHeading === null) {
        filteredHeading = newHeading;
        return filteredHeading;
    }

    let difference =
        normalizeAngle(newHeading - filteredHeading);

    if (difference > 180) {
        difference -= 360;
    }

    // Filter agar jarum tidak terlalu bergetar
    const smoothing = 0.18;

    filteredHeading =
        normalizeAngle(
            filteredHeading +
            difference * smoothing
        );

    return filteredHeading;
}

// ===============================
// SENSOR KOMPAS
// ===============================

function handleOrientation(event) {

    let heading = null;

    // iPhone / Safari
    if (
        typeof event.webkitCompassHeading === "number" &&
        !isNaN(event.webkitCompassHeading)
    ) {

        heading = event.webkitCompassHeading;
    }

    // Sensor absolut
    else if (
        event.absolute === true &&
        typeof event.alpha === "number"
    ) {

        heading = 360 - event.alpha;
    }

    // Fallback
    else if (
        typeof event.alpha === "number"
    ) {

        heading = 360 - event.alpha;
    }

    if (heading === null || isNaN(heading)) {
        return;
    }

    heading = normalizeAngle(heading);

    lastRawHeading = heading;

    currentHeading = smoothHeading(heading);

    const headingElement =
        document.getElementById("heading");

    if (headingElement) {

        headingElement.textContent =
            currentHeading.toFixed(1) + "°";
    }

    updateNeedle();
}

// ===============================
// JARUM KIBLAT
// ===============================

function updateNeedle() {

    if (
        qiblaAzimuth === null ||
        currentHeading === null
    ) {
        return;
    }

    let difference =
        normalizeAngle(
            qiblaAzimuth - currentHeading
        );

    let displayDifference = difference;

    if (displayDifference > 180) {
        displayDifference -= 360;
    }

    const differenceElement =
        document.getElementById("difference");

    if (differenceElement) {

        differenceElement.textContent =
            displayDifference.toFixed(1) + "°";
    }

    const needle =
        document.getElementById("needle");

    if (needle) {

        needle.style.transform =
            `rotate(${difference}deg)`;
    }

    const status =
        document.getElementById("status");

    if (status) {

        if (Math.abs(displayDifference) <= 3) {

            status.textContent =
                "✓ Arah kiblat tercapai";

        } else {

            status.textContent =
                "Kompas aktif — arahkan jarum ke kiblat.";
        }
    }
}

// ===============================
// IZIN SENSOR
// ===============================

async function startCompass() {

    if (compassStarted) {
        return;
    }

    try {

        // iPhone / browser yang membutuhkan izin
        if (
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function"
        ) {

            const permission =
                await DeviceOrientationEvent.requestPermission(true);

            if (permission !== "granted") {

                document.getElementById("status").textContent =
                    "Izin sensor kompas ditolak.";

                return;
            }
        }

        // HANYA pasang listener satu kali
        window.addEventListener(
            "deviceorientationabsolute",
            handleOrientation,
            true
        );

        window.addEventListener(
            "deviceorientation",
            handleOrientation,
            true
        );

        compassStarted = true;

        document.getElementById("status").textContent =
            "Sensor kompas aktif. Putar HP perlahan untuk kalibrasi.";

    } catch (error) {

        console.error(error);

        document.getElementById("status").textContent =
            "Sensor kompas tidak dapat digunakan.";
    }
}

// ===============================
// TOMBOL GPS + KOMPAS
// ===============================

document
    .getElementById("startButton")
    .addEventListener("click", async function () {

        document.getElementById("status").textContent =
            "Memulai GPS dan kompas...";

        startGPS();

        await startCompass();
    });

// ===============================
// GOOGLE EARTH
// ===============================

const earthButton =
    document.getElementById("earthButton");

if (earthButton) {

    earthButton.addEventListener(
        "click",
        function () {

            if (
                currentLatitude === null ||
                currentLongitude === null
            ) {

                alert(
                    "Lokasi GPS belum tersedia. Jalankan GPS terlebih dahulu."
                );

                return;
            }

            const earthURL =
                "https://earth.google.com/web/search/" +
                currentLatitude +
                "," +
                currentLongitude;

            window.open(
                earthURL,
                "_blank"
            );
        }
    );
}
// ===============================
// JAM REAL-TIME
// ===============================

function updateRealTimeClock() {

    const now = new Date();

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const clock =
        document.getElementById("realTimeClock");

    if (clock) {
        clock.textContent =
            `${hours}:${minutes}:${seconds}`;
    }
}

updateRealTimeClock();

setInterval(updateRealTimeClock, 1000);