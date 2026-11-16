// Languages a student can say they speak. Name in English plus the name in the language itself.
// Order: roughly the most spoken at home in UK schools first, then other widely spoken languages.
export const LANGUAGES = [
  ['en', 'English', 'English'], ['pl', 'Polish', 'Polski'], ['pa', 'Punjabi', 'ਪੰਜਾਬੀ'], ['ur', 'Urdu', 'اردو'], ['bn', 'Bengali', 'বাংলা'],
  ['gu', 'Gujarati', 'ગુજરાતી'], ['ar', 'Arabic', 'العربية'], ['ro', 'Romanian', 'Română'], ['pt', 'Portuguese', 'Português'], ['es', 'Spanish', 'Español'],
  ['fr', 'French', 'Français'], ['so', 'Somali', 'Soomaali'], ['ta', 'Tamil', 'தமிழ்'], ['tr', 'Turkish', 'Türkçe'], ['it', 'Italian', 'Italiano'],
  ['lt', 'Lithuanian', 'Lietuvių'], ['zh', 'Mandarin Chinese', '普通话'], ['yue', 'Cantonese', '廣東話'], ['hi', 'Hindi', 'हिन्दी'], ['fa', 'Persian', 'فارسی'],
  ['ru', 'Russian', 'Русский'], ['uk', 'Ukrainian', 'Українська'], ['bg', 'Bulgarian', 'Български'], ['vi', 'Vietnamese', 'Tiếng Việt'], ['de', 'German', 'Deutsch'],
  ['ne', 'Nepali', 'नेपाली'], ['ml', 'Malayalam', 'മലയാളം'], ['yo', 'Yoruba', 'Yorùbá'], ['tl', 'Tagalog', 'Tagalog'], ['ku', 'Kurdish', 'Kurdî'],
  ['ps', 'Pashto', 'پښتو'], ['sq', 'Albanian', 'Shqip'], ['el', 'Greek', 'Ελληνικά'], ['hu', 'Hungarian', 'Magyar'], ['cy', 'Welsh', 'Cymraeg'],
  ['ja', 'Japanese', '日本語'], ['ko', 'Korean', '한국어'], ['sw', 'Swahili', 'Kiswahili'], ['th', 'Thai', 'ไทย'], ['nl', 'Dutch', 'Nederlands'],
  ['ig', 'Igbo', 'Igbo'], ['am', 'Amharic', 'አማርኛ'], ['ti', 'Tigrinya', 'ትግርኛ'], ['bsl', 'British Sign Language', 'BSL'],
].map(([id, name, own]) => ({ id, name, own }))
