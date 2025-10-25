-- Codenames table and seed + claim/release helpers
create table if not exists codenames (
  name text primary key,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

-- Seed (118 IUPAC element names)
do $$
declare
  elems text[] := array[
    'Hydrogen','Helium','Lithium','Beryllium','Boron','Carbon','Nitrogen','Oxygen','Fluorine','Neon',
    'Sodium','Magnesium','Aluminium','Silicon','Phosphorus','Sulfur','Chlorine','Argon','Potassium','Calcium',
    'Scandium','Titanium','Vanadium','Chromium','Manganese','Iron','Cobalt','Nickel','Copper','Zinc',
    'Gallium','Germanium','Arsenic','Selenium','Bromine','Krypton','Rubidium','Strontium','Yttrium','Zirconium',
    'Niobium','Molybdenum','Technetium','Ruthenium','Rhodium','Palladium','Silver','Cadmium','Indium','Tin',
    'Antimony','Tellurium','Iodine','Xenon','Cesium','Barium','Lanthanum','Cerium','Praseodymium','Neodymium',
    'Promethium','Samarium','Europium','Gadolinium','Terbium','Dysprosium','Holmium','Erbium','Thulium','Ytterbium',
    'Lutetium','Hafnium','Tantalum','Tungsten','Rhenium','Osmium','Iridium','Platinum','Gold','Mercury',
    'Thallium','Lead','Bismuth','Polonium','Astatine','Radon','Francium','Radium','Actinium','Thorium',
    'Protactinium','Uranium','Neptunium','Plutonium','Americium','Curium','Berkelium','Californium','Einsteinium','Fermium',
    'Mendelevium','Nobelium','Lawrencium','Rutherfordium','Dubnium','Seaborgium','Bohrium','Hassium','Meitnerium','Darmstadtium',
    'Roentgenium','Copernicium','Nihonium','Flerovium','Moscovium','Livermorium','Tennessine','Oganesson'
  ];
  e text;
begin
  foreach e in array elems loop
    insert into codenames(name, used) values (e, false)
    on conflict (name) do nothing;
  end loop;
end $$;

-- Claim codename (concurrency-safe)
create or replace function claim_codename() returns text
language plpgsql as $$
declare
  picked text;
  base text;
  try_isotope text;
  attempt int := 0;
begin
  select name into picked
  from codenames
  where used = false
  order by name
  for update skip locked
  limit 1;

  if picked is not null then
    update codenames set used = true, claimed_at = now() where name = picked;
    return picked;
  end if;

  select name into base from codenames order by name limit 1 offset (floor(random()*117))::int;
  if base is null then base := 'Element'; end if;

  while attempt < 50 loop
    try_isotope := base || '-' || (10 + (random()*300))::int;
    begin
      insert into codenames(name, used, claimed_at) values (try_isotope, true, now());
      return try_isotope;
    exception when unique_violation then
      attempt := attempt + 1;
    end;
  end loop;

  try_isotope := base || '-' || left(replace(gen_random_uuid()::text,'-',''), 6);
  insert into codenames(name, used, claimed_at) values (try_isotope, true, now());
  return try_isotope;
end $$;

create or replace function release_codename(p_name text) returns void
language sql as $$
  update codenames set used = false, claimed_at = null where name = p_name;
$$;

create or replace view codename_stats as
select
  count(*) filter (where used=false) as available,
  count(*) filter (where used=true)  as claimed,
  count(*) as total
from codenames;