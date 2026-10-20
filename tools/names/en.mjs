/* en.mjs — Arabic naming page (English)
 *
 * One file per language, rendered by tools/build-names.mjs. `ui` is the
 * shared chrome (nav, footer, CTA) and matches the wording in
 * tools/guides/en.mjs; `page` is everything specific to this page.
 *
 * `page.app` is handed to assets/js/names.js as JSON — every string the
 * generator prints at runtime lives there, with {n} style placeholders.
 *
 * Editorial rules:
 *   1. Meanings are dictionary meanings, not flattering glosses.
 *   2. Where scholars differ, say so. Where they are agreed, say that too.
 *   3. Transliterations stay plain ASCII — see the spelling section for why.
 *
 * The faq entries are also emitted as FAQPage structured data, so each
 * answer has to stand on its own — no "as explained above".
 */

import { AR } from '../lib/hadith.mjs';

export const ui = {
  navHome: 'Home',
  navGuide: 'Fiqh Guide',
  navNames: 'Names',
  navDownload: 'Download',
  alsoIn: 'Also in:',
  updated: 'Last updated',
  faqTitle: 'Common questions',
  relatedTitle: 'Related answers',
  ctaTitle: 'Prayer times for the child you are naming',
  ctaBody: 'NoorWaqt computes prayer times on your phone for any point on earth, in 44 languages, with the madhhab you follow. No account, nothing uploaded.',
  ctaBtn: 'Get NoorWaqt (Android, free)',
  footerFiqh: 'Fiqh content is for study. For a binding ruling, ask a qualified scholar.',
  footerPrivacy: 'The app runs on your device. We never collect your personal records.',
};

