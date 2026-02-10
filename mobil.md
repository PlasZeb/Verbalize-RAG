# Verbalize-RAG Mobil Fejlesztési Állapot (2026.02.10)

## Jelenlegi állapot
A projektet sikeresen felkészítettük a natív mobil (Android/iOS) integrációra és biztonságosabbá tettük a backend architektúrát.

### Elvégzett feladatok:
1.  **Git ág:** Létrehozva a `feature/secure-mobile-backend` ág a kísérleti fejlesztéshez.
2.  **Capacitor integráció:** 
    *   Telepítve a `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` és `@capacitor/ios`.
    *   Inicializálva: `com.verbalizerag.app`.
    *   Natív platformok (android, ios mappák) hozzáadva.
3.  **Biztonságos API Kezelés:**
    *   **Backend:** Új `/api/session-config` végpont hozzáadva a `backend/main.py`-hoz, amely kiszolgálja a szükséges kulcsokat és konfigurációt.
    *   **Frontend:** A `liveClient.ts` és `utils/config.ts` módosítva, hogy induláskor a backendtől kérjék le az API kulcsot, így az nem szivárog ki a kliens kódból.
4.  **Dokumentáció:** `README.md` frissítve a Pinecone és FastAPI részletekkel.

## Technikai részletek a folytatáshoz
*   **Backend:** A FastAPI szervernek futnia kell (`python main.py`), hogy az app működjön.
*   **Mobil elérés:** Ha nem helyi emulátoron tesztelsz, az `utils/config.ts`-ben a `localhost:8000`-et le kell cserélni egy publikus (pl. ngrok) URL-re.
*   **Build folyamat:**
    1. `npm run build`
    2. `npx cap sync`
    3. `npx cap open android` (Android Studio-ban Build -> Build APK).

## Következő lépések (Roadmap):
1.  **APK tesztelése:** Az elkészült APK feltöltése Appetize.io-ra vagy Firebase App Distribution-re.
2.  **Felhasználói Auth:** Clerk vagy Firebase Auth integrálása, hogy ne legyen publikus az API kulcs elérése a végponton.
3.  **Native Permissions:** Mikrofon jogosultságok kezelése Capacitor-ral (Android/iOS specifikus beállítások).
4.  **WebRTC Relay:** Hosszabb távon a hangfolyam biztonságosabb proxy-zása.
