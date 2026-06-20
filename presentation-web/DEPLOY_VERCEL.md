# Nasazeni na Vercel

## 1. Nahraj kod na GitHub

Pokud jeste repo nemas:

```powershell
cd C:\Osobní\Codex\CBFBasketStats
git init
git add .
git commit -m "Add presentation web for Vercel"
git branch -M main
git remote add origin https://github.com/TVOJE_JMENO/TVOJE_REPO.git
git push -u origin main
```

Pokud uz repo mas:

```powershell
cd C:\Osobní\Codex\CBFBasketStats
git add .
git commit -m "Add presentation web for Vercel"
git push
```

## 2. Vercel projekt

1. Prihlas se do Vercelu.
2. Klikni na `Add New -> Project`.
3. Vyber GitHub repo s projektem.
4. Pri importu nastav:

- `Root Directory`: `CBFBasketStats/presentation-web`
  pokud mas repo otevrene od `C:\Osobní\Codex`, nebo
- `presentation-web`
  pokud je root repa primo `CBFBasketStats`

Vercel by mel sam rozpoznat Next.js.

## 3. Environment variables

Ve Vercelu nastav:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PRESENTATION_CLUB_NAME`

Doporucena hodnota:

```text
PRESENTATION_CLUB_NAME=BK Skokani Brno, z. s.
```

## 4. Deploy

Klikni na `Deploy`.

Po uspesnem deployi dostanes adresu ve tvaru:

```text
something.vercel.app
```

## 5. Vlastni domena

1. Ve Vercelu otevri projekt.
2. Jdi do `Settings -> Domains`.
3. Pridej:

```text
skokani-stats.d-a-g.name
```

4. Vercel ti ukaze DNS zaznam, obvykle:

- `CNAME` pro `skokani-stats`
- nebo `A` zaznam podle typu konfigurace

## 6. DNS u Ceskeho hostingu

V administraci domeny `d-a-g.name` nastav presne to, co ukaze Vercel.

Typicky:

- host: `skokani-stats`
- typ: `CNAME`
- cil: hodnota z Vercelu

## 7. Hotovo

Po propagaci DNS pobezi web na:

- `https://skokani-stats.d-a-g.name`

## Poznamka k bezpecnosti

`SUPABASE_SERVICE_ROLE_KEY` je serverovy tajny klic:

- nepatri do browseru
- nepatri do verejneho repa
- nastavuje se pouze ve Vercel environment variables