export const page = {
  updated: '2026-10-20',
  crumb: 'Arabic Names',

  title: 'Arabic Name Generator — 216 Names With Their Real Meanings',
  desc: 'Generate Arabic and Muslim names by theme, see the Arabic script, the transliteration you can actually put on a passport, and the literal meaning. Plus how an Arabic name is built, and which names are not allowed.',
  h1: 'Arabic name generator, with the meanings spelled out',
  lead: '216 names — 125 for boys, 91 for girls — each with the Arabic script, a transliteration that survives a passport form, and the **literal** meaning rather than a flattering gloss. Filter by theme, and the generator will compose a full classical name for you.',

  reviewNotice: 'The meanings here are literal ones — what the word says, not what the name is taken to promise. The rulings in the lower half of this page are study material and **do not replace a ruling from a qualified scholar**: if a specific name is disputed in your family or your community, ask locally. Corrections to any entry are welcome.',
  disclaimer: 'Every ruling on this page is given with the narration it rests on — Sahih al-Bukhari, Sahih Muslim, Abu Dawud, Tirmidhi — so you can check it instead of taking our word for it. If you find an error in a meaning or in how something is stated here, please write in: these pages are revised as corrections come.',

  // ── 生成器界面 ──
  toolTitle: 'Generate a name',
  labelFor: 'For',
  forAny: 'Either',
  forBoy: 'A boy',
  forGirl: 'A girl',
  labelThemes: 'Themes',
  themesNote: '(pick any; leave empty for all)',
  labelFather: 'Name of the father — optional, builds the lineage',
  fatherPlaceholder: 'e.g. Ibrahim',
  goBtn: 'Generate six names',

  // ── 名字库界面 ──
  searchPlaceholder: 'Search names, meanings, themes…',
  searchLabel: 'Search all names',
  colArabic: 'Arabic',
  colTranslit: 'Transliteration',
  colMeaning: 'Meaning',
  colFor: 'For',

  /** 交给 names.js 的运行时文案 */
  app: {
    boy: 'boy',
    girl: 'girl',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    matchCount: '{n} names match your filters',
    noMatch: 'No name in the list matches that combination. Drop a theme and try again.',
    tableAll: 'All {n} names',
    tableSome: '{k} of {n} names',
    tableEmpty: 'Nothing matches that.',
    fatherUnknown: 'Not in the list, so the lineage is left out of the Arabic. Pick a name from the table below.',
    fatherReading: 'Reading that as {name} {ar}.',
  },

  body: `
## How an Arabic name is actually built

Most of the confusion around Arabic names comes from treating them like a first name plus a surname. Classically they are a chain of up to five parts, and only the first is a given name:

- **Ism** — the given name. *Muhammad*, *Fatima*. This is what the generator above picks.
- **Nasab** — the lineage, introduced by *bin*/*ibn* (son of) or *bint* (daughter of), and extendable back through grandfathers.
- **Kunya** — *Abu* (father of) or *Umm* (mother of) plus the eldest child's name. It is a form of respect, and in most societies it arrives with the first child — though not always: the Prophet (peace be upon him) addressed a small boy who had no children at all as *Abu Umayr* (Sahih al-Bukhari 6129).
- **Laqab** — an epithet earned later: *al-Rashid*, *al-Siddiq*.
- **Nisba** — an adjective of belonging: a place, a tribe, a trade. *al-Baghdadi*, *al-Shafi‘i*.

> The Prophet (peace be upon him) said: O Abu Umayr, what did the little bird do?
>> ${AR['bukhari-6129']}
> — Narrated by Anas ibn Malik, from the Prophet (peace be upon him) speaking to Anas’s young brother; Sahih al-Bukhari 6129

Put together: **Abu Abdullah Muhammad bin Idris al-Shafi‘i** — kunya, ism, nasab, nisba. One man, and not a single part of it is a surname in the modern sense.

A newborn needs only the ism. The nasab follows from the father's name automatically, and the kunya comes decades later. That is why the generator asks for the father's name and nothing else.

## The rules that actually constrain the choice

Naming is broad: the default is that any name with a sound meaning is allowed. Four points narrow it.

### 1. Two names are singled out

> The Prophet (peace be upon him) said: The most beloved of your names to Allah are Abdullah and Abd al-Rahman.
>> ${AR['muslim-2132']}
> — Narrated by Ibn Umar, from the Prophet (peace be upon him); Sahih Muslim 2132

This is a recommendation, not a restriction on everything else. Naming after a prophet is encouraged too, but it rests on separate evidence, not on this hadith: the Prophet (peace be upon him) named his own newborn son after Ibrahim (Sahih Muslim 2315).

> The Prophet (peace be upon him) said: A child was born to me tonight, and I named him after my father Ibrahim.
>> ${AR['muslim-2315']}
> — Narrated by Anas ibn Malik, from the Prophet (peace be upon him); Sahih Muslim 2315

“My father Ibrahim” is the Prophet Ibrahim (Abraham, peace be upon him). The Prophet Muhammad (peace be upon him) descended from Ibrahim through his son Ismail, and Arabic uses *ab* (father) for a forefather as well. The speaker is the Prophet himself and the newborn was his own son — the biographies record his mother as Maria al-Qibtiyya — who was given the forefather’s name.

### 2. Allah's exclusive names are not given to a person on their own

Names that belong only to Allah are used in the *Abd al-* (servant of) form. The name without the servitude is not given:

[[solo]]

The distinction is the definite article and the exclusivity. **Karim**, **Rashid**, **Hakim** and **Malik** describe people too, so they are given as names freely; *al-Karim*, *al-Rahman* and *al-Khaliq* as titles are not. And the servitude runs one way only — *Abd* compounded with anything other than Allah (Abd al-Nabi, Abd al-Husayn, Abd al-Masih) is rejected by the overwhelming majority of scholars, because servitude is owed to Allah alone.

On the same principle, the Prophet (peace be upon him) warned against taking the name *Malik al-Amlak* — king of kings. Two narrations, worded a little differently:

> The Prophet (peace be upon him) said: The most awful name in Allah’s sight on the Day of Resurrection will be a man calling himself Malik al-Amlak (king of kings).
>> ${AR['bukhari-6205']}
> — Narrated by Abu Huraira, from the Prophet (peace be upon him); Sahih al-Bukhari 6205

> The Prophet (peace be upon him) said: The vilest name in Allah’s sight is a man who calls himself Malik al-Amlak (king of kings).
>> ${AR['muslim-2143']}
> — Narrated by Abu Huraira, from the Prophet (peace be upon him); Sahih Muslim 2143

Muslim's own chapter heading covers both forms of it, *Malik al-Amlak* and *Malik al-Muluk*.

### 3. Names that praise their bearer were changed

Zaynab bint Abi Salama was named *Barra* — "the pious one". The Prophet (peace be upon him) renamed her, and the reason is his own wording: do not claim purity for yourselves, Allah knows best who among you is truly pious (Sahih Muslim 2142b). A woman named *‘Asiya* — عاصية, "disobedient" — he renamed *Jamila* (Sahih Muslim 2139). That is not the *Asiya* in the table below: آسية, the wife of Pharaoh, is a different word that happens to reach English with the same spelling.

> The Prophet (peace be upon him) said: Do not claim purity for yourselves; Allah knows best who among you are the people of righteousness.
>> ${AR['muslim-2142b']}
> — Narrated by Zaynab bint Abi Salama, from the Prophet (peace be upon him); Sahih Muslim 2142b

> The Messenger of Allah (peace be upon him) changed the name of ‘Asiya (“Disobedient”) and said: You are Jamila.
>> ${AR['muslim-2139']}
> — Ibn Umar, Sahih Muslim 2139

Two tests can be put to any name, though they are not equally firm.

**The meaning must not be an ugly one** — this one is not disputed; the Prophet (peace be upon him) changed "disobedient" to "beautiful".

**A name should not treat its bearer's piety as a settled fact** — this is what the Barra case turns on, and the reason is stated in the hadith itself: do not claim your own purity, for Allah knows best who among you is God-fearing.

Where exactly the second line falls is disputed, so this page does not draw it for you. The list below contains names of precisely that kind — *Taqi* (God-fearing), *Zaki* (pure), *Siddiq* (truthful) — borne in every generation, by Companions and by scholars, and at the same time the closest to that line. If one of them is the name you want, take it to a scholar in your own community.

### 4. The language of the name is not the issue

There is no requirement that a Muslim name be Arabic. Turkish, Persian, Urdu, Malay, Bosnian, Hausa and Chinese Muslim names are all simply names, judged by their meaning. The same test applies to Arabic ones — plenty of Arabic names carry meanings nobody would want once they look them up.

For converts, this cuts both ways: **there is no obligation to change your name on accepting Islam.** Most of the Companions kept the names they were born with. A change is called for only when the meaning conflicts — servitude to something other than Allah, or the name of a deity.

## When the name is given

The reported practice is the seventh day, together with the aqiqah and the shaving of the head. Naming on the day of birth is also reported — the Prophet (peace be upon him) named his son Ibrahim the night he was born (Sahih Muslim 2315, quoted above) — so the seventh day is a strong recommendation rather than a deadline.

> The Prophet (peace be upon him) said: Every boy is in pledge for his aqiqah: a sacrifice is made for him on the seventh day, his head is shaved, and he is named.
>> ${AR['abudawud-2838']}
> — Narrated by Samura ibn Jundub, from the Prophet (peace be upon him); Sunan Abi Dawud 2838. Jami‘ at-Tirmidhi 1522 has the same report

## One practical note on spelling

The transliterations here are deliberately plain: *Abd al-Rahman*, not *ʿAbd al-Raḥmān*. Academic transliteration is more precise, and it does not survive the trip through a passport office: the machine-readable zone of a passport carries unaccented A–Z and nothing else, so the marks get dropped or substituted somewhere along the way, not always the same way twice. Pick the plain spelling, then use the *same* spelling on every document from the first one onward — *Mohammed* on one document and *Muhammad* on another is the kind of mismatch that has to be untangled afterwards, one office at a time.

## Browse all 216 names

Every Arabic name is written with its short-vowel marks (*tashkil*), so you can read it straight off the page: *fatha* ـَ is a short "a", *damma* ـُ a short "u", *kasra* ـِ a short "i", *sukun* ـْ means no vowel follows, and *shadda* ـّ doubles the consonant. Long vowels are the letters alif, waw and ya themselves and carry no mark. Names are shown as you would say them on their own, without the grammatical ending a full sentence would add. Copying a name copies the plain spelling without the marks, since the marks do not survive every system.

Search by transliteration, by Arabic script (with or without the marks), by meaning, or by theme. This is the whole list the generator draws from — including all 24 of the prophets named in the Qur’an that are given as names.
`,

  faq: [
    { q: 'What are the best names in Islam?', a: 'The Prophet (peace be upon him) said that the most beloved of your names to Allah are Abdullah and Abd al-Rahman (Sahih Muslim 2132). Beyond those two, any name with a sound meaning is permitted, and naming after a prophet is encouraged on its own separate evidence (Sahih Muslim 2315).' },
    { q: 'When should a baby be named?', a: 'The reported practice is the seventh day, together with the aqiqah and the shaving of the head (Abu Dawud 2838, Tirmidhi 1522). Naming on the day of birth is also reported — the Prophet (peace be upon him) named his son Ibrahim the night he was born (Sahih Muslim 2315) — so the seventh day is a strong recommendation rather than a deadline.' },
    { q: 'Can you name a child al-Rahman or al-Malik?', a: 'No. Names that belong exclusively to Allah are not given to a person on their own; they are used as Abd al-Rahman or Abd al-Malik — servant of the Most Merciful, servant of the Sovereign. Names shared with creation, such as Karim or Malik without the definite article, are permitted.' },
    { q: 'Does a convert have to change their name?', a: 'No. A name needs changing only if its meaning conflicts with Islam — servitude to something other than Allah, or the name of a pagan deity. Most Companions kept the names they were born with; the Prophet (peace be upon him) changed a name when its meaning was objectionable, or when it claimed piety for its bearer.' },
    { q: 'What do bin and bint mean in an Arabic name?', a: 'Bin (or ibn) means "son of" and bint means "daughter of". They introduce the nasab, the lineage part of a classical name: Muhammad bin Idris is Muhammad, son of Idris.' },
  ],

  related: [
    { href: '/en/guide/', title: 'Fiqh Guide', desc: 'Menstruation, postpartum bleeding, istihadah, pregnancy — one question per page, with the evidence and every disagreement marked as a disagreement.' },
    { href: '/en/guide/pregnancy-fasting/', title: 'Fasting while pregnant or nursing', desc: 'When the fast may be broken, and what is owed afterwards — qada, fidya, or both.' },
    { href: '/en/guide/nifas/', title: 'Postpartum bleeding (nifas)', desc: 'How long it lasts, when prayer resumes, and what the four schools each hold.' },
  ],
};
