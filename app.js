const KAABAH_LAT = 21.422487;
const KAABAH_LON = 39.826206;

let qiblaAzimuth = null;
let currentHeading = null;
let absoluteSensorDetected = false;
let currentLatitude = null;
let currentLongitude = null;


// ===============================
// FUNGSI MATEMATIKA
// ===============================

function toRadians(deg) {
    return deg * Math.PI / 180;
}

function toDegrees(rad) {
    return rad * 180 / Math.PI;
}

function normalizeAngle(angle) {
    return (angle + 360) % 360;
}


// ===============================
// HITUNG ARAH KIBLAT
// ===============================

function calculateQibla(lat, lon) {

    const lat1 = toRadians(lat);
    const lat2 = toRadians(KAABAH_LAT);

    const deltaLon =
        toRadians(KAABAH_LON - lon);

    const y =
        Math.sin(deltaLon) * Math.cos(lat2);

    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) *
        Math.cos(lat2) *
        Math.cos(deltaLon);

    let bearing =
        toDegrees(Math.atan2(y, x));

    bearing = normalizeAngle(bearing);

    return bearing;
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


    // HITUNG KIBLAT

    qiblaAzimuth =
        calculateQibla(lat, lon);

    document.getElementById("qibla").textContent =
        qiblaAzimuth.toFixed(1) + "°";


    // HITUNG JARAK

    const distance =
        calculateDistance(
            lat,
            lon,
            KAABAH_LAT,
            KAABAH_LON
        );

    document.getElementById("distance").textContent =
        distance.toFixed(1) + " km";


    // Jika sensor sudah aktif
    if (currentHeading !== null) {
        updateNeedle();
    }

    document.getElementById("status").textContent =
        "GPS aktif. Menunggu arah kompas...";
}


// ===============================
// ERROR GPS
// ===============================

function gpsError(error) {

    document.getElementById("status").textContent =
        "GPS error: " + error.message;
}


// ===============================
// KOMPAS / SENSOR HP
// ===============================

function handleOrientation(event) {

    let heading = null;


    // iPhone / Safari
    if (
        typeof event.webkitCompassHeading === "number" &&
        !isNaN(event.webkitCompassHeading)
    ) {

        heading =
            event.webkitCompassHeading;

    }

    // Sensor absolut
    else if (
        event.absolute === true &&
        typeof event.alpha === "number"
    ) {

        heading =
            360 - event.alpha;

        absoluteSensorDetected = true;
    }

    // Sensor biasa sebagai cadangan
    else if (
        !absoluteSensorDetected &&
        typeof event.alpha === "number"
    ) {

        heading =
            360 - event.alpha;
    }


    if (heading === null) {
        return;
    }


    heading = normalizeAngle(heading);

    currentHeading = heading;


    // Tampilkan arah HP
    const headingElement =
        document.getElementById("heading");

    if (headingElement) {
        headingElement.textContent =
            heading.toFixed(1) + "°";
    }


    updateNeedle();
}


// ===============================
// GERAKKAN JARUM
// ===============================

function updateNeedle() {

    if (
        qiblaAzimuth === null ||
        currentHeading === null
    ) {
        return;
    }


    // Selisih arah kiblat dengan arah HP

    const difference =
        normalizeAngle(
            qiblaAzimuth - currentHeading
        );


    // Tampilkan selisih

    const differenceElement =
        document.getElementById("difference");

    if (differenceElement) {

        let displayDifference = difference;

        if (displayDifference > 180) {
            displayDifference =
                displayDifference - 360;
        }

        differenceElement.textContent =
            displayDifference.toFixed(1) + "°";
    }


    // GERAKKAN JARUM

    const needle =
        document.getElementById("needle");

    if (needle) {

        needle.style.transform =
            `rotate(${difference}deg)`;
    }


    document.getElementById("status").textContent =
        "Kompas aktif — arahkan jarum ke kiblat.";
}


// ===============================
// MULAI KOMPAS
// ===============================

async function startCompass() {

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


        // Sensor absolut
        window.addEventListener(
            "deviceorientationabsolute",
            handleOrientation,
            true
        );


        // Sensor umum
        window.addEventListener(
            "deviceorientation",
            handleOrientation,
            true
        );


        document.getElementById("status").textContent =
            "Sensor kompas aktif. Putar HP perlahan...";
    }

    catch (error) {

        document.getElementById("status").textContent =
            "Sensor kompas tidak dapat digunakan.";
        
        console.error(error);
    }
}


// ===============================
// MULAI GPS
// ===============================

function startGPS() {

    if (!navigator.geolocation) {

        document.getElementById("status").textContent =
            "Browser tidak mendukung GPS.";

        return;
    }


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
// TOMBOL MULAI
// ===============================

document
    .getElementById("startButton")
    .addEventListener("click", async function () {

        document.getElementById("status").textContent =
            "Memulai GPS dan kompas...";

        startGPS();

        await startCompass();

    });
document.getElementById("earthButton").addEventListener("click", function () {

    if (currentLatitude === null || currentLongitude === null) {
        alert("Lokasi GPS belum tersedia. Jalankan GPS terlebih dahulu.");
        return;
    }

    const earthURL =
        "https://earth.google.com/web/search/" +
        currentLatitude + "," + currentLongitude;

    window.open(earthURL, "_blank");
});