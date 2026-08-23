/* cities.js — 全球礼拜地图的城市锚点
 *
 * 字段: [英文名, 中文名, 阿文名, 纬度, 经度, IANA 时区, （旧）计算方法, 国家码]
 * 时区只存 IANA 名称，不存偏移量 —— 夏令时交给浏览器处理。
 *
 * 计算方法不在这里指定：它由 prayer.js 的 resolveMethod() 按坐标推出，
 * 而那份区域表逐条对应 App 的 PrayerMethodResolver。网站和 App 因此
 * 对同一个坐标必然选中同一种算法。第 7 个参数保留但已不再使用。
 */
import { resolveMethod } from './prayer.js';

const C = (en, zh, ar, lat, lon, tz, _legacyMethod, cc) => ({
  en, zh, ar, lat, lon, tz, cc, method: resolveMethod(lat, lon),
});

export const CITIES = [
  // ── 两圣地与阿拉伯半岛 ──────────────────────────────
  C('Makkah', '麦加', 'مكة المكرمة', 21.4225, 39.8262, 'Asia/Riyadh', 'makkah', 'SA'),
  C('Madinah', '麦地那', 'المدينة المنورة', 24.4686, 39.6142, 'Asia/Riyadh', 'makkah', 'SA'),
  C('Riyadh', '利雅得', 'الرياض', 24.7136, 46.6753, 'Asia/Riyadh', 'makkah', 'SA'),
  C('Jeddah', '吉达', 'جدة', 21.4858, 39.1925, 'Asia/Riyadh', 'makkah', 'SA'),
  C('Dammam', '达曼', 'الدمام', 26.3927, 49.9777, 'Asia/Riyadh', 'makkah', 'SA'),
  C('Dubai', '迪拜', 'دبي', 25.2048, 55.2708, 'Asia/Dubai', 'makkah', 'AE'),
  C('Abu Dhabi', '阿布扎比', 'أبو ظبي', 24.4539, 54.3773, 'Asia/Dubai', 'makkah', 'AE'),
  C('Doha', '多哈', 'الدوحة', 25.2854, 51.5310, 'Asia/Qatar', 'makkah', 'QA'),
  C('Kuwait City', '科威特城', 'مدينة الكويت', 29.3759, 47.9774, 'Asia/Kuwait', 'makkah', 'KW'),
  C('Manama', '麦纳麦', 'المنامة', 26.2285, 50.5860, 'Asia/Bahrain', 'makkah', 'BH'),
  C('Muscat', '马斯喀特', 'مسقط', 23.5880, 58.3829, 'Asia/Muscat', 'makkah', 'OM'),
  C('Sanaa', '萨那', 'صنعاء', 15.3694, 44.1910, 'Asia/Aden', 'makkah', 'YE'),
  C('Aden', '亚丁', 'عدن', 12.7855, 45.0187, 'Asia/Aden', 'makkah', 'YE'),

  // ── 新月沃地与波斯 ──────────────────────────────────
  C('Baghdad', '巴格达', 'بغداد', 33.3152, 44.3661, 'Asia/Baghdad', 'karachi', 'IQ'),
  C('Basra', '巴士拉', 'البصرة', 30.5085, 47.7804, 'Asia/Baghdad', 'karachi', 'IQ'),
  C('Erbil', '埃尔比勒', 'أربيل', 36.1911, 44.0092, 'Asia/Baghdad', 'karachi', 'IQ'),
  C('Tehran', '德黑兰', 'طهران', 35.6892, 51.3890, 'Asia/Tehran', 'tehran', 'IR'),
  C('Mashhad', '马什哈德', 'مشهد', 36.2605, 59.6168, 'Asia/Tehran', 'tehran', 'IR'),
  C('Isfahan', '伊斯法罕', 'أصفهان', 32.6546, 51.6680, 'Asia/Tehran', 'tehran', 'IR'),
  C('Damascus', '大马士革', 'دمشق', 33.5138, 36.2765, 'Asia/Damascus', 'mwl', 'SY'),
  C('Aleppo', '阿勒颇', 'حلب', 36.2021, 37.1343, 'Asia/Damascus', 'mwl', 'SY'),
  C('Beirut', '贝鲁特', 'بيروت', 33.8938, 35.5018, 'Asia/Beirut', 'mwl', 'LB'),
  C('Amman', '安曼', 'عمّان', 31.9454, 35.9284, 'Asia/Amman', 'mwl', 'JO'),
  C('Jerusalem', '耶路撒冷', 'القدس', 31.7683, 35.2137, 'Asia/Jerusalem', 'egypt', 'PS'),
  C('Gaza', '加沙', 'غزة', 31.5017, 34.4668, 'Asia/Hebron', 'egypt', 'PS'),

  // ── 土耳其与巴尔干 ──────────────────────────────────
  C('Istanbul', '伊斯坦布尔', 'إسطنبول', 41.0082, 28.9784, 'Europe/Istanbul', 'diyanet', 'TR'),
  C('Ankara', '安卡拉', 'أنقرة', 39.9334, 32.8597, 'Europe/Istanbul', 'diyanet', 'TR'),
  C('Izmir', '伊兹密尔', 'إزمير', 38.4237, 27.1428, 'Europe/Istanbul', 'diyanet', 'TR'),
  C('Konya', '科尼亚', 'قونية', 37.8746, 32.4932, 'Europe/Istanbul', 'diyanet', 'TR'),
  C('Sarajevo', '萨拉热窝', 'سراييفو', 43.8563, 18.4131, 'Europe/Sarajevo', 'mwl', 'BA'),
  C('Pristina', '普里什蒂纳', 'بريشتينا', 42.6629, 21.1655, 'Europe/Belgrade', 'mwl', 'XK'),
  C('Tirana', '地拉那', 'تيرانا', 41.3275, 19.8187, 'Europe/Tirane', 'mwl', 'AL'),
  C('Skopje', '斯科普里', 'سكوبيه', 41.9973, 21.4280, 'Europe/Skopje', 'mwl', 'MK'),
  C('Baku', '巴库', 'باكو', 40.4093, 49.8671, 'Asia/Baku', 'mwl', 'AZ'),

  // ── 北非 ────────────────────────────────────────────
  C('Cairo', '开罗', 'القاهرة', 30.0444, 31.2357, 'Africa/Cairo', 'egypt', 'EG'),
  C('Alexandria', '亚历山大', 'الإسكندرية', 31.2001, 29.9187, 'Africa/Cairo', 'egypt', 'EG'),
  C('Khartoum', '喀土穆', 'الخرطوم', 15.5007, 32.5599, 'Africa/Khartoum', 'egypt', 'SD'),
  C('Tripoli', '的黎波里', 'طرابلس', 32.8872, 13.1913, 'Africa/Tripoli', 'egypt', 'LY'),
  C('Benghazi', '班加西', 'بنغازي', 32.1167, 20.0667, 'Africa/Tripoli', 'egypt', 'LY'),
  C('Tunis', '突尼斯', 'تونس', 36.8065, 10.1815, 'Africa/Tunis', 'mwl', 'TN'),
  C('Algiers', '阿尔及尔', 'الجزائر', 36.7538, 3.0588, 'Africa/Algiers', 'mwl', 'DZ'),
  C('Oran', '奥兰', 'وهران', 35.6969, -0.6331, 'Africa/Algiers', 'mwl', 'DZ'),
  C('Casablanca', '卡萨布兰卡', 'الدار البيضاء', 33.5731, -7.5898, 'Africa/Casablanca', 'mwl', 'MA'),
  C('Rabat', '拉巴特', 'الرباط', 34.0209, -6.8416, 'Africa/Casablanca', 'mwl', 'MA'),
  C('Fes', '非斯', 'فاس', 34.0181, -5.0078, 'Africa/Casablanca', 'mwl', 'MA'),
  C('Marrakesh', '马拉喀什', 'مراكش', 31.6295, -7.9811, 'Africa/Casablanca', 'mwl', 'MA'),
  C('Nouakchott', '努瓦克肖特', 'نواكشوط', 18.0735, -15.9582, 'Africa/Nouakchott', 'mwl', 'MR'),

  // ── 撒哈拉以南非洲 ──────────────────────────────────
  C('Dakar', '达喀尔', 'داكار', 14.7167, -17.4677, 'Africa/Dakar', 'mwl', 'SN'),
  C('Bamako', '巴马科', 'باماكو', 12.6392, -8.0029, 'Africa/Bamako', 'mwl', 'ML'),
  C('Ouagadougou', '瓦加杜古', 'واغادوغو', 12.3714, -1.5197, 'Africa/Ouagadougou', 'mwl', 'BF'),
  C('Niamey', '尼亚美', 'نيامي', 13.5117, 2.1251, 'Africa/Niamey', 'mwl', 'NE'),
  C('Kano', '卡诺', 'كانو', 12.0022, 8.5920, 'Africa/Lagos', 'mwl', 'NG'),
  C('Lagos', '拉各斯', 'لاغوس', 6.5244, 3.3792, 'Africa/Lagos', 'mwl', 'NG'),
  C('Abuja', '阿布贾', 'أبوجا', 9.0765, 7.3986, 'Africa/Lagos', 'mwl', 'NG'),
  C('N Djamena', '恩贾梅纳', 'إنجامينا', 12.1348, 15.0557, 'Africa/Ndjamena', 'mwl', 'TD'),
  C('Mogadishu', '摩加迪沙', 'مقديشو', 2.0469, 45.3182, 'Africa/Mogadishu', 'mwl', 'SO'),
  C('Djibouti', '吉布提', 'جيبوتي', 11.5721, 43.1456, 'Africa/Djibouti', 'mwl', 'DJ'),
  C('Addis Ababa', '亚的斯亚贝巴', 'أديس أبابا', 9.0300, 38.7400, 'Africa/Addis_Ababa', 'mwl', 'ET'),
  C('Nairobi', '内罗毕', 'نيروبي', -1.2921, 36.8219, 'Africa/Nairobi', 'mwl', 'KE'),
  C('Dar es Salaam', '达累斯萨拉姆', 'دار السلام', -6.7924, 39.2083, 'Africa/Dar_es_Salaam', 'mwl', 'TZ'),
  C('Zanzibar', '桑给巴尔', 'زنجبار', -6.1659, 39.2026, 'Africa/Dar_es_Salaam', 'mwl', 'TZ'),
  C('Accra', '阿克拉', 'أكرا', 5.6037, -0.1870, 'Africa/Accra', 'mwl', 'GH'),
  C('Johannesburg', '约翰内斯堡', 'جوهانسبرغ', -26.2041, 28.0473, 'Africa/Johannesburg', 'mwl', 'ZA'),
  C('Cape Town', '开普敦', 'كيب تاون', -33.9249, 18.4241, 'Africa/Johannesburg', 'mwl', 'ZA'),

  // ── 中亚与高加索 ────────────────────────────────────
  C('Kabul', '喀布尔', 'كابل', 34.5553, 69.2075, 'Asia/Kabul', 'karachi', 'AF'),
  C('Herat', '赫拉特', 'هرات', 34.3529, 62.2040, 'Asia/Kabul', 'karachi', 'AF'),
  C('Tashkent', '塔什干', 'طشقند', 41.2995, 69.2401, 'Asia/Tashkent', 'mwl', 'UZ'),
  C('Samarkand', '撒马尔罕', 'سمرقند', 39.6270, 66.9750, 'Asia/Tashkent', 'mwl', 'UZ'),
  C('Bukhara', '布哈拉', 'بخارى', 39.7747, 64.4286, 'Asia/Tashkent', 'mwl', 'UZ'),
  C('Almaty', '阿拉木图', 'ألماتي', 43.2220, 76.8512, 'Asia/Almaty', 'mwl', 'KZ'),
  C('Astana', '阿斯塔纳', 'أستانا', 51.1694, 71.4491, 'Asia/Almaty', 'mwl', 'KZ'),
  C('Bishkek', '比什凯克', 'بيشكيك', 42.8746, 74.5698, 'Asia/Bishkek', 'mwl', 'KG'),
  C('Dushanbe', '杜尚别', 'دوشنبه', 38.5598, 68.7870, 'Asia/Dushanbe', 'mwl', 'TJ'),
  C('Ashgabat', '阿什哈巴德', 'عشق آباد', 37.9601, 58.3261, 'Asia/Ashgabat', 'mwl', 'TM'),

  // ── 中国 ────────────────────────────────────────────
  C('Kashgar', '喀什', 'كاشغر', 39.4704, 75.9898, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Urumqi', '乌鲁木齐', 'أورومتشي', 43.8256, 87.6168, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Yinchuan', '银川', 'ينتشوان', 38.4872, 106.2309, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Lanzhou', '兰州', 'لانتشو', 36.0611, 103.8343, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Xian', '西安', 'شيان', 34.3416, 108.9398, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Beijing', '北京', 'بكين', 39.9042, 116.4074, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Shanghai', '上海', 'شنغهاي', 31.2304, 121.4737, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Guangzhou', '广州', 'قوانغتشو', 23.1291, 113.2644, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Kunming', '昆明', 'كونمينغ', 25.0389, 102.7183, 'Asia/Shanghai', 'mwl', 'CN'),
  C('Hong Kong', '香港', 'هونغ كونغ', 22.3193, 114.1694, 'Asia/Hong_Kong', 'mwl', 'HK'),

  // ── 南亚 ────────────────────────────────────────────
  C('Islamabad', '伊斯兰堡', 'إسلام آباد', 33.6844, 73.0479, 'Asia/Karachi', 'karachi', 'PK'),
  C('Lahore', '拉合尔', 'لاهور', 31.5204, 74.3587, 'Asia/Karachi', 'karachi', 'PK'),
  C('Karachi', '卡拉奇', 'كراتشي', 24.8607, 67.0011, 'Asia/Karachi', 'karachi', 'PK'),
  C('Peshawar', '白沙瓦', 'بيشاور', 34.0151, 71.5249, 'Asia/Karachi', 'karachi', 'PK'),
  C('Delhi', '德里', 'دلهي', 28.6139, 77.2090, 'Asia/Kolkata', 'karachi', 'IN'),
  C('Mumbai', '孟买', 'مومباي', 19.0760, 72.8777, 'Asia/Kolkata', 'karachi', 'IN'),
  C('Hyderabad', '海得拉巴', 'حيدر آباد', 17.3850, 78.4867, 'Asia/Kolkata', 'karachi', 'IN'),
  C('Lucknow', '勒克瑙', 'لكناو', 26.8467, 80.9462, 'Asia/Kolkata', 'karachi', 'IN'),
  C('Kolkata', '加尔各答', 'كولكاتا', 22.5726, 88.3639, 'Asia/Kolkata', 'karachi', 'IN'),
  C('Srinagar', '斯利那加', 'سريناغار', 34.0837, 74.7973, 'Asia/Kolkata', 'karachi', 'IN'),
  C('Dhaka', '达卡', 'دكا', 23.8103, 90.4125, 'Asia/Dhaka', 'karachi', 'BD'),
  C('Chittagong', '吉大港', 'شيتاغونغ', 22.3569, 91.7832, 'Asia/Dhaka', 'karachi', 'BD'),
  C('Colombo', '科伦坡', 'كولومبو', 6.9271, 79.8612, 'Asia/Colombo', 'karachi', 'LK'),
  C('Male', '马累', 'ماليه', 4.1755, 73.5093, 'Indian/Maldives', 'karachi', 'MV'),

  // ── 东南亚与东亚 ────────────────────────────────────
  C('Jakarta', '雅加达', 'جاكرتا', -6.2088, 106.8456, 'Asia/Jakarta', 'kemenag', 'ID'),
  C('Bandung', '万隆', 'باندونغ', -6.9175, 107.6191, 'Asia/Jakarta', 'kemenag', 'ID'),
  C('Surabaya', '泗水', 'سورابايا', -7.2575, 112.7521, 'Asia/Jakarta', 'kemenag', 'ID'),
  C('Medan', '棉兰', 'ميدان', 3.5952, 98.6722, 'Asia/Jakarta', 'kemenag', 'ID'),
  C('Makassar', '望加锡', 'ماكاسار', -5.1477, 119.4327, 'Asia/Makassar', 'kemenag', 'ID'),
  C('Banda Aceh', '班达亚齐', 'باندا آتشيه', 5.5483, 95.3238, 'Asia/Jakarta', 'kemenag', 'ID'),
  C('Kuala Lumpur', '吉隆坡', 'كوالالمبور', 3.1390, 101.6869, 'Asia/Kuala_Lumpur', 'kemenag', 'MY'),
  C('Johor Bahru', '新山', 'جوهور بهرو', 1.4927, 103.7414, 'Asia/Kuala_Lumpur', 'kemenag', 'MY'),
  C('Kota Kinabalu', '亚庇', 'كوتا كينابالو', 5.9804, 116.0735, 'Asia/Kuala_Lumpur', 'kemenag', 'MY'),
  C('Singapore', '新加坡', 'سنغافورة', 1.3521, 103.8198, 'Asia/Singapore', 'kemenag', 'SG'),
  C('Bandar Seri Begawan', '斯里巴加湾市', 'بندر سري بكاوان', 4.9031, 114.9398, 'Asia/Brunei', 'kemenag', 'BN'),
  C('Manila', '马尼拉', 'مانيلا', 14.5995, 120.9842, 'Asia/Manila', 'mwl', 'PH'),
  C('Bangkok', '曼谷', 'بانكوك', 13.7563, 100.5018, 'Asia/Bangkok', 'mwl', 'TH'),
  C('Ho Chi Minh City', '胡志明市', 'مدينة هوشي منه', 10.8231, 106.6297, 'Asia/Ho_Chi_Minh', 'mwl', 'VN'),
  C('Seoul', '首尔', 'سيول', 37.5665, 126.9780, 'Asia/Seoul', 'mwl', 'KR'),
  C('Tokyo', '东京', 'طوكيو', 35.6762, 139.6503, 'Asia/Tokyo', 'mwl', 'JP'),
  C('Osaka', '大阪', 'أوساكا', 34.6937, 135.5023, 'Asia/Tokyo', 'mwl', 'JP'),

  // ── 欧洲 ────────────────────────────────────────────
  C('London', '伦敦', 'لندن', 51.5074, -0.1278, 'Europe/London', 'mwl', 'GB'),
  C('Birmingham', '伯明翰', 'برمنغهام', 52.4862, -1.8904, 'Europe/London', 'mwl', 'GB'),
  C('Manchester', '曼彻斯特', 'مانشستر', 53.4808, -2.2426, 'Europe/London', 'mwl', 'GB'),
  C('Paris', '巴黎', 'باريس', 48.8566, 2.3522, 'Europe/Paris', 'mwl', 'FR'),
  C('Marseille', '马赛', 'مرسيليا', 43.2965, 5.3698, 'Europe/Paris', 'mwl', 'FR'),
  C('Berlin', '柏林', 'برلين', 52.5200, 13.4050, 'Europe/Berlin', 'mwl', 'DE'),
  C('Cologne', '科隆', 'كولونيا', 50.9375, 6.9603, 'Europe/Berlin', 'mwl', 'DE'),
  C('Amsterdam', '阿姆斯特丹', 'أمستردام', 52.3676, 4.9041, 'Europe/Amsterdam', 'mwl', 'NL'),
  C('Brussels', '布鲁塞尔', 'بروكسل', 50.8503, 4.3517, 'Europe/Brussels', 'mwl', 'BE'),
  C('Madrid', '马德里', 'مدريد', 40.4168, -3.7038, 'Europe/Madrid', 'mwl', 'ES'),
  C('Barcelona', '巴塞罗那', 'برشلونة', 41.3874, 2.1686, 'Europe/Madrid', 'mwl', 'ES'),
  C('Rome', '罗马', 'روما', 41.9028, 12.4964, 'Europe/Rome', 'mwl', 'IT'),
  C('Vienna', '维也纳', 'فيينا', 48.2082, 16.3738, 'Europe/Vienna', 'mwl', 'AT'),
  C('Stockholm', '斯德哥尔摩', 'ستوكهولم', 59.3293, 18.0686, 'Europe/Stockholm', 'mwl', 'SE'),
  C('Oslo', '奥斯陆', 'أوسلو', 59.9139, 10.7522, 'Europe/Oslo', 'mwl', 'NO'),
  C('Copenhagen', '哥本哈根', 'كوبنهاغن', 55.6761, 12.5683, 'Europe/Copenhagen', 'mwl', 'DK'),
  C('Moscow', '莫斯科', 'موسكو', 55.7558, 37.6173, 'Europe/Moscow', 'mwl', 'RU'),
  C('Kazan', '喀山', 'قازان', 55.7963, 49.1088, 'Europe/Moscow', 'mwl', 'RU'),

  // ── 美洲 ────────────────────────────────────────────
  C('New York', '纽约', 'نيويورك', 40.7128, -74.0060, 'America/New_York', 'isna', 'US'),
  C('Dearborn', '迪尔伯恩', 'ديربورن', 42.3223, -83.1763, 'America/Detroit', 'isna', 'US'),
  C('Chicago', '芝加哥', 'شيكاغو', 41.8781, -87.6298, 'America/Chicago', 'isna', 'US'),
  C('Houston', '休斯敦', 'هيوستن', 29.7604, -95.3698, 'America/Chicago', 'isna', 'US'),
  C('Los Angeles', '洛杉矶', 'لوس أنجلوس', 34.0522, -118.2437, 'America/Los_Angeles', 'isna', 'US'),
  C('Toronto', '多伦多', 'تورونتو', 43.6532, -79.3832, 'America/Toronto', 'isna', 'CA'),
  C('Montreal', '蒙特利尔', 'مونتريال', 45.5019, -73.5674, 'America/Toronto', 'isna', 'CA'),
  C('Vancouver', '温哥华', 'فانكوفر', 49.2827, -123.1207, 'America/Vancouver', 'isna', 'CA'),
  C('Mexico City', '墨西哥城', 'مكسيكو سيتي', 19.4326, -99.1332, 'America/Mexico_City', 'isna', 'MX'),
  C('Paramaribo', '帕拉马里博', 'باراماريبو', 5.8520, -55.2038, 'America/Paramaribo', 'mwl', 'SR'),
  C('Georgetown', '乔治敦', 'جورج تاون', 6.8013, -58.1553, 'America/Guyana', 'mwl', 'GY'),
  C('Port of Spain', '西班牙港', 'بورت أوف سبين', 10.6918, -61.2225, 'America/Port_of_Spain', 'mwl', 'TT'),
  C('Sao Paulo', '圣保罗', 'ساو باولو', -23.5505, -46.6333, 'America/Sao_Paulo', 'mwl', 'BR'),
  C('Buenos Aires', '布宜诺斯艾利斯', 'بوينس آيرس', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires', 'mwl', 'AR'),

  // ── 大洋洲 ──────────────────────────────────────────
  C('Sydney', '悉尼', 'سيدني', -33.8688, 151.2093, 'Australia/Sydney', 'mwl', 'AU'),
  C('Melbourne', '墨尔本', 'ملبورن', -37.8136, 144.9631, 'Australia/Melbourne', 'mwl', 'AU'),
  C('Perth', '珀斯', 'بيرث', -31.9505, 115.8605, 'Australia/Perth', 'mwl', 'AU'),
  C('Auckland', '奥克兰', 'أوكلاند', -36.8485, 174.7633, 'Pacific/Auckland', 'mwl', 'NZ'),
  C('Suva', '苏瓦', 'سوفا', -18.1416, 178.4419, 'Pacific/Fiji', 'mwl', 'FJ'),
];

const D = Math.PI / 180;
// 预计算单位球面向量，投影时直接复用
for (const c of CITIES) {
  const p = c.lat * D, l = c.lon * D, cp = Math.cos(p);
  c.vec = [cp * Math.sin(l), Math.sin(p), cp * Math.cos(l)];
}

/** 找离给定坐标最近的城市（大圆距离），用于定位后落到最近的锚点 */
export function nearestCity(lat, lon) {
  const p = lat * D, l = lon * D, cp = Math.cos(p);
  const v = [cp * Math.sin(l), Math.sin(p), cp * Math.cos(l)];
  let best = CITIES[0], bd = -2;
  for (const c of CITIES) {
    const d = c.vec[0] * v[0] + c.vec[1] * v[1] + c.vec[2] * v[2];
    if (d > bd) { bd = d; best = c; }
  }
  return { city: best, km: Math.round(Math.acos(Math.min(1, bd)) * 6371) };
}

/**
 * 城市在 URL 里的写法：/<lang>/prayer-times/<slug>/
 *
 * 放在这里而不是构建脚本里，是因为两边都要用它 —— 构建期拿它生成 1300 多个
 * 城市页的路径，浏览器里拿它拼分享链接。各写一份迟早会漂移，
 * 而漂移的后果是分享出去的链接指向 404。
 *
 * 用英文名去掉音标符，保证是纯 ASCII：阿文名做路径会被编码成一长串 %。
 */
export const citySlug = (name) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** 按任意语言的名字做模糊搜索 */
export function searchCities(q, limit = 8) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const hit = [];
  for (const c of CITIES) {
    const en = c.en.toLowerCase();
    let rank = -1;
    if (en.startsWith(s)) rank = 0;
    else if (c.zh.startsWith(s) || c.ar.startsWith(s)) rank = 1;
    else if (en.includes(s) || c.zh.includes(s) || c.ar.includes(s)) rank = 2;
    if (rank >= 0) hit.push({ c, rank });
  }
  return hit.sort((a, b) => a.rank - b.rank).slice(0, limit).map((h) => h.c);
}
