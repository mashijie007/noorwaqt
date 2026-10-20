/* id.mjs — pemberian nama Arab (Bahasa Indonesia)
 *
 * Satu berkas untuk satu bahasa, dirender oleh tools/build-names.mjs. `ui`
 * adalah teks kerangka halaman (navigasi, footer, ajakan unduh) dan mengikuti
 * pilihan kata di tools/guides/id.mjs; `page` berisi semua yang khas halaman ini.
 *
 * `page.app` diserahkan ke assets/js/names.js sebagai JSON — setiap kalimat
 * yang dicetak generator di peramban ada di sana, dengan penanda gaya {n}.
 *
 * Kaidah penyuntingan:
 *   1. Arti adalah arti kamus, bukan tafsiran yang dipermanis.
 *   2. Bila ulama berbeda pendapat, sebutkan. Bila sepakat, sebutkan juga.
 *   3. Transliterasi ditulis polos tanpa tanda diakritik — alasannya ada di
 *      bagian tentang ejaan.
 *
 * Entri faq juga diterbitkan sebagai data terstruktur FAQPage, jadi setiap
 * jawaban harus utuh berdiri sendiri — jangan menulis "seperti dijelaskan di atas".
 */

import { AR } from '../lib/hadith.mjs';

export const ui = {
  navHome: 'Beranda',
  navGuide: 'Panduan Fikih',
  navNames: 'Nama',
  navDownload: 'Unduh',
  alsoIn: 'Juga tersedia dalam:',
  updated: 'Terakhir diperbarui',
  faqTitle: 'Pertanyaan yang sering muncul',
  relatedTitle: 'Jawaban terkait',
  ctaTitle: 'Jadwal sholat untuk anak yang sedang Anda beri nama',
  ctaBody: 'NoorWaqt menghitung jadwal sholat langsung di ponsel Anda untuk titik mana pun di bumi, dalam 44 bahasa, sesuai mazhab yang Anda ikuti. Tanpa akun, tanpa unggahan.',
  ctaBtn: 'Dapatkan NoorWaqt (Android, gratis)',
  footerFiqh: 'Isi fikih di sini untuk dipelajari. Untuk fatwa yang mengikat, tanyakan kepada ulama yang berkompeten.',
  footerPrivacy: 'Aplikasi berjalan di perangkat Anda. Kami tidak pernah mengumpulkan catatan pribadi Anda.',
};

