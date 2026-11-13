# Akademsko stablo

Statička, pretraživa vizualizacija hrvatske akademske genealogije na temelju doktorskih radova. Projekt ne uključuje magistarske radove.

## Lokalno pokretanje

```powershell
python -m http.server 8000
```

Zatim otvorite `http://localhost:8000` iz mape projekta. Stranica ne radi ispravno ako se `index.html` otvori izravno kao `file://`, jer preglednik tada blokira učitavanje JSON podataka.

## GitHub Pages

1. Objavite sadržaj ove mape u GitHub repozitoriju.
2. U **Settings → Pages** odaberite **Deploy from a branch**.
3. Odaberite granu `main` i mapu `/ (root)`.

Nisu potrebni build alati ni poslužiteljska baza podataka.

## Obnova podataka

Put do izvornog XLSX-a definiran je u `scripts/build_data.py`. Pokrenite:

```powershell
python scripts/build_data.py
```

Skripta uzima samo zapise čija je službena vrsta publikacije `Doktorski rad`, razdvaja više mentora znakom `|` i generira `data.json`.
