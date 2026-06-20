# Supabase workflow pro tento projekt

Pro další změny databáze je lepší nepoužívat ruční klikání v dashboardu, ale:

1. upravit SQL migraci v editoru
2. commitnout ji do gitu
3. nasadit ji přes Supabase CLI

## Doporučený postup

### 1. Přihlášení do CLI

```powershell
supabase login
```

### 2. Link na existující projekt

```powershell
supabase link --project-ref qwalzqjcwljvhhpnwyqu
```

CLI si případně řekne o heslo databáze.

### 3. Uložení změn jako migrace

Migrace patří do:

- `supabase/migrations`

### 4. Nasazení migrací do Supabase

```powershell
supabase db push
```

### 5. Kontrola stavu migrací

```powershell
supabase migration list
```

## Důležitá poznámka

Protože první schema už bylo spuštěno ručně v dashboardu, je potřeba ten stav sladit s lokálními migracemi. Nejbezpečnější další krok je:

1. vytvořit lokální repozitář projektu
2. nainstalovat Supabase CLI
3. linknout projekt
4. stáhnout aktuální remote schema do migrace nebo ručně označit první migraci jako již aplikovanou

To už uděláme podle toho, jaký způsob chceš zvolit.