export const page = {
  updated: '2026-10-20',
  crumb: 'Nama Arab',

  title: 'Generator Nama Arab — 216 Nama Beserta Arti Sebenarnya',
  desc: 'Hasilkan nama Arab dan nama Islami menurut tema, lengkap dengan tulisan Arab, ejaan Latin yang aman untuk dokumen, dan arti harfiahnya. Disertai susunan nama Arab dan nama-nama yang tidak boleh dipakai.',
  h1: 'Generator nama Arab, dengan artinya ditulis apa adanya',
  lead: '216 nama — 125 untuk anak laki-laki, 91 untuk anak perempuan — masing-masing dengan tulisan Arab, ejaan Latin yang selamat melewati formulir paspor, dan arti **harfiah**, bukan tafsiran yang dipermanis. Saring menurut tema, lalu generator menyusunkan nama lengkap klasiknya untuk Anda.',

  reviewNotice: 'Arti di sini adalah arti harfiah — apa yang dikatakan katanya, bukan apa yang nama itu dianggap menjanjikan. Hukum-hukum di separuh bawah halaman ini adalah bahan belajar dan **tidak menggantikan fatwa ulama berkompeten**: bila sebuah nama diperselisihkan di keluarga atau lingkungan Anda, tanyakan kepada ulama setempat. Koreksi atas entri mana pun kami terima dengan senang hati.',
  disclaimer: 'Setiap hukum di halaman ini disertai riwayat yang menjadi sandarannya — Shahih al-Bukhari, Shahih Muslim, Abu Dawud, Tirmidzi — supaya Anda bisa memeriksanya sendiri, bukan sekadar percaya pada kami. Bila Anda menemukan kekeliruan pada sebuah arti atau pada cara sesuatu disajikan di sini, mohon kabari kami: halaman ini terus direvisi seiring koreksi yang masuk.',

  // ── Antarmuka generator ──
  toolTitle: 'Buatkan sebuah nama',
  labelFor: 'Untuk',
  forAny: 'Keduanya',
  forBoy: 'Anak laki-laki',
  forGirl: 'Anak perempuan',
  labelThemes: 'Tema',
  themesNote: '(pilih sesuka hati; kosongkan untuk semua)',
  labelFather: 'Nama ayah — opsional, untuk menyusun nasab',
  fatherPlaceholder: 'mis. Ibrahim',
  goBtn: 'Buatkan enam nama',

  // ── Antarmuka daftar nama ──
  searchPlaceholder: 'Cari nama, arti, tema…',
  searchLabel: 'Cari di seluruh daftar nama',
  colArabic: 'Arab',
  colTranslit: 'Transliterasi',
  colMeaning: 'Arti',
  colFor: 'Untuk',

  /** Teks yang dipakai names.js saat berjalan */
  app: {
    boy: 'putra',
    girl: 'putri',
    copy: 'Salin',
    copied: 'Tersalin',
    copyFailed: 'Gagal menyalin',
    matchCount: '{n} nama cocok dengan saringan Anda',
    noMatch: 'Tidak ada nama dalam daftar yang cocok dengan kombinasi itu. Lepas satu tema lalu coba lagi.',
    tableAll: 'Semua {n} nama',
    tableSome: '{k} dari {n} nama',
    tableEmpty: 'Tidak ada yang cocok.',
    fatherUnknown: 'Nama itu tidak ada dalam daftar, jadi nasabnya tidak ikut ditulis dalam bahasa Arab. Silakan pilih satu nama dari tabel di bawah.',
    fatherReading: 'Dibaca sebagai {name} {ar}.',
  },

  body: `
## Bagaimana sebenarnya nama Arab disusun

Kebanyakan kebingungan soal nama Arab muncul karena ia diperlakukan seperti nama depan plus nama keluarga. Secara klasik, nama Arab adalah rangkaian yang bisa sampai lima bagian, dan hanya bagian pertama yang merupakan nama pemberian:

- **Ism** — nama pemberian itu sendiri. *Muhammad*, *Fatimah*. Inilah yang diambil generator di atas.
- **Nasab** — garis keturunan, didahului *bin*/*ibn* (putra dari) atau *binti* (putri dari), dan bisa disambung terus ke kakek dan seterusnya.
- **Kunyah** — *Abu* (ayah dari) atau *Ummu* (ibu dari) ditambah nama anak sulung. Ini bentuk penghormatan, dan di kebanyakan masyarakat baru melekat setelah anak pertama lahir — tetapi tidak selalu: Nabi (semoga salawat dan salam tercurah kepadanya) memanggil seorang anak kecil yang belum punya anak sama sekali dengan *Abu Umair* (Shahih al-Bukhari 6129).
- **Laqab** — gelar yang diperoleh kemudian: *ar-Rasyid*, *ash-Shiddiq*.
- **Nisbah** — penanda asal: tempat, kabilah, atau profesi. *al-Baghdadi*, *asy-Syafi‘i*.

> Wahai Abu Umair, apa yang dilakukan burung kecil itu?
>> ${AR['bukhari-6129']}
> — Anas bin Malik, Shahih al-Bukhari 6129

Dirangkai menjadi: **Abu Abdullah Muhammad bin Idris asy-Syafi‘i** — kunyah, ism, nasab, nisbah. Itu satu orang, dan tidak satu pun bagiannya berfungsi sebagai nama keluarga dalam pengertian modern.

Bayi yang baru lahir hanya perlu ism. Nasab mengikuti nama ayah dengan sendirinya, dan kunyah datang puluhan tahun kemudian. Karena itu generator ini hanya menanyakan nama ayah, tidak yang lain.

## Aturan yang benar-benar membatasi pilihan

Ruang penamaan itu luas: pada dasarnya setiap nama yang artinya baik diperbolehkan. Ada empat hal yang mempersempitnya.

### 1. Dua nama disebut secara khusus

> Nama kalian yang paling dicintai Allah adalah Abdullah dan Abdurrahman.
>> ${AR['muslim-2132']}
> — Shahih Muslim 2132

Ini anjuran, bukan larangan atas nama-nama lain. Memberi nama dengan nama nabi juga dianjurkan, tetapi dalilnya terpisah, bukan hadis di atas: Nabi (semoga salawat dan salam tercurah kepadanya) menamai putranya yang baru lahir dengan nama Ibrahim (Shahih Muslim 2315).

> Tadi malam telah lahir seorang anak untukku, dan aku menamainya dengan nama ayahku, Ibrahim.
>> ${AR['muslim-2315']}
> — Anas bin Malik, Shahih Muslim 2315

### 2. Nama yang khusus milik Allah tidak diberikan kepada manusia secara berdiri sendiri

Nama yang hanya milik Allah dipakai dalam bentuk *Abdul* (hamba dari). Tanpa penghambaan itu, nama tersebut tidak diberikan:

[[solo]]

Pembedanya ada pada alif lam dan pada kekhususannya. **Karim**, **Rasyid**, **Hakim**, dan **Malik** juga dipakai untuk menyifati manusia, jadi bebas dipakai sebagai nama; sedangkan *al-Karim*, *ar-Rahman*, dan *al-Khaliq* sebagai sebutan tidak. Lalu penghambaan itu hanya satu arah — *Abdu* yang disandingkan dengan selain Allah (Abdun Nabi, Abdul Husain, Abdul Masih) ditolak oleh mayoritas besar ulama, karena penghambaan hanya milik Allah.

Atas dasar yang sama, Nabi (semoga salawat dan salam tercurah kepadanya) mengingatkan agar tidak memakai nama *Malikul Amlak* — raja diraja. Ada dua riwayat, lafalnya sedikit berbeda:

> Nama yang paling buruk di sisi Allah pada hari kiamat adalah orang yang menamai dirinya Malikul Amlak (raja diraja).
>> ${AR['bukhari-6205']}
> — Abu Hurairah, Shahih al-Bukhari 6205

> Nama yang paling hina di sisi Allah adalah orang yang menamai dirinya Malikul Amlak (raja diraja).
>> ${AR['muslim-2143']}
> — Abu Hurairah, Shahih Muslim 2143

Judul bab Muslim sendiri mencakup kedua bentuknya, *Malikul Amlak* dan *Malikul Muluk*.

### 3. Nama yang memuji penyandangnya diganti

Zainab binti Abi Salamah semula bernama *Barrah* — "yang saleh". Nabi (semoga salawat dan salam tercurah kepadanya) menggantinya, dan alasannya adalah sabda beliau sendiri: jangan menganggap diri kalian suci, Allah yang paling tahu siapa di antara kalian yang benar-benar baik (Shahih Muslim 2142b). Seorang perempuan bernama *‘Ashiyah* — عاصية, "yang durhaka" — beliau ganti menjadi *Jamilah* (Shahih Muslim 2139). Itu bukan *Asiya* yang ada di tabel bawah: آسية, istri Fir‘aun, adalah kata yang berbeda dan kebetulan ejaan Latinnya mirip.

> Janganlah kalian menganggap diri kalian suci; Allah lebih mengetahui siapa di antara kalian ahli kebajikan.
>> ${AR['muslim-2142b']}
> — Zainab binti Abi Salamah, Shahih Muslim 2142b

> Rasulullah (semoga salawat dan salam tercurah kepadanya) mengganti nama ‘Ashiyah (“yang durhaka”) dan bersabda: Engkau Jamilah.
>> ${AR['muslim-2139']}
> — Ibnu Umar, Shahih Muslim 2139

Ada dua ujian yang bisa diajukan kepada nama mana pun, tetapi ketegasannya tidak sama.

**Artinya tidak boleh buruk** — yang ini tidak diperselisihkan; Nabi (semoga salawat dan salam tercurah kepadanya) mengganti "yang durhaka" menjadi "yang cantik".

**Nama tidak boleh memperlakukan ketakwaan penyandangnya sebagai perkara yang sudah pasti** — inilah inti perkara Barrah, dan alasannya disebutkan di dalam hadisnya sendiri: jangan mengaku diri suci, karena Allah yang paling tahu siapa yang bertakwa.

Sampai di mana persisnya batas yang kedua itu, para ulama berbeda pendapat, jadi halaman ini tidak menariknya untuk Anda. Tabel di bawah justru memuat nama-nama jenis itu — *Taqi* (bertakwa), *Zaki* (suci), *Siddiq* (jujur lagi membenarkan) — dipakai di setiap zaman, oleh para sahabat maupun para ulama, sekaligus yang paling dekat dengan batas tersebut. Kalau salah satunya adalah nama yang Anda inginkan, bawalah kepada ulama di lingkungan Anda sendiri.

### 4. Bahasa nama bukan persoalannya

Tidak ada keharusan nama seorang muslim berbahasa Arab. Nama Turki, Persia, Urdu, Melayu, Bosnia, Hausa, dan nama muslim Tionghoa semuanya hanyalah nama, dinilai dari artinya. Ukuran yang sama berlaku untuk nama Arab — banyak nama Arab yang, begitu dicari artinya, tidak akan dipakai siapa pun.

Bagi mualaf, kaidah ini berlaku dua arah: **tidak ada kewajiban mengganti nama saat masuk Islam.** Sebagian besar sahabat tetap memakai nama yang mereka sandang sejak lahir. Penggantian baru diperlukan bila artinya bertentangan — penghambaan kepada selain Allah, atau nama sesembahan.

## Kapan nama diberikan

Praktik yang diriwayatkan adalah hari ketujuh, bersamaan dengan akikah dan mencukur rambut. Pemberian nama pada hari kelahiran juga diriwayatkan — Nabi (semoga salawat dan salam tercurah kepadanya) menamai putranya Ibrahim pada malam ia dilahirkan (Shahih Muslim 2315, dikutip di atas) — sehingga hari ketujuh adalah anjuran yang kuat, bukan batas waktu.

> Setiap anak laki-laki tergadai dengan akikahnya: disembelihkan untuknya pada hari ketujuh, dicukur rambutnya, dan diberi nama.
>> ${AR['abudawud-2838']}
> — Samurah bin Jundub, Sunan Abu Dawud 2838. Jami‘ at-Tirmidzi 1522 memuat riwayat yang sama

## Satu catatan praktis tentang ejaan

Transliterasi di sini sengaja ditulis polos: *Abd al-Rahman*, bukan *ʿAbd al-Raḥmān*. Transliterasi akademis memang lebih presisi, tetapi tidak selamat melewati kantor paspor: zona baca-mesin pada paspor hanya memuat A–Z tanpa tanda diakritik, sehingga tanda-tanda itu pasti dibuang atau diganti di suatu tahap, dan belum tentu dengan cara yang sama dua kali. Pilih ejaan polos, lalu pakai ejaan **yang sama** di setiap dokumen sejak yang pertama — *Mohammed* di satu dokumen dan *Muhammad* di dokumen lain adalah ketidakcocokan yang nanti harus dibereskan satu per satu dari loket ke loket.

## Telusuri seluruh 216 nama

Setiap nama Arab ditulis lengkap dengan harakatnya (*tashkil*), jadi bisa langsung dibaca: *fathah* ـَ dibaca "a" pendek, *dhammah* ـُ "u" pendek, *kasrah* ـِ "i" pendek, *sukun* ـْ berarti tidak ada vokal sesudahnya, dan *syaddah* ـّ menggandakan konsonan. Vokal panjang adalah huruf alif, wawu, dan ya itu sendiri dan tidak diberi tanda. Nama ditampilkan sebagaimana diucapkan sendirian, tanpa akhiran tata bahasa yang muncul dalam kalimat utuh. Saat disalin, yang tersalin adalah tulisan tanpa harakat, karena harakat tidak tampil sempurna di semua sistem.

Cari menurut ejaan Latin, tulisan Arab (dengan atau tanpa harakat), arti, atau tema. Inilah daftar lengkap yang dipakai generator di atas — termasuk ke-24 nabi yang disebut dalam Al-Qur’an dan memang dipakai sebagai nama.
`,

  faq: [
    { q: 'Apa nama terbaik dalam Islam?', a: 'Nabi (semoga salawat dan salam tercurah kepadanya) bersabda bahwa nama kalian yang paling dicintai Allah adalah Abdullah dan Abdurrahman (Shahih Muslim 2132). Selain keduanya, setiap nama yang artinya baik diperbolehkan; memberi nama dengan nama nabi juga dianjurkan, tetapi dengan dalilnya sendiri yang terpisah (Shahih Muslim 2315).' },
    { q: 'Kapan sebaiknya bayi diberi nama?', a: 'Praktik yang diriwayatkan adalah pada hari ketujuh, bersamaan dengan akikah dan mencukur rambut (Abu Dawud 2838, Tirmidzi 1522). Pemberian nama pada hari kelahiran juga diriwayatkan — Nabi (semoga salawat dan salam tercurah kepadanya) menamai putranya Ibrahim pada malam ia dilahirkan (Shahih Muslim 2315) — sehingga hari ketujuh adalah anjuran yang kuat, bukan batas waktu.' },
    { q: 'Bolehkah anak dinamai ar-Rahman atau al-Malik?', a: 'Tidak. Nama yang khusus milik Allah tidak diberikan kepada manusia secara berdiri sendiri; nama itu dipakai dalam bentuk Abdurrahman atau Abdul Malik — hamba Yang Maha Pengasih, hamba Yang Maha Merajai. Nama yang juga dipakai untuk makhluk, seperti Karim atau Malik tanpa alif lam, diperbolehkan.' },
    { q: 'Apakah mualaf harus mengganti namanya?', a: 'Tidak. Nama perlu diganti hanya bila artinya bertentangan dengan Islam — penghambaan kepada selain Allah, atau nama sesembahan. Sebagian besar sahabat tetap memakai nama mereka sejak lahir; Nabi (semoga salawat dan salam tercurah kepadanya) mengganti sebuah nama ketika artinya tidak pantas, atau ketika nama itu mengklaim ketakwaan bagi penyandangnya.' },
    { q: 'Apa arti bin dan binti dalam nama Arab?', a: 'Bin (atau ibn) berarti "putra dari" dan binti berarti "putri dari". Keduanya mengantar nasab, yaitu bagian garis keturunan dalam nama klasik: Muhammad bin Idris berarti Muhammad, putra Idris.' },
  ],

  related: [
    { href: '/id/guide/', title: 'Panduan Fikih', desc: 'Haid, nifas, istihadhah, kehamilan — satu pertanyaan satu halaman, lengkap dengan dalil dan setiap perbedaan pendapat ditulis apa adanya.' },
    { href: '/id/guide/menstruation-and-prayer/', title: 'Sholat saat haid', desc: 'Sholat gugur dan tidak diqadha — yang diperselisihkan justru sholat di awal dan akhir masa haid.' },
    { href: '/id/guide/istihadah/', title: 'Istihadhah', desc: 'Darah yang tidak menggugurkan sholat: cara membedakannya dari haid, dan apa yang harus dikerjakan.' },
  ],
};
