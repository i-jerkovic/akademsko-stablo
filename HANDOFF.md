# Predaja projekta: Akademsko stablo Hrvatske

Datum: 13. 11. 2026.

## Cilj

Statična GitHub Pages stranica akademske genealogije iz doktorskih radova. Magistarski radovi se ne koriste. Glavni prikaz je klasično akademsko obiteljsko stablo (mentori iznad, odabrana osoba u sredini, doktorandi ispod). Ispod stabla treba dodati pravu klastersku mrežnu analizu po uzoru na mrežna istraživanja prezimena.

## Lokacije

- Projekt: `C:\Users\Korisnik\akademsko-stablo`
- Izvorni Excel: `C:\Users\Korisnik\Downloads\DR_SVI_metapodaci.xlsx`
- Generator podataka: `scripts\build_data.py`
- Završni dosadašnji ZIP: `C:\Users\Korisnik\Downloads\akademsko-stablo-GITHUB-v4.zip`
- GitHub: https://github.com/i-jerkovic/akademsko-stablo
- GitHub Pages: https://i-jerkovic.github.io/akademsko-stablo/

## Trenutačne datoteke

- `index.html`
- `styles.css`
- `app.js`
- `data.json`
- `scripts/build_data.py`
- `.nojekyll`
- `README.md`
- `DESIGN_RULES.md`

## Stanje podataka

- 10.764 jedinstvena doktorska rada
- 10.779 redaka repozitorija
- 16.154 osobe
- 13.701 veza
- 15 spojenih duplikata zapisa
- 171 dvosmisleno ime autora
- Provjera svih veza: 0 pogrešaka dvosmjernosti

Model razlikuje osobe istog imena. Prednost imaju ORCID, CroRIS i MBZ; bez identifikatora koriste se stabilni profili izvedeni iz rada. Odnosi se grade samo iz kuriranih stupaca `Mentor` i `Komentor_sumentor`. Organizacije iz sirovog MODS-a ne smiju postati osobe.

Poznati testovi:

- Šimun Anđelinović: MBZ 134023
- Ivan Jerković, rad iz 2019.: `work:4dc32735a3cabc`; mentor Šimun Anđelinović, komentor Anamarija Kurilić
- Drugi Ivan Jerković, medicinski rad iz 2025.: `work:34fab0283d6ccf`; ne smije se spojiti s prvim
- Ivan Buljan mora imati mentoricu Anu Marušić, a ne organizaciju Hrvatska zaklada za znanost

## Dizajn

Svečan, arhivski i suvremen dizajn inspiriran Acta Croatica: tamno bordo, prigušeno zlato, papir/pergament, Libre Caslon Display i Source Sans 3. Izbjegavati generički AI izgled. Obiteljsko stablo mora ostati prvi i glavni prikaz.

## Što je sada implementirano

Ispod stabla postoji radijalna ego-mreža prve i druge razine. Ona je samo privremeni prikaz i NIJE prava klasterska mrežna analiza. `app.js` je prepisan ASCII izvorom s Unicode escapeovima kako se hrvatski statični tekst ne bi oštetio. JavaScript prolazi `node --check app.js`.

## Sljedeći zadatak: prava klasterska mrežna analiza

Zadržati obiteljsko stablo gore. Ispod njega zamijeniti jednostavnu radijalnu ego-mrežu istraživačkim mrežnim prikazom s ovim svojstvima:

1. Koristiti dovoljno široku mrežu odabrane osobe: njezinu povezanu akademsku komponentu ili smisleno ograničen podgraf, ne samo dva pravilna kruga.
2. Force-directed raspored, bez kružnog/radijalnog rasporeda.
3. Automatsko otkrivanje zajednica/klastera, primjerice Louvain ili Leiden. Za potpuno statičnu GitHub Pages stranicu algoritam se može provesti unaprijed u Python generatoru, a rezultate spremiti u `data.json`.
4. Klasteri moraju imati stabilne identifikatore i različite, pristupačne boje.
5. Veličina čvora prema degreeu ili drugoj jasno navedenoj mjeri.
6. Izračunati i prikazati najmanje: degree, betweenness centrality, closeness centrality, community/cluster ID i veličinu komponente. Poželjno: eigenvector/PageRank ako je smisleno.
7. Jasno razlikovati mentorstvo i komentorstvo; usmjerenje veze može se prikazati strelicom ili objasniti u legendi.
8. Označiti ključne mostove među klasterima prema betweennessu, bez proglašavanja toga “utjecajem”.
9. Klik na čvor postavlja tu osobu u središte cijele stranice i ponovno crta stablo, detalje i mrežni kontekst.
10. Dodati istraživački sažetak za osobu: pripadni klaster, broj izravnih veza, položaj u komponenti, najbliži klasteri i eventualna uloga mosta.
11. Omogućiti zumiranje, pomicanje i vraćanje prikaza; mreža mora ostati čitljiva na mobitelu.
12. Ne izmišljati veze ni metrike. Jasno navesti da mreža opisuje samo odnose zabilježene u izvornoj zbirci.

Prije izbora algoritma treba analizirati veličine povezanih komponenti i gustoću cijelog grafa. Ako je najveća komponenta prevelika za preglednik, globalne metrike i klastere izračunati unaprijed, a u pregledniku crtati lokalni podgraf klastera i susjednih klastera uz kontrolirano ograničenje čvorova.

## Završna provjera

