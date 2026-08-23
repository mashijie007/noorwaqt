/* en.mjs — fiqh guide (English)
 *
 * One entry per /en/guide/<slug>/ page. Bodies are written in the Markdown
 * subset documented at the top of tools/build-guides.mjs.
 *
 * Editorial rules, same as zh.mjs:
 *   1. Only positions the four Sunni schools actually hold. Where they differ,
 *      the difference is the answer — we do not pick a winner for the reader.
 *   2. Cite the primary evidence, with the collection and number.
 *   3. Anything touching the body or medicine points to a doctor, not to us.
 *
 * The faq entries are also emitted as FAQPage structured data, so each answer
 * has to stand on its own — no "as explained above".
 */

export const ui = {
  navHome: 'Home',
  navGuide: 'Fiqh Guide',
  navDownload: 'Download',
  hubTitle: 'Fiqh Guide',
  hubDesc: 'Can you pray on your period? Do missed prayers have to be made up? How are missed fasts repaid? Answered from the four Sunni schools, with the evidence and every disagreement marked as a disagreement.',
  hubH1: 'Fiqh of Women’s Worship',
  hubLead: 'Menstruation, postpartum bleeding, istihadah, pregnancy — the rulings exist and are well documented, but almost nobody has laid them out in a form you can actually look something up in. One question per page, and **wherever the schools differ, the difference is the answer**.',
  alsoIn: 'Also in:',
  updated: 'Last updated',
  faqTitle: 'Common questions',
  relatedTitle: 'Related answers',
  ctaTitle: 'Let the app keep track of this',
  ctaBody: 'NoorWaqt runs a multi-madhhab state machine over the cycle you log: it separates hayd from istihadah, exempts the right prayers, and schedules the fasts you owe. Every calculation runs on your phone. No account, nothing uploaded.',
  ctaBtn: 'Get NoorWaqt (Android, free)',
  reviewNotice: 'This page is study material. It **does not replace a ruling from a qualified scholar** who knows your situation. The schools differ, and so do circumstances — take specific questions to a scholar in your own community.',
  disclaimer: 'Compiled from Sahih al-Bukhari, Sahih Muslim, and the standard manuals of the four schools. If you find an error in how something is stated here, please write in — these pages are revised as corrections come.',
  footerFiqh: 'Fiqh content is for study. For a binding ruling, ask a qualified scholar.',
  footerPrivacy: 'The app runs on your device. We never collect your personal records.',
};

