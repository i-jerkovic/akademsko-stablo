# Akademsko stablo

Statička, pretraživa vizualizacija hrvatske akademske genealogije na temelju doktorskih radova. Magistarski radovi nisu uključeni.

Glavni prikaz je proširivo akademsko obiteljsko stablo s kontrolama generacija i akademskom braćom/sestrama. Donji force-directed atlas zasebna je analiza veza zajedničkog mentora i zajedničkog mentorstva; nije kopija obiteljskog stabla.

## Lokalno pokretanje

    python -m http.server 8000

Otvorite http://localhost:8000. Ne testirajte otvaranjem file://index.html jer preglednik može blokirati fetch(data.json).

## Obnova podataka

Generator očekuje oba Excela na putanjama navedenima u scripts/build_data.py: DR_SVI_metapodaci.xlsx i UNIZG_doktorati_7356_zapisa_882_stupca (1).xlsx.

    pip install -r requirements.txt
    python scripts/build_data.py

Generator koristi kurirane stupce Mentor i Komentor_sumentor, konzervativno razdvaja imenjake, gradi dvosmjerne veze te unaprijed računa Louvain zajednice i centralnosti. Affinity brid nastaje samo ako dvije osobe dijele zabilježenog mentora ili su zajedno mentorirale isti doktorski rad. Za velike komponente dio centralnosti računa se determinističkom aproksimacijom.

## GitHub Pages

Objavite sadržaj ZIP-a u korijen repozitorija. U Settings → Pages odaberite Deploy from a branch, granu main i mapu / (root). D3 v7 učitava se preko jsDelivr CDN-a.