- ponovno pokrenuti generator ako se promijeni format `data.json`
- provjeriti dvosmjernost svih mentor/doktorand veza
- `node --check app.js`
- lokalno poslužiti preko HTTP-a jer `fetch(data.json)` ne radi pouzdano otvaranjem `file://index.html`
- pregledati nekoliko velikih i malih mreža
- izraditi novi ZIP preko .NET `System.IO.Compression` s datotekama izravno u korijenu arhive
- otvoriti ZIP i provjeriti popis stavki prije predaje

## Važna tehnička napomena

U ovom Windows okruženju `apply_patch` ne radi jer nedostaje `codex-windows-sandbox-setup.exe`. Dosadašnje izmjene rađene su pomoću PowerShell `[IO.File]::WriteAllText(..., UTF8Encoding(false))`. PowerShell `Get-Content` može pogrešno prikazati UTF-8 bez BOM-a; to ne znači nužno da su bajtovi u `data.json` oštećeni.
## Ažuriranje rada — identiteti, mreža i dizajn

- Dragan Primorac bio je primjer općeg problema: profil `mbz:212641` i `mentor-name:*` istog imena nastali su zato što neki mentorski zapisi imaju identifikator, a drugi ga nemaju.
- Generator sada globalno spaja mentorski profil bez identifikatora s jedinim identificiranim mentorskim profilom potpuno istog normaliziranog imena. Ne spaja dva različita identificirana profila niti doktorske autore samo prema imenu.
- Prva ponovna izgradnja smanjila je broj osoba s 16.154 na 15.519 i zadržala 0 pogrešaka dvosmjernosti. Pronađeno je devet samoveza nastalih spajanjem; generator je dopunjen pravilom koje ih odbacuje prije gradnje grafa.
- Dodan je NetworkX. Generator unaprijed računa povezane komponente, Louvain zajednice, degree, betweenness i closeness. Za velike komponente betweenness i closeness računaju se determinističkom aproksimacijom radi prihvatljivog vremena izgradnje.
- Najveća komponenta prije konačnog ponovnog izvoza ima 5.664 osobe; zato preglednik ne smije crtati cijelu komponentu, nego odabrani klaster i reprezentativne veze prema susjednim klasterima uz jasno ograničenje.
- Dizajnersko pravilo korisnika: bez ljubičastih gradijenata, glassmorphisma, pretjerano zaobljenih kutova, nepotrebnih sjena, generičkih ikona, golemih naslova, nizova jednakih kartica/kućica i prepoznatljivog AI/Codex predloška. Dopušteni i poželjni su napredni SVG, Canvas/WebGL, kvalitetne generirane teksture/ilustracije i originalna kompozicija kada povećavaju funkcionalnost i vizualnu kvalitetu.
- Ciljani mrežni prikaz: premium interaktivni kartografski atlas akademskih loza, force-directed, s organskim snopovima veza, klasterima kodiranim profinjenom paletom, zumiranjem/pomicanjem, tipografskim oznakama i stvarnim metrikama. Generirana raster-grafika smije biti samo pozadinski/autorski materijal; podaci moraju ostati interaktivni SVG/Canvas sloj.
- Korisnik traži da se `HANDOFF.md` ažurira kontinuirano nakon svake bitne odluke ili izmjene.
- Trajno sadržajno pravilo: ni u placeholderu, uputama ni demonstracijama ne isticati nijednu stvarnu osobu kao primjer. Pretraga koristi neutralni tekst 'Upišite ime i prezime'. Kontrolna imena smiju ostati samo u internim tehničkim testovima, nikada u javnom sučelju.
- Implementiran je D3 v7 force-directed prikaz umjesto radijalne ego-mreže. Podgraf prioritizira odabrani Louvain klaster, izravne veze i mostove prema susjednim klasterima; ograničenje je 132 čvora na desktopu i 72 na mobitelu.
- Mreža sada ima zoom/pan, povlačenje čvorova, reset prikaza, uključivanje svih oznaka, konveksne obrise zajednica, veličinu čvora prema degreeu i sažetak komponentne/klasterske pripadnosti i betweennessa. Klik čvora mijenja osobu u cijeloj stranici.
- Vizual mreže preoblikovan je kao akademski kartografski atlas: pergamentna mreža, organski obrisi zajednica, prigušena višebojna paleta bez ljubičastog gradijenta/glassmorphisma/kartičnog dashboarda, bez nepotrebnih sjena.
- Mobilno pravilo: zasebno ograničenje broja čvorova, touch-action za pinch/pan, veće oznake i dodirne mete, horizontalno pomicanje stabla, prelomljeni uvod i najmanje tri ciljane širine za završnu provjeru (mobitel/tablet/desktop).
- `index.html` učitava D3 v7 s jsDelivr CDN-a prije `app.js`.- Završna globalna provjera nakon ponovne izgradnje: 15.519 osoba, 13.689 veza, 0 pogrešaka dvosmjernosti, 0 samoveza, 3.374 Louvain zajednice, najveća komponenta 5.664 osobe.
- Ostalo je 248 skupina potpuno istih normaliziranih imena; 73 su samo mentorski profili. Ne spajati ih slijepo: nakon sigurnog spajanja preostale skupine uglavnom imaju više različitih/konfliktnih identifikatora i moraju ostati razdvojene bez dodatnog dokaza.
- Profil sada sadrži tekstualni mrežni sažetak: klaster, veličina komponente, degree i oprezno opisanu ulogu poveznice prema betweennessu. Ne koristi riječ "utjecaj".
- ImageGen je izradio originalnu arhivsko-kartografsku teksturu bez teksta i UI elemenata. Projektna kopija: assets/academic-network-atlas.png. CSS je koristi ispod prozirnog pergamentnog sloja u mrežnom atlasu; interaktivni SVG ostaje iznad nje.
