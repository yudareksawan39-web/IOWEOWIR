// ======================================================
// PANRITA FALAK
// GPS + KOMPAS + KIBLAT + JARAK KA'BAH
// GOOGLE EARTH + JAM REAL-TIME + WAKTU SALAT
// ======================================================

const KAABAH_LAT = 21.422487;
const KAABAH_LON = 39.826206;

let currentLatitude = null;
let currentLongitude = null;

let qiblaAzimuth = null;
let currentHeading = null;

let gpsStarted = false;
let compassStarted = false;

let filteredHeading = null;
let absoluteHeadingReceived = false;


// ======================================================
// MATEMATIKA DASAR
// ======================================================

function toRadians(deg) {
    return deg * Math.PI / 180;
}

function toDegrees(rad) {
    return rad * 180 / Math.PI;
}

function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}


// ======================================================
// HITUNG ARAH KIBLAT
// ======================================================

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

    return normalizeAngle(
        toDegrees(Math.atan2(y, x))
    );
}


// ======================================================
// HITUNG JARAK KE KA'BAH
// ======================================================

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
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}


// ======================================================
// GPS
// ======================================================

function updateGPS(position) {

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    currentLatitude = lat;
    currentLongitude = lon;

    const latitudeElement =
        document.getElementById("latitude");

    const longitudeElement =
        document.getElementById("longitude");

    const accuracyElement =
        document.getElementById("accuracy");

    if (latitudeElement) {
        latitudeElement.textContent =
            lat.toFixed(6) + "°";
    }

    if (longitudeElement) {
        longitudeElement.textContent =
            lon.toFixed(6) + "°";
    }

    if (accuracyElement) {
        accuracyElement.textContent =
            "± " + accuracy.toFixed(1) + " m";
    }


    // -----------------------------
    // KIBLAT
    // -----------------------------

    qiblaAzimuth =
        calculateQibla(lat, lon);

    const qiblaElement =
        document.getElementById("qibla");

    if (qiblaElement) {
        qiblaElement.textContent =
            qiblaAzimuth.toFixed(1) + "°";
    }


    // -----------------------------
    // JARAK
    // -----------------------------

    const distance =
        calculateDistance(
            lat,
            lon,
            KAABAH_LAT,
            KAABAH_LON
        );

    const distanceElement =
        document.getElementById("distance");

    if (distanceElement) {
        distanceElement.textContent =
            distance.toFixed(1) + " km";
    }


    // -----------------------------
    // WAKTU SALAT
    // -----------------------------

    
calculatePrayerTimes(
    lat,
    lon
);


// -----------------------------
// STATUS
// -----------------------------

const status =
    document.getElementById("status");

if (status) {
    status.textContent =
        "✓ GPS aktif — waktu salat berhasil dihitung.";
}


if (currentHeading !== null) {
    updateNeedle();
}


function gpsError(error) {

    const status =
        document.getElementById("status");

    if (status) {

        status.textContent =
            "GPS error: " + error.message;
    }

    console.error("GPS ERROR:", error);
}


function startGPS() {

    if (!navigator.geolocation) {

        const status =
            document.getElementById("status");

        if (status) {
            status.textContent =
                "Browser tidak mendukung GPS.";
        }

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


// ======================================================
// KOMPAS
// ======================================================

function smoothHeading(newHeading) {

    newHeading =
        normalizeAngle(newHeading);

    if (filteredHeading === null) {

        filteredHeading =
            newHeading;

        return filteredHeading;
    }

    let difference =
        normalizeAngle(
            newHeading -
            filteredHeading
        );

    if (difference > 180) {
        difference -= 360;
    }

    const smoothing = 0.18;

    filteredHeading =
        normalizeAngle(
            filteredHeading +
            difference * smoothing
        );

    return filteredHeading;
}


function handleOrientation(event) {

    let heading = null;


    // -----------------------------
    // iPhone / Safari
    // -----------------------------

    if (
        typeof event.webkitCompassHeading === "number" &&
        !isNaN(event.webkitCompassHeading)
    ) {

        heading =
            event.webkitCompassHeading;
    }


    // -----------------------------
    // SENSOR ABSOLUT
    // -----------------------------

    else if (
        event.absolute === true &&
        typeof event.alpha === "number"
    ) {

        heading =
            360 - event.alpha;

        absoluteHeadingReceived = true;
    }


    // -----------------------------
    // FALLBACK
    // -----------------------------

    else if (
        !absoluteHeadingReceived &&
        typeof event.alpha === "number"
    ) {

        heading =
            360 - event.alpha;
    }


    if (
        heading === null ||
        isNaN(heading)
    ) {
        return;
    }


    heading =
        normalizeAngle(heading);

    currentHeading =
        smoothHeading(heading);


    const headingElement =
        document.getElementById("heading");

    if (headingElement) {

        headingElement.textContent =
            currentHeading.toFixed(1) + "°";
    }


    updateNeedle();
}


// ======================================================
// JARUM KIBLAT
// ======================================================

function updateNeedle() {

    if (
        qiblaAzimuth === null ||
        currentHeading === null
    ) {
        return;
    }


    let difference =
        normalizeAngle(
            qiblaAzimuth -
            currentHeading
        );


    let displayDifference =
        difference;

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

        if (
            Math.abs(displayDifference) <= 3
        ) {

            status.textContent =
                "✓ ARAH KIBLAT TERCAPAI";

        } else {

            status.textContent =
                "Arahkan jarum ke kiblat.";
        }
    }
}


// ======================================================
// IZIN SENSOR KOMPAS
// ======================================================

async function startCompass() {

    if (compassStarted) {
        return;
    }

    try {

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
            "Kompas aktif. Putar HP perlahan untuk kalibrasi.";

    } catch (error) {

        console.error(error);

        document.getElementById("status").textContent =
            "Sensor kompas tidak dapat digunakan.";
    }
}


// ======================================================
// TOMBOL GPS + KOMPAS
// ======================================================

const startButton =
    document.getElementById("startButton");

if (startButton) {

    startButton.addEventListener(
        "click",
        async function () {

            const status =
                document.getElementById("status");

            if (status) {
                status.textContent =
                    "Memulai GPS dan kompas...";
            }

            startGPS();

            await startCompass();
        }
    );
}


// ======================================================
// GOOGLE EARTH
// ======================================================

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


// ======================================================
// JAM REAL-TIME
// ======================================================

function updateRealTimeClock() {

    const now =
        new Date();

    const hours =
        String(now.getHours())
            .padStart(2, "0");

    const minutes =
        String(now.getMinutes())
            .padStart(2, "0");

    const seconds =
        String(now.getSeconds())
            .padStart(2, "0");


    const clock =
        document.getElementById(
            "realTimeClock"
        );

    if (clock) {

        clock.textContent =
            `${hours}:${minutes}:${seconds}`;
    }


    updateNextPrayer();
}


updateRealTimeClock();

setInterval(
    updateRealTimeClock,
    1000
);


// ======================================================
// PERHITUNGAN WAKTU SALAT
// ======================================================

// Parameter waktu
const PRAYER_ANGLES = {

    fajr: 20,       // Kemenag
    sunrise: 0.833,
    sunset: 0.833,
    isha: 18,       // Kemenag
    dhuhr: 0

};


// ======================================================
// JULIAN DAY
// ======================================================

function julianDate(date) {

    const year =
        date.getUTCFullYear();

    const month =
        date.getUTCMonth() + 1;

    const day =
        date.getUTCDate();


    let Y = year;
    let M = month;

    if (M <= 2) {
        Y -= 1;
        M += 12;
    }


    const A =
        Math.floor(Y / 100);

    const B =
        2 -
        A +
        Math.floor(A / 4);


    return Math.floor(
        365.25 * (Y + 4716)
    )
    +
    Math.floor(
        30.6001 * (M + 1)
    )
    +
    day +
    B -
    1524.5;
}


// ======================================================
// POSISI MATAHARI
// ======================================================

function solarPosition(date) {

    const jd =
        julianDate(date);

    const D =
        jd - 2451545.0;


    const g =
        normalizeAngle(
            357.529 +
            0.98560028 * D
        );


    const q =
        normalizeAngle(
            280.459 +
            0.98564736 * D
        );


    const L =
        normalizeAngle(
            q +
            1.915 * Math.sin(toRadians(g)) +
            0.020 *
            Math.sin(toRadians(2 * g))
        );


    const e =
        23.439 -
        0.00000036 * D;


    const RA =
        toDegrees(
            Math.atan2(
                Math.cos(toRadians(e)) *
                Math.sin(toRadians(L)),
                Math.cos(toRadians(L))
            )
        ) / 15;


    const declination =
        toDegrees(
            Math.asin(
                Math.sin(toRadians(e)) *
                Math.sin(toRadians(L))
            )
        );


    const rightAscension =
        normalizeAngle(RA * 15) / 15;


    const GMST =
        18.697374558 +
        24.06570982441908 * D;


    const equationOfTime =
        normalizeHours(
            GMST -
            rightAscension
        );


    return {
        declination,
        equationOfTime
    };
}


function normalizeHours(hours) {

    let result =
        hours % 24;

    if (result < 0) {
        result += 24;
    }

    return result;
}


// ======================================================
// SUDUT MATAHARI
// ======================================================

function solarHourAngle(
    latitude,
    declination,
    altitude
) {

    const lat =
        toRadians(latitude);

    const dec =
        toRadians(declination);

    const alt =
        toRadians(altitude);


    const cosH =
        (
            Math.sin(alt) -
            Math.sin(lat) *
            Math.sin(dec)
        )
        /
        (
            Math.cos(lat) *
            Math.cos(dec)
        );


    if (cosH < -1 || cosH > 1) {
        return null;
    }


    return toDegrees(
        Math.acos(cosH)
    );
}


// ======================================================
// WAKTU SALAT
// ======================================================

function calculatePrayerTimes(
    latitude,
    longitude
) {

    const now =
        new Date();


    const solar =
        solarPosition(now);


    const declination =
        solar.declination;


    const equationOfTime =
        solar.equationOfTime;


    // Zona waktu perangkat
    const timezone =
        -now.getTimezoneOffset() / 60;


    // Tengah hari matahari
    const solarNoon =
        12 -
        equationOfTime -
        longitude / 15 +
        timezone;


    // Subuh
    const fajrAngle =
        solarHourAngle(
            latitude,
            declination,
            -PRAYER_ANGLES.fajr
        );


    // Terbit
    const sunriseAngle =
        solarHourAngle(
            latitude,
            declination,
            -PRAYER_ANGLES.sunrise
        );


    // Magrib
    const sunsetAngle =
        solarHourAngle(
            latitude,
            declination,
            -PRAYER_ANGLES.sunset
        );


    // Isya
    const ishaAngle =
        solarHourAngle(
            latitude,
            declination,
            -PRAYER_ANGLES.isha
        );


    // Asar - shadow factor 1
    const asrAltitude =
        -toDegrees(
            Math.atan(
                1 /
                (
                    1 +
                    Math.tan(
                        Math.abs(
                            toRadians(
                                latitude -
                                declination
                            )
                        )
                    )
                )
            )
        );


    const asrAngle =
        solarHourAngle(
            latitude,
            declination,
            asrAltitude
        );


    const prayers = {

        subuh:
            fajrAngle === null
                ? null
                : solarNoon -
                  fajrAngle / 15,

        terbit:
            sunriseAngle === null
                ? null
                : solarNoon -
                  sunriseAngle / 15,

        zuhur:
            solarNoon,

        asar:
            asrAngle === null
                ? null
                : solarNoon +
                  asrAngle / 15,

        magrib:
            sunsetAngle === null
                ? null
                : solarNoon +
                  sunsetAngle / 15,

        isya:
            ishaAngle === null
                ? null
                : solarNoon +
                  ishaAngle / 15

    };


    displayPrayerTimes(
        prayers
    );
}


// ======================================================
// FORMAT WAKTU
// ======================================================

function formatPrayerTime(hours) {

    if (
        hours === null ||
        !isFinite(hours)
    ) {

        return "--:--";
    }


    hours =
        normalizeHours(hours);


    const h =
        Math.floor(hours);


    const minutesDecimal =
        (hours - h) * 60;


    const m =
        Math.round(minutesDecimal);


    let finalHour =
        h;

    let finalMinute =
        m;


    if (finalMinute >= 60) {

        finalMinute = 0;

        finalHour++;

    }


    finalHour %= 24;


    return (
        String(finalHour)
            .padStart(2, "0")
        +
        ":"
        +
        String(finalMinute)
            .padStart(2, "0")
    );
}


// ======================================================
// TAMPILKAN WAKTU SALAT
// ======================================================

let prayerTimesToday = null;


function displayPrayerTimes(prayers) {

    prayerTimesToday =
        prayers;


    const mapping = {

        subuh: "subuh",
        terbit: "terbit",
        zuhur: "zuhur",
        asar: "asar",
        magrib: "magrib",
        isya: "isya"

    };


    for (
        const key in mapping
    ) {

        const element =
            document.getElementById(
                mapping[key]
            );


        if (element) {

            element.textContent =
                formatPrayerTime(
                    prayers[key]
                );
        }
    }


    updateNextPrayer();
}


// ======================================================
// WAKTU SALAT BERIKUTNYA
// ======================================================

function updateNextPrayer() {

    if (!prayerTimesToday) {
        return;
    }


    const now =
        new Date();


    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes() +
        now.getSeconds() / 60;


    const prayerNames = {

        subuh: "Subuh",
        zuhur: "Zuhur",
        asar: "Asar",
        magrib: "Magrib",
        isya: "Isya"

    };


    const order = [
        "subuh",
        "zuhur",
        "asar",
        "magrib",
        "isya"
    ];


    let nextPrayer = null;
    let nextMinutes = null;


    for (
        const key of order
    ) {

        const value =
            prayerTimesToday[key];


        if (
            value === null ||
            !isFinite(value)
        ) {
            continue;
        }


        if (
            value * 60 >
            currentMinutes
        ) {

            nextPrayer =
                key;

            nextMinutes =
                value * 60;

            break;
        }
    }


    // Jika semua waktu hari ini sudah lewat,
    // berikutnya adalah Subuh besok.
    if (nextPrayer === null) {

        nextPrayer = "subuh";

        nextMinutes =
            prayerTimesToday.subuh * 60
            + 24 * 60;
    }


    const remaining =
        nextMinutes -
        currentMinutes;


    const hours =
        Math.floor(
            remaining / 60
        );


    const minutes =
        Math.floor(
            remaining % 60
        );


    const seconds =
        Math.floor(
            (remaining -
             Math.floor(remaining)) *
            60
        );


    const nextPrayerElement =
        document.getElementById(
            "nextPrayer"
        );


    if (nextPrayerElement) {

        nextPrayerElement.textContent =
            "⏳ Berikutnya: " +
            prayerNames[nextPrayer] +
            " — " +
            formatPrayerTime(
                prayerTimesToday[nextPrayer]
            ) +
            " (" +
            String(hours).padStart(2, "0") +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(seconds).padStart(2, "0") +
            ")";
    }
}