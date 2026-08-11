const fs = require('fs');

const file = 'src/translations.ts';
let contents = fs.readFileSync(file, 'utf8');

const additions = {
  ru: "searchLanguage: 'Введите название языка...',",
  en: "searchLanguage: 'Enter language name...',",
  es: "searchLanguage: 'Introduce el nombre del idioma...',",
  fr: "searchLanguage: 'Entrez le nom de la langue...',",
  de: "searchLanguage: 'Sprachname eingeben...',",
  zh: "searchLanguage: '输入语言名称...',",
  ja: "searchLanguage: '言語名を入力...',",
  hi: "searchLanguage: 'भाषा का नाम दर्ज करें...',",
  ar: "searchLanguage: 'أدخل اسم اللغة...',",
  pt: "searchLanguage: 'Digite o nome do idioma...',",
};

for (const [lang, add] of Object.entries(additions)) {
  const regex = new RegExp(`searchCountry: '.*',`, 'g');
  // Need to be careful to only replace for the specific language block
  // Let's just use string replacement on the block
  
  const blockRegex = new RegExp(`(${lang}:\\s*{[^}]*searchCountry: '.*',)([\\s\\S]*?})`);
  contents = contents.replace(blockRegex, `$1\n    ${add}$2`);
}

fs.writeFileSync(file, contents);
