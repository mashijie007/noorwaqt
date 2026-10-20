/* id.mjs — panduan fikih (Bahasa Indonesia)
 *
 * Satu entri untuk satu halaman /id/guide/<slug>/. Isi body ditulis dengan
 * subset Markdown yang didokumentasikan di bagian atas tools/build-guides.mjs.
 *
 * Kaidah penyuntingan, sama dengan en.mjs dan zh.mjs:
 *   1. Hanya pendapat yang memang dipegang keempat mazhab Ahlus Sunnah.
 *      Bila mereka berbeda, perbedaan itulah jawabannya — kami tidak memilihkan.
 *   2. Sebutkan dalilnya, lengkap dengan nama kitab dan nomornya.
 *   3. Apa pun yang menyangkut tubuh dan pengobatan diarahkan ke dokter,
 *      bukan ke kami.
 *
 * Entri faq juga diterbitkan sebagai data terstruktur FAQPage, jadi setiap
 * jawaban harus utuh berdiri sendiri — jangan menulis "seperti dijelaskan di atas".
 *
 * Catatan istilah: ejaan mengikuti gaya situs — sholat, Subuh, Zuhur, Asar,
 * Maghrib, Isya — bukan ejaan KBBI "salat", supaya konsisten dengan halaman
 * jadwal sholat dan dengan kata yang benar-benar diketik orang di pencarian.
 *
 * Bahasa Indonesia baru memuat tiga dari tujuh artikel. Tautan di dalam body
 * hanya boleh menunjuk ke slug yang memang ada di bahasa ini, kalau tidak
 * verify-dist akan menahannya.
 */

import { AR } from '../lib/hadith.mjs';

export const ui = {
  navHome: 'Beranda',
  navGuide: 'Panduan Fikih',
  navNames: 'Nama',
  navDownload: 'Unduh',
  hubTitle: 'Panduan Fikih',
  hubH1: 'Fikih Ibadah Perempuan',
  hubDesc: 'Bolehkah sholat saat haid? Apakah sholat yang ditinggalkan harus diqadha? Bagaimana tahu haid sudah selesai? Dijawab menurut empat mazhab Ahlus Sunnah, dengan dalilnya, dan setiap perbedaan pendapat ditulis apa adanya.',
  hubLead: 'Haid, nifas, istihadhah, kehamilan — hukum sholat dan puasa pada hari-hari itu tercatat jelas dalam kitab fikih, tetapi hampir tidak ada yang menyusunnya dalam bentuk yang benar-benar bisa dicari. Satu pertanyaan satu halaman, dan **di mana para ulama berbeda, perbedaan itulah jawabannya**.',
  alsoIn: 'Juga tersedia dalam:',
  updated: 'Terakhir diperbarui',
  faqTitle: 'Pertanyaan yang sering muncul',
  relatedTitle: 'Jawaban terkait',
  ctaTitle: 'Biarkan aplikasi yang mengingat aturannya',
  ctaBody: 'NoorWaqt menjalankan mesin fikih multi-mazhab atas siklus yang Anda catat: ia memisahkan haid dari istihadhah, menggugurkan sholat yang memang gugur, dan menjadwalkan puasa yang harus diqadha. Semua perhitungan berjalan di ponsel Anda. Tanpa akun, tanpa unggahan.',
  ctaBtn: 'Dapatkan NoorWaqt (Android, gratis)',
  reviewNotice: 'Halaman ini adalah bahan belajar. Ia **tidak menggantikan fatwa ulama berkompeten** yang mengetahui keadaan Anda. Mazhab berbeda-beda, keadaan orang pun berbeda — bawalah pertanyaan yang spesifik kepada ulama di lingkungan Anda sendiri.',
  disclaimer: 'Disusun dari Shahih al-Bukhari, Shahih Muslim, dan kitab-kitab induk empat mazhab. Bila Anda menemukan kekeliruan dalam cara sesuatu disajikan di sini, mohon kabari kami — halaman ini terus direvisi seiring koreksi yang masuk.',
  footerFiqh: 'Isi fikih di sini untuk dipelajari. Untuk fatwa yang mengikat, tanyakan kepada ulama yang berkompeten.',
  footerPrivacy: 'Aplikasi berjalan di perangkat Anda. Kami tidak pernah mengumpulkan catatan pribadi Anda.',
};