export const articles = [
  // ── 1 ──────────────────────────────────────────────────
  {
    slug: 'menstruation-and-prayer',
    published: '2026-08-23',
    updated: '2026-08-23',
    madhhab: 'Hanafi · Maliki · Shafi‘i · Hanbali',
    title: 'Can You Pray on Your Period? Do You Make Up Missed Prayers?',
    h1: 'Can you pray on your period, and do you make up the prayers you missed?',
    desc: 'A menstruating woman does not pray, and does not make those prayers up. All four schools agree. What they differ on is the seam at each end — the prayer when bleeding starts, and the prayer when it stops.',
    lead: 'The short answer: **you do not pray during menstruation, and you do not make those prayers up afterwards.** All four schools agree on that. The disagreements are at the two seams — the prayer during which bleeding begins, and the one during which it ends.',
    body: `
## The ruling: exempt, and nothing owed

During menstruation a woman does not pray. This is not a concession she may decline — prayer offered in this state is not valid. And afterwards there is nothing to make up.

The evidence is Aisha’s (may Allah be pleased with her) answer to Mu‘adha, who asked her why a menstruating woman makes up the fast but not the prayer:

> That used to happen to us, and we were ordered to make up the fast, and were not ordered to make up the prayer.
> — Aisha, Sahih Muslim 335; see also Sahih al-Bukhari 321

All four schools read this as a complete exemption with no residue. The reason usually given is the sheer recurrence: prayer comes five times a day, so making up a full cycle would be a burden far beyond one month of fasting a year.

## When the exemption begins

The obligation lifts the moment blood appears. The real question is this case: **the time for a prayer had already entered, she had not prayed yet, and then bleeding started.** Does she owe that prayer?

| School | Position |
| --- | --- |
| Hanafi | Nothing owed. The obligation had not settled before it was lifted. |
| Maliki | Owed, if enough of the window had passed for purification and the prayer. |
| Shafi‘i | Owed. The common position is that enough time for the prayer itself (some say for the opening takbir) is sufficient. |
| Hanbali | Owed. Close to the Shafi‘i position. |

Each school subdivides further on how much time counts. The table gives the direction, not the last word — ask which position your community follows.

## When purity comes, which prayer do you start with

Once bleeding stops and you see a sign of purity, perform ghusl and pray the prayer whose time it is. What gets missed is the **carry-over across paired prayers**:

- Purity arrives during Asr — **is Dhuhr owed as well?**
- Purity arrives during Isha — **is Maghrib owed as well?**

The Maliki, Shafi‘i and Hanbali schools say yes: Dhuhr and Asr form a joinable pair, as do Maghrib and Isha, and the later window holds the earlier prayer in trust. This is narrated from Ibn Abbas and Abd al-Rahman ibn Awf (may Allah be pleased with them).

The Hanafi school says no — she prays only the prayer whose time she became pure in.

## Worship does not stop for these days

Being exempt from salah is not a pause on worship. None of the following is affected, by agreement of all four schools:

- Dhikr of every kind — tasbih, tahmid, takbir — and istighfar
- Du‘a, including everything you would ask for in sujud
- Salawat upon the Prophet (peace be upon him)
- Listening to Qur’an recitation, reading tafsir and books of fiqh
- Sadaqah, visiting the sick, serving family

Reciting and touching the Qur’an itself is genuinely disputed and gets its own page: [Can you read Qur’an on your period?](/en/guide/menstruation-and-quran/)

## When it is no longer menstruation at all

If bleeding runs past the maximum your school recognises, it stops being hayd and becomes istihadah — **and in istihadah, prayer is obligatory**. This is the single most consequential mistake in this area, because it is never one missed prayer, it is dozens. Two pages cover it:

- [How do you know your period has ended?](/en/guide/end-of-menstruation/)
- [Istihadah: bleeding that does not excuse you from prayer](/en/guide/istihadah/)
`,
    faq: [
      { q: 'Do you have to make up prayers missed during your period?', a: 'No. All four Sunni schools agree that a menstruating woman is exempt from prayer and owes nothing afterwards. The evidence is Aisha’s report that they were ordered to make up the fast but were not ordered to make up the prayer (Sahih Muslim 335).' },
      { q: 'Can you make du‘a and dhikr on your period?', a: 'Yes. Only the prayer itself is lifted. Dhikr, istighfar, du‘a, salawat, listening to Qur’an recitation and reading tafsir are all unrestricted during menstruation, by agreement of the four schools.' },
      { q: 'If you become pure during Asr, do you pray Dhuhr too?', a: 'The schools differ. The Maliki, Shafi‘i and Hanbali schools say yes, because Dhuhr and Asr are a joinable pair and the Asr window holds Dhuhr in trust. The Hanafi school says she prays only Asr. The same applies to Maghrib and Isha.' },
      { q: 'What if your period starts in the middle of a prayer?', a: 'The prayer ends there and is not resumed or repeated later. Whether that prayer counts as owed — because its time had entered before bleeding began — depends on the school: the Hanafi school says nothing is owed, the other three generally say it is.' },
    ],
  },

  // ── 2 ──────────────────────────────────────────────────
  {
    slug: 'menstruation-and-fasting',
    published: '2026-08-23',
    updated: '2026-08-23',
    madhhab: 'Hanafi · Maliki · Shafi‘i · Hanbali',
    title: 'Fasting on Your Period: Why Fasts Are Made Up but Prayers Are Not',
    h1: 'Fasting on your period: why fasts are made up but prayers are not',
    desc: 'A menstruating woman does not fast, and every missed day of Ramadan must be made up before the next one. How long you have, what happens if you miss the deadline, and where the schools differ on fidya.',
    lead: 'Fasting and prayer are handled in opposite ways here: **prayer is lifted and owed nothing, fasting is lifted but must be repaid.** The asymmetry is not a later deduction — Aisha was asked about it directly.',
    body: `
## No fasting, and a fast kept anyway does not count

A menstruating woman does not fast. If bleeding starts during a fasting day — even a minute before maghrib — that day’s fast is broken and must be made up.

The reverse case matters just as much: if bleeding stops during the night, she makes her intention and fasts. **The fast is valid even if she performs ghusl after fajr** — delaying ghusl affects prayer, not fasting, since she needs it before she can pray Fajr. Most scholars consider it better to complete ghusl before fajr.

## Why one is repaid and the other is not

The same hadith settles both rulings at once:

> That used to happen to us, and we were ordered to make up the fast, and were not ordered to make up the prayer.
> — Aisha, Sahih Muslim 335

Scholars usually explain the wisdom this way: prayer recurs five times daily, so one cycle means twenty or thirty prayers, which would be a crushing repayment; fasting comes one month a year, which is repayable. **But the ruling rests on the text — the reasoning is commentary on it.**

## How long you have

Missed fasts should be repaid before the next Ramadan arrives. Aisha said she would often not make hers up until Sha‘ban — understood to mean **delay is permitted, delay past the next Ramadan is not**.

The days need not be consecutive. All four schools agree they can be spread out.

## If you miss the next Ramadan

| School | Position |
| --- | --- |
| Hanafi | Make up the fasts only. No fidya. |
| Maliki | Make up the fasts, plus fidya — feeding one poor person per day. |
| Shafi‘i | Make up the fasts, plus fidya; the common position compounds it per year missed. |
| Hanbali | Make up the fasts, plus fidya. |

If the delay was outside her control — ongoing illness, back-to-back pregnancies and nursing — most scholars hold that no fidya is owed for the delay itself. The fasts are still made up.

## Period days never convert into fidya

A common misunderstanding: that missed days can simply be paid off with charity. **They cannot.** Someone able to fast repays fasts with fasts. Fidya appears in only two places: permanent inability to fast (advanced age, an irreversible illness), and — per the schools above — unexcused delay past the next Ramadan.

Pregnancy and nursing are a genuinely different case with a real three-way split among scholars: [Fasting while pregnant or breastfeeding](/en/guide/pregnancy-fasting/)

## What these days in Ramadan are actually for

Not fasting and not praying does not cut these days out of Ramadan. Tarawih is not prayed, but staying up, dhikr, du‘a, sadaqah, preparing iftar, caring for the household — all of it stands. Laylat al-Qadr falling in these days is the question that comes up most: **istighfar and du‘a are entirely unrestricted, and that is precisely what the night is for.**
`,
    faq: [
      { q: 'Do you have to make up fasts missed during your period?', a: 'Yes. All four schools agree that a menstruating woman does not fast, and that every missed day of Ramadan must be made up before the following Ramadan. The evidence is Aisha’s report that they were ordered to make up the fast (Sahih Muslim 335).' },
      { q: 'Can you pay fidya instead of making up period fasts?', a: 'No. Someone who is able to fast must repay fasts with fasts. Fidya applies only to permanent inability to fast, and — in most schools — as an addition when repayment is delayed past the next Ramadan without excuse.' },
      { q: 'If bleeding stops at night and you shower after fajr, is the fast valid?', a: 'Yes. The fast is valid as long as the intention was made before dawn; ghusl may follow. She does need to complete ghusl before she can pray Fajr, and most scholars recommend doing it before dawn.' },
      { q: 'Do make-up fasts have to be consecutive?', a: 'No. All four schools agree that missed Ramadan days may be made up on separate, non-consecutive days, as long as they are completed before the next Ramadan.' },
    ],
  },

  // ── 3 ──────────────────────────────────────────────────
  {
    slug: 'menstruation-and-quran',
    published: '2026-08-23',
    updated: '2026-08-23',
    madhhab: 'The schools differ substantially',
    title: 'Can You Read Qur’an on Your Period? Mushaf, Phone Apps, and the Masjid',
    h1: 'Can you read Qur’an on your period?',
    desc: 'Reciting from memory, touching the mushaf, reading from a phone, entering the masjid, tawaf — the schools differ on almost all of it. Each position laid out, plus what contemporary scholars say about reading Qur’an on a screen.',
    lead: 'This is the most disputed area in women’s fiqh. **Exactly one item is agreed on by all four schools: no tawaf.** On everything else there are real, weighty differences.',
    body: `
## The positions at a glance

| | Hanafi | Maliki | Shafi‘i | Hanbali |
| --- | --- | --- | --- | --- |
| Reciting from memory | No | **Yes** | No | No |
| Touching the mushaf | No | No | No | No |
| Handling it with a barrier | Yes | Yes | Yes | Yes |
| Staying inside a masjid | No | No | No | Disputed |
| Tawaf | No | No | No | No |
| Dhikr and du‘a | Yes | Yes | Yes | Yes |

Each row is explained below.

## Reciting from memory

Most of the schools — Hanafi, Shafi‘i, Hanbali — hold that a menstruating woman does not recite Qur’an. The evidence is a narration prohibiting recitation for those in a state of major impurity, **whose authenticity has been questioned since early times**.

**The Maliki school permits it**, on straightforward grounds: menstruation lasts days, is not chosen, and cannot be hastened — a blanket prohibition would keep her from the Qur’an for a large part of her life with no clear text requiring it. Ibn Taymiyyah held a similar view, noting that no authentic report forbids it.

Worth separating: reciting *as recitation* is the disputed act. Saying verses **as dhikr or as protection** — Ayat al-Kursi, the last three surahs, verses used in supplication — is generally considered fine across the schools.

## Touching the mushaf

All four schools hold that the mushaf is not touched without purity, generally citing the Prophet’s letter to Amr ibn Hazm:

> None shall touch the Qur’an except one who is pure.
> — Reported in Malik’s Muwatta; also in Sunan al-Darimi

A minority, notably Ibn Hazm, did not accept this ruling. But the settled practice is clear, and so is the workaround: **handling it through a cloth, gloves, or a page-turner is permitted by all four schools.**

## Qur’an on a phone or tablet

This is a modern question and the one that matters most day to day. Most contemporary scholars hold that **Qur’an displayed on a screen is not a mushaf, and touching the screen is not covered by the ruling above.** The reasoning is that the text is not permanently inscribed there — swipe and it is gone — which is not what a bound, written mushaf is.

The Permanent Committee in Saudi Arabia and fatwa councils in several countries have issued rulings to this effect. **Recitation itself, though, goes back to the dispute in the first section** — the medium changed, the ruling on reciting did not.

This is exactly why the 7.3MB Qur’an inside NoorWaqt is usable here: touching the screen needs no prior purity, and if you follow a school that restricts recitation, you read silently or listen.

## Entering the masjid

Most schools do not permit a menstruating woman to remain inside a masjid, citing narrations to that effect along with the general requirement of purity for the place of prayer.

Two reports belong alongside that, though. The Prophet (peace be upon him) asked Aisha to fetch a mat from the masjid, and when she mentioned her state, told her:

> Your menstruation is not in your hand.
> — Sahih Muslim 298

And a woman who looked after the masjid is reported to have had a tent inside it (Sahih al-Bukhari 439). Ibn Hazm and others concluded from this that entry is permitted. Many contemporary scholars, on the same basis, allow **brief entry for a need** — attending a class, sheltering, passing through — provided there is no risk of soiling the space.

## Tawaf

No dispute here: a menstruating woman does not perform tawaf. The Prophet told Aisha when she menstruated during Hajj:

> Do everything the pilgrim does, except do not circle the House until you are pure.
> — Sahih al-Bukhari 305

Everything else stands — Arafah, Muzdalifah, the stoning (sa‘i has its own subdivisions among the schools). Which tells you something in itself: **most of Hajj is not conditional on purity.**

## So what is left

- Dhikr, istighfar, du‘a, salawat — no restriction at all
- Listening to recitation, following along with an audio recording
- Reading tafsir, fiqh, hadith, seerah
- Revising memorised portions (within the schools that permit recitation)
- Sadaqah, teaching, caring for family, attending classes held outside the prayer hall

Related: [Can you pray on your period?](/en/guide/menstruation-and-prayer/)
`,
    faq: [
      { q: 'Can you read Qur’an from a phone during your period?', a: 'Most contemporary scholars permit touching a phone or tablet screen, because Qur’an displayed on a screen is not a mushaf — the text is not permanently inscribed there. Whether you may recite aloud still depends on your school: the Maliki school permits recitation, while the Hanafi, Shafi‘i and Hanbali schools do not.' },
      { q: 'Can you recite Qur’an from memory on your period?', a: 'The schools differ. The Maliki school permits it, reasoning that menstruation is long and not chosen. The Hanafi, Shafi‘i and Hanbali schools do not. Saying verses as dhikr or for protection — Ayat al-Kursi, the last three surahs — is generally accepted by all.' },
      { q: 'Can you enter a masjid while menstruating?', a: 'Most schools do not permit remaining inside. However, the Prophet asked Aisha to fetch something from the masjid and told her "your menstruation is not in your hand" (Sahih Muslim 298), and on that basis many scholars permit brief entry for a need, provided the space is not soiled.' },
      { q: 'What if you get your period during Hajj?', a: 'Everything continues except tawaf. The Prophet told Aisha: do everything the pilgrim does, except do not circle the House until you are pure (Sahih al-Bukhari 305). Arafah, Muzdalifah and the stoning are unaffected.' },
    ],
  },

  // ── 4 ──────────────────────────────────────────────────
  {
    slug: 'end-of-menstruation',
    published: '2026-08-23',
    updated: '2026-08-23',
    madhhab: 'Hanafi · Maliki · Shafi‘i · Hanbali',
    title: 'How Do You Know Your Period Has Ended? Brown Discharge and Maximum Days',
    h1: 'How do you know your period has ended?',
    desc: 'The two signs of purity, what yellow and brown discharge mean, the minimum and maximum durations in each school, and how to perform ghusl. This is the step that decides whether you pray today.',
    lead: 'This page decides the most practical question there is: **do you pray today.** Call it early and the prayers are invalid; call it late and you owe every prayer you skipped.',
    body: `
## The two signs of purity

Bleeding has ended when either sign appears:

1. **The white discharge (al-qassah al-bayda)** — the whitish discharge that follows the period.
2. **Complete dryness** — cotton inserted and withdrawn comes out clean.

This is how Aisha (may Allah be pleased with her) taught the women of the Ansar. They would send her cotton showing discharge, and she would tell them:

> Do not hurry until you see the white discharge.
> — Reported in Malik’s Muwatta; referenced in Sahih al-Bukhari’s chapter on menstruation

## Yellow and brown discharge

The most-asked question in this area, and the answer turns entirely on **when it appears**:

- **Within the days of the period** — treated as menstruation. She does not pray.
- **After a sign of purity has been seen** — not menstruation. She prays as normal.

The evidence is Umm Atiyyah’s report:

> We did not count the yellowish and brownish discharge after purity as anything.
> — Sahih al-Bukhari 326; Sunan Abi Dawud 307

The Hanafi school adds a layer: within her habitual days, any discharge that is not clear white is treated as menstrual blood, up to that school’s maximum.

## Minimum and maximum durations

This is where the schools diverge most, and it is what determines when bleeding stops being hayd and becomes istihadah.

| School | Minimum | Maximum | Minimum purity between periods |
| --- | --- | --- | --- |
| Hanafi | 3 days | 10 days | 15 days |
| Maliki | No minimum — any blood counts | 15 days | 15 days |
| Shafi‘i | 1 day and night (24 hours) | 15 days | 15 days |
| Hanbali | 1 day and night (24 hours) | 15 days | 13 days |

Two consequences to hold on to:

- Bleeding **shorter than your school’s minimum** is not menstruation. Those prayers were obligatory and are owed.
- Bleeding **longer than your school’s maximum** is istihadah beyond that point — **prayer resumes from the moment the limit is passed**, not when bleeding stops. See [Istihadah](/en/guide/istihadah/).

Because the thresholds differ, the same woman can have a start date days apart depending on the school. **Pick one school and follow it consistently** — that is far safer than taking whichever position is easiest each month.

## Ghusl afterwards

Once pure, ghusl is required before praying. Its essentials:

1. **Intention (niyyah)** — to lift the state of major impurity.
2. **Water reaching the whole body**, including the roots of the hair and every fold of skin.

On hair: braids do not need to be undone, but water must reach the scalp. Umm Salamah asked about exactly this, and was told it is enough to pour three handfuls of water over the head (Sahih Muslim 330).

The often-quoted advice to use a piece of cotton scented with musk comes from the Prophet’s answer to Asma bint Shakal (Sahih Muslim 332). It is recommended, not required.

## Which prayer you start with

See the section "When purity comes, which prayer do you start with" in [Can you pray on your period?](/en/guide/menstruation-and-prayer/) — there is a real disagreement about the paired prayers, and it is worth reading once properly.

## If your cycle is irregular

If the length shifts constantly, or bleeding drags on in fits and starts, the ruling is worked out through **habit (‘adah) and discernment (tamyiz)**, which is the istihadah framework. And the cycle itself is a matter for a doctor: **fiqh settles the worship, it does not diagnose the cause.**
`,
    faq: [
      { q: 'How do you know your period has ended?', a: 'Either of two signs: the white discharge (al-qassah al-bayda) appears, or cotton inserted and withdrawn comes out completely clean. Aisha taught the women of the Ansar: do not hurry until you see the white discharge.' },
      { q: 'Does brown discharge count as a period?', a: 'It depends when it appears. Within the days of the period it is treated as menstruation. After a sign of purity has been seen it is not, and she prays as normal. Umm Atiyyah reported: we did not count the yellowish and brownish discharge after purity as anything (Sahih al-Bukhari 326).' },
      { q: 'What is the maximum number of days a period can last?', a: 'The Hanafi school sets the maximum at 10 days; the Maliki, Shafi‘i and Hanbali schools set it at 15. Bleeding beyond that limit is istihadah, and prayer becomes obligatory again from that point.' },
      { q: 'Do you have to undo your braids for ghusl?', a: 'No, but water must reach the roots of the hair. Umm Salamah asked the Prophet about this and was told it is enough to pour three handfuls of water over the head (Sahih Muslim 330).' },
    ],
  },

  // ── 5 ──────────────────────────────────────────────────
  {
    slug: 'istihadah',
    published: '2026-08-23',
    updated: '2026-08-23',
    madhhab: 'Hanafi · Maliki · Shafi‘i · Hanbali',
    title: 'Istihadah: Bleeding That Does Not Excuse You From Prayer',
    h1: 'Istihadah: bleeding, but prayer is still obligatory',
    desc: 'Not all bleeding is menstruation. Bleeding past the maximum, or outside the cycle, is istihadah — and during istihadah prayer and fasting remain obligatory. How to tell the difference, and how wudu works.',
    lead: '**The costliest mistake in this whole area.** Treating istihadah as menstruation does not cost one prayer — it costs weeks of them, and those are owed.',
    body: `
## What istihadah is

Istihadah is bleeding outside of menstruation and postpartum bleeding. In fiqh it is classified as **an illness, not a state of impurity** — which is why it does not stand between a woman and her prayer.

Fatimah bint Abi Hubaysh told the Prophet (peace be upon him) that she bled continuously, and he answered:

> That is a vein, not menstruation. So when your period comes, stop praying; and when it goes, wash the blood from yourself and pray.
> — Sahih al-Bukhari 228; Sahih Muslim 333

## What applies during istihadah

- **Pray every prayer** — this is obligatory, none of them drop.
- **Fast normally**, including Ramadan.
- Most scholars hold that **marital relations are not prohibited**.
- Touching and reciting Qur’an are not subject to the menstruation restrictions.

In short: **apart from how wudu is performed, everything is as it normally is.**

## How wudu works

Istihadah is a continuous state that breaks wudu, handled the same way as incontinence or a nosebleed that will not stop — the category of one with a standing excuse (ma‘dhur):

| School | Practice |
| --- | --- |
| Hanafi | One wudu per prayer **time**, valid for that whole window — obligatory and voluntary prayers alike. It lapses when the window ends. |
| Maliki | Wudu before each prayer is recommended rather than strictly required, since this school does not treat istihadah as breaking wudu. |
| Shafi‘i | Wash, use a pad, then wudu before **each obligatory prayer**; one wudu serves one fard prayer. |
| Hanbali | Close to the Shafi‘i position — renew wudu before each obligatory prayer. |

All schools have her wash away the blood and use a pad first. Bleeding that continues after wudu does not invalidate the prayer.

## Telling menstruation from istihadah

Three methods, applied in order:

**1. Habit (‘adah).** The days she normally menstruates — that many days, starting when they normally start — are menstruation; the rest is istihadah. This takes priority. The Prophet told Umm Habibah exactly this: hold back for the number of days your menstruation used to last, then wash and pray (Sahih Muslim 334).

**2. Discernment (tamyiz).** With no settled habit, the blood itself is read: dark, thick, distinctly odorous blood is menstruation; thin, pale blood is istihadah. This comes from the Prophet’s other instruction to Fatimah bint Abi Hubaysh.

**3. Fall back to the norm.** When neither applies, most scholars follow the hadith of Hamnah bint Jahsh and count 6 or 7 days a month as menstruation, the rest istihadah (Sunan Abi Dawud 287). The Hanafi school has its own scheme for a woman with no established habit.

## The three situations this actually comes up in

**Bleeding past your school’s maximum.** Ten days for the Hanafi school, fifteen for the other three. Everything past that is istihadah, and **prayer resumes at the moment the limit is crossed** — not when bleeding finally stops.

**Spotting between periods.** If less than the minimum purity interval (usually 15 days) has passed since the last period ended, it is generally treated as istihadah.

**Bleeding from contraception, an IUD, or perimenopause.** Fiqh classifies it by the rules above regardless of the cause. **The cause itself is a matter for a doctor** — this page settles worship, not medicine.

## Why this page is worth re-reading

Get the boundary between hayd and istihadah wrong and you do not lose a day, you lose a stretch of them. This is precisely what NoorWaqt’s fiqh engine does: it reads the cycle you have logged, applies the school you have chosen, and works out for each day whether prayer is owed — **entirely on your phone, with nothing uploaded.**

Related: [How do you know your period has ended?](/en/guide/end-of-menstruation/) · [Nifas: postpartum bleeding](/en/guide/nifas/)
`,
    faq: [
      { q: 'Do you pray during istihadah?', a: 'Yes. Istihadah is bleeding outside menstruation and postpartum bleeding, classified in fiqh as an illness rather than impurity, so prayer remains obligatory. The Prophet told Fatimah bint Abi Hubaysh: that is a vein, not menstruation… when it goes, wash the blood from yourself and pray (Sahih al-Bukhari 228).' },
      { q: 'How do you tell menstruation from istihadah?', a: 'Three methods in order: first her habitual cycle — the days she normally menstruates are menstruation; if there is no settled habit, the character of the blood — dark, thick and odorous is menstruation, thin and pale is istihadah; if neither applies, most scholars count 6 or 7 days a month as menstruation.' },
      { q: 'How is wudu performed during istihadah?', a: 'The schools differ. The Hanafi school allows one wudu per prayer time window, valid until that window ends. The Shafi‘i and Hanbali schools require washing, using a pad, and renewing wudu before each obligatory prayer. All require cleaning the blood away first.' },
      { q: 'If bleeding continues past 15 days, do you keep skipping prayers?', a: 'No. Bleeding beyond your school’s maximum — 10 days for the Hanafi school, 15 for the other three — is istihadah. Prayer resumes from the moment that limit is crossed, not when the bleeding finally stops.' },
    ],
  },

  // ── 6 ──────────────────────────────────────────────────
  {
    slug: 'nifas',
    published: '2026-08-23',
    updated: '2026-08-23',
    madhhab: 'Hanafi · Maliki · Shafi‘i · Hanbali',
    title: 'Nifas: How Long Does Postpartum Bleeding Last in Islam?',
    h1: 'Nifas: how long postpartum bleeding lasts, and when prayer resumes',
    desc: 'During nifas a woman does not pray or fast, exactly as in menstruation. But the maximum differs by school, and if bleeding stops early, prayer resumes early. Miscarriage is a separate ruling.',
    lead: 'Postpartum bleeding (nifas) follows almost the same rules as menstruation. Only two things really need sorting out: **the maximum, and what to do when bleeding stops before it.**',
    body: `
## The rulings: as in menstruation

During nifas:

- No prayer, and **nothing is owed afterwards**.
- No fasting, and missed Ramadan days **must be made up**.
- No tawaf.
- Marital relations pause.
- Reciting and touching the Qur’an follow the same dispute as in menstruation — see [Can you read Qur’an on your period?](/en/guide/menstruation-and-quran/)

## The maximum

**There is no minimum.** If bleeding stops on the fifth day and a sign of purity appears, she performs ghusl and prays that day. There is no waiting out forty days — this is a widespread misunderstanding.

The maximum differs:

| School | Maximum |
| --- | --- |
| Hanafi | 40 days |
| Hanbali | 40 days |
| Maliki | 60 days |
| Shafi‘i | 60 days (40 being the norm) |

The number forty comes from Umm Salamah’s report:

> In the time of the Prophet (peace be upon him), the woman in nifas would wait forty days.
> — Sunan Abi Dawud 311; Jami‘ at-Tirmidhi 139

Bleeding that continues past your school’s maximum is treated as **istihadah** — prayer resumes, with wudu performed as described in [the istihadah rulings](/en/guide/istihadah/).

## If bleeding stops and then returns

Bleeding that stops within the forty (or sixty) days and then returns is handled differently across the schools. A widely followed approach: bleeding within the limit still counts as nifas, and the clean days in between count as purity — **clean means pray, bleeding means stop.**

The Hanafi school has its own method for combining intermittent days within the limit. There are many variables here, so **take the actual dates to a scholar in your community.**

## Miscarriage

The ruling turns on whether the foetus had discernible human form:

- **Recognisably formed** — scholars commonly cite around 81 days, or four months — the bleeding that follows is nifas.
- **Not yet formed** — a clot or lump of flesh — it is not nifas. The bleeding is treated as istihadah and **she continues to pray.**

Establishing which applies needs medical information. This is the ruling most often got wrong in practice, and the cost of getting it wrong is a great many missed prayers.

## Caesarean birth, lochia, and what medicine calls it

Fiqh looks at **the bleeding itself** and does not distinguish vaginal birth from caesarean. The medical staging of lochia is not the same framework as the fiqh limits, and the two do not need to be mapped onto each other.

Anything abnormal — heavy bleeding, fever, bleeding well outside the usual range — is a reason to see a doctor immediately. **This page settles worship. It is not medical advice.**

## Worship in these weeks

Prayer is lifted; dhikr, istighfar, du‘a and sadaqah are not. The naming on the seventh day and the ‘aqiqah, du‘a for the child, gratitude — all of that belongs to exactly these days.

Related: [Fasting while pregnant or breastfeeding](/en/guide/pregnancy-fasting/)
`,
    faq: [
      { q: 'How long does nifas last?', a: 'The Hanafi and Hanbali schools set the maximum at 40 days; the Maliki and Shafi‘i schools set it at 60. Bleeding that continues past that limit is treated as istihadah, and prayer becomes obligatory again.' },
      { q: 'Can you pray if postpartum bleeding stops before forty days?', a: 'Yes, and you must. Nifas has no minimum duration. Once a sign of purity appears, she performs ghusl and resumes prayer immediately — there is no requirement to wait out forty days.' },
      { q: 'Do you make up prayers and fasts missed during nifas?', a: 'Prayers are not made up; fasts are. The rule is identical to menstruation.' },
      { q: 'Is bleeding after a miscarriage considered nifas?', a: 'It depends on whether the foetus had discernible human form — scholars commonly cite around 81 days or four months. If it did, the bleeding is nifas. If it did not, the bleeding is treated as istihadah and she continues to pray.' },
    ],
  },

  // ── 7 ──────────────────────────────────────────────────
  {
    slug: 'pregnancy-fasting',
    published: '2026-08-23',
    updated: '2026-08-23',
    madhhab: 'Three positions coexist',
    title: 'Fasting While Pregnant or Breastfeeding: Qada, Fidya, or Both?',
    h1: 'Fasting while pregnant or breastfeeding: qada, fidya, or both?',
    desc: 'A pregnant or nursing mother may break her fast if she fears for herself or the child. What she owes afterwards is genuinely disputed — three positions, with the evidence for each.',
    lead: 'First, the part that gets confused: **pregnancy and nursing are not menstruation. Prayer continues as normal.** Only fasting is at issue — and there the disagreement is real, with three defensible positions.',
    body: `
## When you may break the fast

A pregnant or nursing mother may break her fast if fasting would harm her or the child. The evidence:

> Allah has relieved the traveller of half the prayer, and He has relieved the pregnant woman and the nursing mother of the fast.
> — Sunan Abi Dawud 2408; Jami‘ at-Tirmidhi 715

**Whether harm is genuinely expected is not settled by how you feel about it.** A doctor’s assessment is part of the ruling here: dehydration risk, gestational diabetes, falling milk supply, insufficient weight gain. If a physician advises against fasting, the concession applies.

## What is owed afterwards: three positions

This is the disputed part. All three positions have a chain of scholarship behind them and living adherents:

| Position | What it requires | Held by |
| --- | --- | --- |
| **Qada only** | Make up the days, like someone who was ill. No fidya. | Hanafi school; also the Shafi‘i and Hanbali position where she feared for herself |
| **Qada + fidya** | Make up the days and feed one poor person per missed day | Shafi‘i and Hanbali schools where she feared for the child alone |
| **Fidya only** | No make-up fasts; feed one poor person per day | Ibn Abbas and Ibn Umar (may Allah be pleased with them), followed by some contemporary scholars |

The third rests on Ibn Abbas’s reading of "and upon those who are able to fast, a ransom of feeding a poor person" (al-Baqarah 2:184) — he held that the verse remains in force for pregnant and nursing women.

Within the majority schools, the distinction usually drawn is:

- Fear for **her own body** → make up the fasts, as an ill person would
- Fear for **the child** → the Shafi‘i and Hanbali schools add fidya
- Fear for both → handled differently across the schools; ask locally

## How fidya is calculated

One poor person fed for each missed day. The measure is normally reckoned in the local staple, and most local fatwa bodies publish a cash equivalent. It may be given day by day or settled in one payment.

## Back-to-back pregnancies and no window to make up

Consecutive pregnancies and nursing, with no gap in which to fast, is an ordinary situation rather than an edge case. Most scholars hold that as long as the delay is **not by choice**, no additional fidya is incurred for the delay — the fasts are made up when it becomes possible. Where the situation is not going to change for years, local fatwa bodies generally give guidance on settling with fidya.

## Prayer is untouched

Repeating it because it is the most common misunderstanding: **pregnancy, nursing, morning sickness and bed rest do not lift prayer.** If standing is not possible, she prays sitting; if sitting is not possible, lying down with gestures. Imran ibn Husayn asked, and was told:

> Pray standing; if you cannot, then sitting; and if you cannot, then on your side.
> — Sahih al-Bukhari 1117

Rulings for the period after birth are on [Nifas: postpartum bleeding](/en/guide/nifas/).
`,
    faq: [
      { q: 'Can a pregnant woman skip fasting in Ramadan?', a: 'Yes, if fasting would harm her or the child. The Prophet said that Allah has relieved the pregnant woman and the nursing mother of the fast (Sunan Abi Dawud 2408). Whether harm is expected should be assessed with a doctor.' },
      { q: 'Does a pregnant or breastfeeding woman make up fasts or pay fidya?', a: 'There are three positions among scholars: make up the fasts only (the Hanafi school, and where she feared for herself); make up the fasts and pay fidya (the Shafi‘i and Hanbali schools where she feared for the child alone); or pay fidya without making up the fasts (the position of Ibn Abbas and Ibn Umar, followed by some contemporary scholars).' },
      { q: 'Do you still pray while pregnant?', a: 'Yes. Pregnancy and nursing are not menstruation and do not lift the obligation of prayer. If standing is not possible she prays sitting, and if that is not possible, lying on her side — the Prophet told Imran ibn Husayn: pray standing; if you cannot, then sitting; and if you cannot, then on your side (Sahih al-Bukhari 1117).' },
      { q: 'What if years of pregnancies left fasts unmade?', a: 'Most scholars hold that where the delay was not by choice, no additional fidya is incurred for the delay itself, and the fasts are made up when it becomes possible. Where the situation will not change, local fatwa bodies usually give guidance on settling with fidya.' },
    ],
  },
];