export const articles = [
  // ── 1 ──────────────────────────────────────────────────
  {
    slug: 'menstruation-and-prayer',
    published: '2026-10-17',
    updated: '2026-10-17',
    madhhab: 'Hanafi · Maliki · Syafi‘i · Hanbali',
    title: 'Bolehkah Sholat Saat Haid? Apakah Sholatnya Diqadha?',
    h1: 'Bolehkah sholat saat haid, dan apakah sholat yang terlewat harus diqadha?',
    desc: 'Perempuan haid tidak sholat, dan tidak mengqadha sholat itu. Keempat mazhab sepakat. Yang mereka perselisihkan adalah dua sambungannya — sholat saat darah mulai keluar, dan sholat saat darah berhenti.',
    lead: 'Jawaban singkatnya: **Anda tidak sholat selama haid, dan tidak mengqadhanya setelah suci.** Keempat mazhab sepakat sampai di situ. Perbedaannya ada di dua sambungan — waktu sholat yang di tengahnya darah mulai keluar, dan waktu sholat yang di tengahnya darah berhenti.',
    body: `
## Hukumnya: gugur, dan tidak ada tanggungan

Selama haid seorang perempuan tidak sholat. Ini bukan keringanan yang boleh ia tolak — sholat yang dikerjakan dalam keadaan itu tidak sah. Dan setelahnya tidak ada yang perlu diqadha.

Dalilnya adalah jawaban Aisyah radhiyallahu ‘anha kepada Mu‘adzah, yang bertanya mengapa perempuan haid mengqadha puasa tetapi tidak mengqadha sholat:

> Dahulu hal itu menimpa kami, maka kami diperintahkan mengqadha puasa dan tidak diperintahkan mengqadha sholat.
>> ${AR['muslim-335c']}
> — Aisyah, Shahih Muslim 335c; lihat juga Shahih al-Bukhari 321

Keempat mazhab membaca hadis ini sebagai pembebasan yang utuh, tanpa sisa tanggungan. Alasan yang biasa disebutkan adalah frekuensinya: sholat datang lima kali sehari, sehingga mengqadha satu siklus penuh jauh lebih berat daripada mengqadha puasa sebulan dalam setahun.

## Kapan pembebasan itu mulai berlaku

Kewajiban gugur begitu darah keluar. Pertanyaan yang sebenarnya adalah kasus ini: **waktu sholat sudah masuk, ia belum sholat, lalu darah haid keluar.** Apakah sholat itu menjadi tanggungannya?

| Mazhab | Pendapat |
| --- | --- |
| Hanafi | Tidak ada tanggungan. Kewajiban itu belum mantap sebelum ia gugur. |
| Maliki | Menjadi tanggungan, bila waktu yang berlalu cukup untuk bersuci dan mengerjakan sholat. |
| Syafi‘i | Menjadi tanggungan. Pendapat yang masyhur: cukup bila waktunya memadai untuk sholat itu sendiri — sebagian menyebut cukup selama takbiratul ihram. |
| Hanbali | Menjadi tanggungan. Dekat dengan pendapat Syafi‘i. |

Tiap mazhab masih merincinya lebih jauh soal seberapa banyak waktu yang dihitung. Tabel ini memberi arahnya, bukan kata akhirnya — tanyakan pendapat mana yang dipegang di lingkungan Anda.

## Saat suci tiba, sholat mana yang dikerjakan lebih dulu

Begitu darah berhenti dan tanda suci terlihat, mandi wajib lalu kerjakan sholat yang waktunya sedang berjalan. Yang sering terlewat adalah **bawaan antar sholat yang berpasangan**:

- Suci datang di waktu Asar — **apakah Zuhur juga menjadi tanggungan?**
- Suci datang di waktu Isya — **apakah Maghrib juga menjadi tanggungan?**

Mazhab Maliki, Syafi‘i, dan Hanbali menjawab ya: Zuhur dan Asar adalah pasangan yang boleh dijamak, begitu pula Maghrib dan Isya, dan waktu yang belakangan menanggung sholat yang terdahulu. Ini diriwayatkan dari Ibnu Abbas dan Abdurrahman bin Auf radhiyallahu ‘anhuma.

Mazhab Hanafi menjawab tidak — ia hanya mengerjakan sholat yang waktunya ia dapati dalam keadaan suci.

## Ibadah tidak berhenti pada hari-hari ini

Gugurnya kewajiban sholat bukan jeda dari ibadah. Tidak satu pun dari yang berikut ini terpengaruh, dengan kesepakatan keempat mazhab:

- Dzikir dalam segala bentuknya — tasbih, tahmid, takbir — dan istighfar
- Doa, termasuk segala yang biasa Anda pintakan dalam sujud
- Shalawat kepada Nabi shallallahu ‘alaihi wa sallam
- Mendengarkan bacaan Al-Qur’an, membaca tafsir dan kitab-kitab fikih
- Sedekah, menjenguk orang sakit, berbakti kepada keluarga

Adapun membaca dan menyentuh mushaf itu sendiri memang diperselisihkan dengan serius, dan pembahasannya berdiri sendiri — bahasa Indonesia untuk halaman itu sedang disiapkan.

## Kapan ia bukan haid lagi

Bila darah keluar melewati batas maksimal menurut mazhab yang Anda pegang, ia berhenti disebut haid dan menjadi istihadhah — **dan dalam istihadhah, sholat tetap wajib**. Inilah kekeliruan yang paling mahal di bab ini, sebab yang hilang tidak pernah satu sholat, melainkan puluhan. Dua halaman membahasnya:

- [Bagaimana tahu haid sudah selesai?](/id/guide/end-of-menstruation/)
- [Istihadhah: darah yang tidak menggugurkan sholat](/id/guide/istihadah/)
`,
    faq: [
      { q: 'Apakah sholat yang ditinggalkan saat haid harus diqadha?', a: 'Tidak. Keempat mazhab Ahlus Sunnah sepakat bahwa perempuan haid bebas dari kewajiban sholat dan tidak menanggung apa pun sesudahnya. Dalilnya riwayat Aisyah bahwa mereka diperintahkan mengqadha puasa dan tidak diperintahkan mengqadha sholat (Shahih Muslim 335c).' },
      { q: 'Bolehkah berdoa dan berdzikir saat haid?', a: 'Boleh. Yang gugur hanyalah sholat itu sendiri. Dzikir, istighfar, doa, shalawat, mendengarkan bacaan Al-Qur’an, dan membaca tafsir semuanya tidak dibatasi selama haid, dengan kesepakatan empat mazhab.' },
      { q: 'Jika suci datang di waktu Asar, apakah Zuhur juga dikerjakan?', a: 'Para ulama berbeda pendapat. Mazhab Maliki, Syafi‘i, dan Hanbali menyatakan ya, karena Zuhur dan Asar adalah pasangan yang boleh dijamak dan waktu Asar menanggung Zuhur. Mazhab Hanafi menyatakan ia hanya mengerjakan Asar. Hal yang sama berlaku untuk Maghrib dan Isya.' },
      { q: 'Bagaimana jika haid datang di tengah sholat?', a: 'Sholat itu berakhir di situ, tidak dilanjutkan dan tidak diulang kemudian. Apakah sholat tersebut terhitung sebagai tanggungan — karena waktunya sudah masuk sebelum darah keluar — bergantung pada mazhab: Hanafi menyatakan tidak ada tanggungan, tiga mazhab lainnya umumnya menyatakan ada.' },
    ],
  },

  // ── 2 ──────────────────────────────────────────────────
  {
    slug: 'end-of-menstruation',
    published: '2026-10-17',
    updated: '2026-10-17',
    madhhab: 'Hanafi · Maliki · Syafi‘i · Hanbali',
    title: 'Bagaimana Tahu Haid Sudah Selesai? Flek Cokelat dan Batas Maksimal',
    h1: 'Bagaimana tahu haid sudah selesai?',
    desc: 'Dua tanda suci, arti cairan kuning dan cokelat, batas minimal dan maksimal menurut tiap mazhab, serta cara mandi wajib. Inilah langkah yang menentukan apakah hari ini Anda sholat.',
    lead: 'Halaman ini menentukan pertanyaan yang paling praktis dari semuanya: **apakah hari ini Anda sholat.** Dinyatakan terlalu cepat, sholatnya tidak sah; dinyatakan terlalu lambat, Anda menanggung setiap sholat yang dilewatkan.',
    body: `
## Dua tanda suci

Darah dinyatakan berhenti bila salah satu dari dua tanda ini muncul:

1. **Cairan putih (al-qashshah al-baidha)** — cairan keputihan yang keluar menyusul haid.
2. **Kering sama sekali** — kapas yang dimasukkan lalu dikeluarkan kembali bersih.

Begitulah Aisyah radhiyallahu ‘anha mengajari perempuan-perempuan Anshar. Mereka mengirimkan kapas yang masih menunjukkan cairan, dan beliau menjawab:

> Jangan terburu-buru sampai kalian melihat cairan putih.
>> ${AR['malik-2-99']}
> — Aisyah (semoga Allah meridainya); al-Muwaththa’ Imam Malik, Kitab 2, Hadits 99. Shahih al-Bukhari mengutipnya pada bab haid

## Cairan kuning dan cokelat

Inilah pertanyaan yang paling sering muncul di bab ini, dan jawabannya sepenuhnya bergantung pada **kapan ia muncul**:

- **Masih dalam hari-hari haid** — dihukumi sebagai haid. Ia tidak sholat.
- **Setelah tanda suci terlihat** — bukan haid. Ia sholat seperti biasa.

Dalilnya riwayat Ummu Athiyyah:

> Kami tidak menganggap cairan kuning dan keruh setelah suci sebagai apa pun.
>> ${AR['abudawud-307']}
> — Ummu Athiyyah, Sunan Abu Dawud 307. Shahih al-Bukhari 326 memuat riwayat yang sama tanpa kata “setelah suci”

Mazhab Hanafi menambahkan satu lapis: selama masih dalam hari-hari kebiasaannya, cairan apa pun yang bukan putih bersih dihukumi sebagai darah haid, sampai batas maksimal menurut mazhab itu.

## Batas minimal dan maksimal

Di sinilah mazhab paling berbeda, dan inilah yang menentukan kapan darah berhenti disebut haid dan menjadi istihadhah.

| Mazhab | Minimal | Maksimal | Minimal suci antar haid |
| --- | --- | --- | --- |
| Hanafi | 3 hari | 10 hari | 15 hari |
| Maliki | Tanpa batas minimal — darah apa pun terhitung | 15 hari | 15 hari |
| Syafi‘i | Sehari semalam (24 jam) | 15 hari | 15 hari |
| Hanbali | Sehari semalam (24 jam) | 15 hari | 13 hari |

Dua konsekuensi yang perlu dipegang:

- Darah yang **lebih pendek dari batas minimal mazhab Anda** bukan haid. Sholat pada hari-hari itu wajib dan menjadi tanggungan.
- Darah yang **lebih panjang dari batas maksimal mazhab Anda** adalah istihadhah sejak titik itu — **sholat kembali wajib sejak batas itu terlampaui**, bukan sejak darah akhirnya berhenti. Lihat [Istihadhah](/id/guide/istihadah/).

Karena ambangnya berbeda, perempuan yang sama bisa mendapat tanggal mulai yang berselisih beberapa hari tergantung mazhabnya. **Pilih satu mazhab dan ikuti secara konsisten** — itu jauh lebih selamat daripada mengambil pendapat yang paling ringan setiap bulan.

## Mandi wajib sesudahnya

Setelah suci, mandi wajib harus dikerjakan sebelum sholat. Rukunnya:

1. **Niat** — untuk mengangkat hadas besar.
2. **Air merata ke seluruh tubuh**, termasuk pangkal rambut dan setiap lipatan kulit.

Tentang rambut: kepangan tidak perlu diurai, tetapi air harus sampai ke kulit kepala. Ummu Salamah bertanya persis tentang hal ini, dan dijawab bahwa cukup menuangkan tiga cidukan air ke atas kepala (Shahih Muslim 330).

> Tidak perlu. Cukup bagimu menuangkan tiga cidukan air ke atas kepalamu, lalu menyiramkan air ke seluruh tubuhmu, maka engkau suci.
>> ${AR['muslim-330']}
> — Ummu Salamah, Shahih Muslim 330

Anjuran yang sering dikutip untuk memakai sepotong kapas beraroma kasturi berasal dari jawaban Nabi shallallahu ‘alaihi wa sallam kepada Asma binti Syakal (Shahih Muslim 332c). Itu sunnah, bukan kewajiban.

> Kemudian hendaklah ia mengambil sepotong kapas yang diberi kasturi dan membersihkan diri dengannya.
>> ${AR['muslim-332c']}
> — Aisyah, meriwayatkan jawaban Nabi kepada Asma binti Syakal; Shahih Muslim 332c

## Sholat mana yang dikerjakan lebih dulu

Lihat bagian "Saat suci tiba, sholat mana yang dikerjakan lebih dulu" di [Bolehkah sholat saat haid?](/id/guide/menstruation-and-prayer/) — di situ ada perbedaan pendapat yang nyata tentang sholat yang berpasangan, dan sekali waktu layak dibaca dengan tenang.

## Jika siklus Anda tidak teratur

Bila panjangnya terus berubah, atau darah keluar putus-putus berkepanjangan, hukumnya ditetapkan lewat **kebiasaan (‘adah) dan pembedaan sifat darah (tamyiz)**, yaitu kerangka istihadhah. Adapun siklusnya sendiri adalah urusan dokter: **fikih menyelesaikan ibadahnya, ia tidak mendiagnosis sebabnya.**
`,
    faq: [
      { q: 'Bagaimana tahu haid sudah selesai?', a: 'Dengan salah satu dari dua tanda: munculnya cairan putih (al-qashshah al-baidha), atau kapas yang dimasukkan lalu dikeluarkan kembali bersih sama sekali. Aisyah mengajari perempuan Anshar: jangan terburu-buru sampai kalian melihat cairan putih.' },
      { q: 'Apakah flek cokelat terhitung haid?', a: 'Bergantung kapan ia muncul. Selama masih dalam hari-hari haid, ia dihukumi haid. Setelah tanda suci terlihat, ia bukan haid, dan perempuan itu sholat seperti biasa. Ummu Athiyyah meriwayatkan: kami tidak menganggap cairan kuning dan keruh setelah suci sebagai apa pun (Sunan Abu Dawud 307; Shahih al-Bukhari 326 memuat riwayat yang sama tanpa kata “setelah suci”).' },
      { q: 'Berapa hari paling lama haid berlangsung?', a: 'Mazhab Hanafi menetapkan batas maksimal 10 hari; mazhab Maliki, Syafi‘i, dan Hanbali menetapkan 15 hari. Darah yang keluar melewati batas itu adalah istihadhah, dan sholat kembali wajib sejak titik tersebut.' },
      { q: 'Apakah kepangan rambut harus diurai saat mandi wajib?', a: 'Tidak, tetapi air harus sampai ke pangkal rambut. Ummu Salamah menanyakan hal ini kepada Nabi shallallahu ‘alaihi wa sallam dan dijawab bahwa cukup menuangkan tiga cidukan air ke atas kepala (Shahih Muslim 330).' },
    ],
  },

  // ── 3 ──────────────────────────────────────────────────
  {
    slug: 'istihadah',
    published: '2026-10-17',
    updated: '2026-10-17',
    madhhab: 'Hanafi · Maliki · Syafi‘i · Hanbali',
    title: 'Istihadhah: Darah yang Tidak Menggugurkan Sholat',
    h1: 'Istihadhah: tetap keluar darah, tetapi sholat tetap wajib',
    desc: 'Tidak semua darah adalah haid. Darah yang melewati batas maksimal, atau yang keluar di luar siklus, adalah istihadhah — dan selama istihadhah sholat serta puasa tetap wajib. Cara membedakannya, dan cara berwudhu.',
    lead: '**Kekeliruan termahal di seluruh bab ini.** Memperlakukan istihadhah sebagai haid tidak menghabiskan satu sholat — ia menghabiskan berminggu-minggu sholat, dan semuanya menjadi tanggungan.',
    body: `
## Apa itu istihadhah

Istihadhah adalah darah yang keluar di luar haid dan nifas. Dalam fikih ia digolongkan sebagai **penyakit, bukan keadaan hadas** — dan karena itulah ia tidak berdiri di antara seorang perempuan dan sholatnya.

Fatimah binti Abi Hubaisy mengadu kepada Nabi shallallahu ‘alaihi wa sallam bahwa darahnya keluar terus-menerus, dan beliau menjawab:

> Itu darah dari urat, bukan haid. Maka apabila haidmu datang, tinggalkanlah sholat; dan apabila ia pergi, cucilah darah darimu lalu sholatlah.
>> ${AR['muslim-333']}
> — Shahih al-Bukhari 228; Shahih Muslim 333

## Apa yang berlaku selama istihadhah

- **Kerjakan setiap sholat** — ini wajib, tidak satu pun gugur.
- **Berpuasa seperti biasa**, termasuk puasa Ramadan.
- Mayoritas ulama berpendapat **hubungan suami istri tidak terlarang**.
- Menyentuh dan membaca Al-Qur’an tidak tunduk pada pembatasan haid.

Ringkasnya: **selain cara berwudhu, semuanya berjalan sebagaimana biasa.**

## Cara berwudhu

Istihadhah adalah keadaan berkelanjutan yang membatalkan wudhu, ditangani sama seperti beser atau mimisan yang tidak kunjung berhenti — yaitu kategori orang yang punya uzur tetap (ma‘dzur):

| Mazhab | Pelaksanaan |
| --- | --- |
| Hanafi | Satu wudhu untuk satu **waktu** sholat, berlaku sepanjang waktu itu — untuk sholat wajib maupun sunnah. Ia batal begitu waktunya habis. |
| Maliki | Berwudhu sebelum tiap sholat hukumnya dianjurkan, bukan diwajibkan, karena mazhab ini tidak menganggap istihadhah membatalkan wudhu. |
| Syafi‘i | Cuci darahnya, pakai pembalut, lalu berwudhu sebelum **setiap sholat fardhu**; satu wudhu untuk satu sholat fardhu. |
| Hanbali | Dekat dengan pendapat Syafi‘i — perbarui wudhu sebelum setiap sholat fardhu. |

Semua mazhab mengharuskannya mencuci darah dan memakai pembalut lebih dulu. Darah yang terus keluar setelah wudhu tidak membatalkan sholatnya.

## Membedakan haid dari istihadhah

Tiga cara, diterapkan berurutan:

**1. Kebiasaan (‘adah).** Hari-hari yang biasanya ia haid — sebanyak itu, dimulai pada saat ia biasanya mulai — dihukumi haid; selebihnya istihadhah. Cara ini didahulukan. Ummu Salamah meriwayatkan persis hukum ini bagi perempuan dalam keadaan tersebut: ia menghitung berapa malam dan hari ia dahulu haid setiap bulan, meninggalkan sholat selama itu, lalu mandi dan sholat (Sunan Abu Dawud 274).

> Hendaklah ia menghitung jumlah malam dan hari ia dahulu haid setiap bulan sebelum ditimpa penyakit itu, lalu meninggalkan sholat selama itu setiap bulan. Apabila telah lewat, hendaklah ia mandi, membalut dengan kain, lalu sholat dengannya.
>> ${AR['abudawud-274']}
> — Ummu Salamah, Sunan Abu Dawud 274

**2. Pembedaan sifat darah (tamyiz).** Bila tidak ada kebiasaan yang mapan, darahnya sendiri yang dibaca: darah yang pekat, kental, dan berbau khas adalah haid; darah yang encer dan pucat adalah istihadhah. Ini berasal dari perintah Nabi shallallahu ‘alaihi wa sallam yang lain kepada Fatimah binti Abi Hubaisy.

**3. Kembali ke kebiasaan umum perempuan.** Bila keduanya tidak bisa diterapkan, mayoritas ulama mengikuti hadis Hamnah binti Jahsy dan menghitung 6 atau 7 hari sebulan sebagai haid, selebihnya istihadhah (Sunan Abu Dawud 287). Mazhab Hanafi punya rinciannya sendiri untuk perempuan yang belum punya kebiasaan mapan.

> Ini hanyalah salah satu tendangan setan. Maka hitunglah haidmu enam hari atau tujuh hari, dalam ilmu Allah, kemudian mandilah.
>> ${AR['abudawud-287']}
> — Hamnah binti Jahsy, Sunan Abu Dawud 287

## Tiga keadaan yang benar-benar sering terjadi

**Darah melewati batas maksimal mazhab Anda.** Sepuluh hari menurut mazhab Hanafi, lima belas menurut tiga mazhab lainnya. Semua yang melewati batas itu adalah istihadhah, dan **sholat kembali wajib pada saat batas itu terlampaui** — bukan ketika darah akhirnya berhenti.

**Flek di antara dua haid.** Bila jarak sejak haid terakhir berakhir belum mencapai batas minimal suci (umumnya 15 hari), umumnya dihukumi istihadhah.

**Darah karena kontrasepsi, IUD, atau menjelang menopause.** Fikih menghukuminya dengan kaidah di atas, apa pun sebabnya. **Sebabnya sendiri adalah urusan dokter** — halaman ini menyelesaikan ibadahnya, bukan pengobatannya.

## Mengapa halaman ini layak dibaca dua kali

Salah menarik garis antara haid dan istihadhah tidak membuat Anda kehilangan satu hari, melainkan serangkaian hari. Inilah persis yang dikerjakan mesin fikih NoorWaqt: ia membaca siklus yang Anda catat, menerapkan mazhab yang Anda pilih, dan menetapkan untuk setiap hari apakah sholat menjadi tanggungan — **seluruhnya di ponsel Anda, tanpa ada yang diunggah.**

Terkait: [Bagaimana tahu haid sudah selesai?](/id/guide/end-of-menstruation/) · [Bolehkah sholat saat haid?](/id/guide/menstruation-and-prayer/)
`,
    faq: [
      { q: 'Apakah tetap sholat saat istihadhah?', a: 'Ya. Istihadhah adalah darah di luar haid dan nifas, yang dalam fikih digolongkan sebagai penyakit dan bukan hadas, sehingga sholat tetap wajib. Nabi shallallahu ‘alaihi wa sallam bersabda kepada Fatimah binti Abi Hubaisy: itu darah dari urat, bukan haid… apabila ia pergi, cucilah darah darimu lalu sholatlah (Shahih al-Bukhari 228).' },
      { q: 'Bagaimana membedakan haid dari istihadhah?', a: 'Tiga cara berurutan: pertama kebiasaan siklusnya — hari-hari yang biasanya ia haid dihukumi haid; bila tidak ada kebiasaan yang mapan, sifat darahnya — pekat, kental, dan berbau khas adalah haid, encer dan pucat adalah istihadhah; bila keduanya tidak berlaku, mayoritas ulama menghitung 6 atau 7 hari sebulan sebagai haid.' },
      { q: 'Bagaimana cara berwudhu saat istihadhah?', a: 'Mazhab berbeda pendapat. Mazhab Hanafi membolehkan satu wudhu untuk satu waktu sholat, berlaku sampai waktu itu habis. Mazhab Syafi‘i dan Hanbali mengharuskan mencuci darah, memakai pembalut, dan memperbarui wudhu sebelum setiap sholat fardhu. Semuanya mengharuskan darahnya dibersihkan lebih dulu.' },
      { q: 'Jika darah terus keluar melewati 15 hari, apakah sholat terus ditinggalkan?', a: 'Tidak. Darah yang melewati batas maksimal mazhab Anda — 10 hari menurut Hanafi, 15 hari menurut tiga mazhab lainnya — adalah istihadhah. Sholat kembali wajib sejak batas itu terlampaui, bukan ketika darah akhirnya berhenti.' },
    ],
  },
];
