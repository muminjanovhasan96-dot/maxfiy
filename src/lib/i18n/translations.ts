/**
 * UI translations. Uzbek (Latin), Russian (Cyrillic), English.
 * Keys are flat dotted strings. Placeholders like {n} are filled by `translate`.
 */
export type Lang = "uz" | "ru" | "en";

export const LANGS: Lang[] = ["uz", "ru", "en"];
export const LANG_NAMES: Record<Lang, string> = {
  uz: "O‘zbekcha",
  ru: "Русский",
  en: "English",
};
export const DEFAULT_LANG: Lang = "uz";

type Entry = { uz: string; ru: string; en: string };

export const T: Record<string, Entry> = {
  "app.name": { uz: "Maxfiy", ru: "Maxfiy", en: "Maxfiy" },
  // ---- common ----
  "common.add": { uz: "Qo‘shish", ru: "Добавить", en: "Add" },
  "common.new": { uz: "Yangi", ru: "Новый", en: "New" },
  "common.save": { uz: "Saqlash", ru: "Сохранить", en: "Save" },
  "common.saving": { uz: "Saqlanmoqda…", ru: "Сохранение…", en: "Saving…" },
  "common.cancel": { uz: "Bekor qilish", ru: "Отмена", en: "Cancel" },
  "common.back": { uz: "Orqaga", ru: "Назад", en: "Back" },
  "common.continue": { uz: "Davom etish", ru: "Далее", en: "Continue" },
  "common.delete": { uz: "O‘chirish", ru: "Удалить", en: "Delete" },
  "common.edit": { uz: "Tahrirlash", ru: "Изменить", en: "Edit" },
  "common.restore": { uz: "Tiklash", ru: "Восстановить", en: "Restore" },
  "common.deleteForever": { uz: "Butunlay o‘chirish", ru: "Удалить навсегда", en: "Delete permanently" },
  "common.download": { uz: "Yuklab olish", ru: "Скачать", en: "Download" },
  "common.of": { uz: "/", ru: "из", en: "of" },
  "common.untitled": { uz: "Nomsiz", ru: "Без названия", en: "Untitled" },

  // ---- setup ----
  "setup.title": { uz: "Vault yaratish", ru: "Создайте хранилище", en: "Create your vault" },
  "setup.sub1": {
    uz: "Ikkita parol tanlang. Ochish uchun ikkalasi ham kerak.",
    ru: "Выберите два пароля. Оба нужны для входа.",
    en: "Choose two passwords. Both are required to unlock.",
  },
  "setup.sub2": {
    uz: "Parollarni unutsangiz uchun ikkita tiklash so‘zi belgilang.",
    ru: "Задайте два слова для восстановления на случай, если забудете пароли.",
    en: "Set two recovery words in case you forget your passwords.",
  },
  "setup.pw1": { uz: "Birinchi parol", ru: "Первый пароль", en: "First password" },
  "setup.pw1c": { uz: "Birinchi parolni tasdiqlang", ru: "Подтвердите первый пароль", en: "Confirm first password" },
  "setup.pw2": { uz: "Ikkinchi parol", ru: "Второй пароль", en: "Second password" },
  "setup.pw2c": { uz: "Ikkinchi parolni tasdiqlang", ru: "Подтвердите второй пароль", en: "Confirm second password" },
  "setup.diffWarn": {
    uz: "Haqiqiy ikki bosqichli himoya uchun ikkita har xil parol ishlating.",
    ru: "Используйте два разных пароля для настоящей двухфакторной защиты.",
    en: "Use two different passwords for real two-factor protection.",
  },
  "setup.recoveryWarn": {
    uz: "Bu ikki so‘z — yagona zaxirangiz. Ikkala parolni ham, bu so‘zlarni ham unutsangiz, ma’lumotlaringizni hech kim — biz ham — tiklay olmaydi. Ularni xavfsiz joyda saqlang.",
    ru: "Эти два слова — ваша единственная резервная копия. Если вы забудете оба пароля и эти слова, данные не сможет восстановить никто — даже мы. Храните их в надёжном месте.",
    en: "These two words are your only backup. If you forget both passwords and these words, your data cannot be recovered by anyone — not even us. Store them somewhere safe.",
  },
  "setup.word1": { uz: "Maxfiy so‘z 1", ru: "Секретное слово 1", en: "Secret word 1" },
  "setup.word2": { uz: "Maxfiy so‘z 2", ru: "Секретное слово 2", en: "Secret word 2" },
  "setup.ack": {
    uz: "Tiklash so‘zlarimni xavfsiz saqladim va ularni tiklab bo‘lmasligini tushunaman.",
    ru: "Я надёжно сохранил слова для восстановления и понимаю, что их нельзя сбросить.",
    en: "I’ve safely stored my recovery words and understand they can’t be reset.",
  },
  "setup.create": { uz: "Vault yaratish", ru: "Создать хранилище", en: "Create vault" },
  "setup.creating": { uz: "Yaratilmoqda…", ru: "Создание…", en: "Creating…" },
  "toast.vaultCreated": { uz: "Vault yaratildi", ru: "Хранилище создано", en: "Vault created" },
  "toast.couldNotCreate": { uz: "Vault yaratib bo‘lmadi", ru: "Не удалось создать хранилище", en: "Could not create vault" },

  // ---- password strength ----
  "strength.0": { uz: "Juda zaif", ru: "Очень слабый", en: "Very weak" },
  "strength.1": { uz: "Zaif", ru: "Слабый", en: "Weak" },
  "strength.2": { uz: "O‘rtacha", ru: "Средний", en: "Fair" },
  "strength.3": { uz: "Kuchli", ru: "Надёжный", en: "Strong" },
  "strength.4": { uz: "Ajoyib", ru: "Отличный", en: "Excellent" },
  "strengthHint.0": { uz: "Uzunroq parol iborasi ishlating.", ru: "Используйте более длинную парольную фразу.", en: "Use a longer passphrase." },
  "strengthHint.1": { uz: "Uzunlik va xilma-xillik qo‘shing.", ru: "Добавьте длину и разнообразие.", en: "Add length and variety." },
  "strengthHint.2": { uz: "Yaxshi — 12+ belgiga intiling.", ru: "Уже лучше — стремитесь к 12+ символам.", en: "Getting there — aim for 12+ characters." },
  "strengthHint.3": { uz: "Yaxshi. Bir necha so‘zli ibora ideal.", ru: "Хорошо. Фраза из нескольких слов — идеально.", en: "Good. A passphrase of several words is ideal." },
  "strengthHint.4": { uz: "Ajoyib. Xavfsiz joyda saqlang.", ru: "Отлично. Храните в надёжном месте.", en: "Excellent. Store it somewhere safe." },

  // ---- insecure context ----
  "insecure.title": { uz: "Bu oynada shifrlash ishlamaydi.", ru: "В этом окне шифрование недоступно.", en: "This preview can’t encrypt." },
  "insecure.body": {
    uz: "O‘rnatilgan brauzerlarda Web Crypto o‘chirilgan. Vaultdan foydalanish uchun {url} manzilini oddiy brauzerda (Chrome, Safari yoki Edge) oching.",
    ru: "В встроенных браузерах Web Crypto отключён. Откройте {url} в обычном браузере (Chrome, Safari или Edge), чтобы пользоваться хранилищем.",
    en: "Web Crypto is disabled in embedded browsers. Open {url} in a normal browser tab (Chrome, Safari or Edge) to use the vault.",
  },

  // ---- lock screen ----
  "lock.sub.a": { uz: "Boshlash uchun birinchi parolni kiriting.", ru: "Введите первый пароль, чтобы начать.", en: "Enter your first password to begin." },
  "lock.sub.b": { uz: "Yana bir qadam — ikkinchi parol bilan tasdiqlang.", ru: "Ещё один шаг — подтвердите вторым паролем.", en: "One more step — confirm with your second password." },
  "lock.sub.r1": { uz: "Ikki maxfiy so‘zdan birinchisini kiriting.", ru: "Введите первое из двух секретных слов.", en: "Enter the first of your two secret recovery words." },
  "lock.sub.r2": { uz: "Endi ikkinchi maxfiy so‘zni tasdiqlang.", ru: "Теперь подтвердите второе секретное слово.", en: "Now confirm the second secret word." },
  "lock.label.a": { uz: "Birinchi parol", ru: "Первый пароль", en: "First password" },
  "lock.label.b": { uz: "Ikkinchi parol", ru: "Второй пароль", en: "Second password" },
  "lock.label.r1": { uz: "Maxfiy so‘z 1", ru: "Секретное слово 1", en: "Secret word 1" },
  "lock.label.r2": { uz: "Maxfiy so‘z 2", ru: "Секретное слово 2", en: "Secret word 2" },
  "lock.cta.a": { uz: "Davom etish", ru: "Далее", en: "Continue" },
  "lock.cta.b": { uz: "Vaultni ochish", ru: "Открыть хранилище", en: "Unlock vault" },
  "lock.cta.r1": { uz: "Davom etish", ru: "Далее", en: "Continue" },
  "lock.cta.r2": { uz: "Tiklash va ochish", ru: "Восстановить и открыть", en: "Recover & unlock" },
  "lock.ph.word1": { uz: "Birinchi so‘z", ru: "Первое слово", en: "First word" },
  "lock.ph.word2": { uz: "Ikkinchi so‘z", ru: "Второе слово", en: "Second word" },
  "lock.forgot": { uz: "Parolni unutdingizmi? Tiklash so‘zlaridan foydalaning", ru: "Забыли пароль? Используйте слова восстановления", en: "Forgot password? Use recovery words" },
  "lock.backToLogin": { uz: "Parol bilan kirishga qaytish", ru: "Вернуться ко входу по паролю", en: "Back to password login" },
  "lock.err1": { uz: "Mos kelmadi. Qayta urinib ko‘ring.", ru: "Не совпадает. Попробуйте ещё раз.", en: "That didn’t match. Please try again." },
  "lock.err2": { uz: "Mos kelmadi. Tekshirib qayta urinib ko‘ring.", ru: "Не совпадает. Проверьте и попробуйте снова.", en: "That didn’t match. Check and try again." },
  "lock.attempts": {
    uz: "15 daqiqalik blokgacha {n} urinish qoldi.",
    ru: "Осталось {n} попыток до блокировки на 15 минут.",
    en: "{n} attempts left before a 15-minute lock.",
  },
  "lock.tooMany": { uz: "Juda ko‘p urinish", ru: "Слишком много попыток", en: "Too many attempts" },
  "lock.paused": { uz: "Xavfsizlik uchun ochish vaqtincha to‘xtatildi.", ru: "В целях безопасности вход приостановлен.", en: "For your protection, unlocking is paused." },
  "lock.tryAgain": { uz: "Taymer nolga yetganda qayta urinib ko‘ring.", ru: "Попробуйте снова, когда таймер дойдёт до нуля.", en: "Try again when the timer reaches zero." },
  "lock.footer": {
    uz: "Hamma narsa shu qurilmada shifrlangan. Parollaringiz uni hech qachon tark etmaydi.",
    ru: "Всё зашифровано на этом устройстве. Ваши пароли никогда его не покидают.",
    en: "Everything is encrypted on this device. Your passwords never leave it.",
  },
  "lock.verifying": { uz: "Tekshirilmoqda…", ru: "Проверка…", en: "Verifying…" },

  // ---- nav ----
  "nav.photos": { uz: "Rasmlar", ru: "Фото", en: "Photos" },
  "nav.videos": { uz: "Videolar", ru: "Видео", en: "Videos" },
  "nav.contacts": { uz: "Kontaktlar", ru: "Контакты", en: "Contacts" },
  "nav.passwords": { uz: "Parollar", ru: "Пароли", en: "Passwords" },
  "nav.documents": { uz: "Hujjatlar", ru: "Документы", en: "Documents" },
  "nav.favorites": { uz: "Sevimlilar", ru: "Избранное", en: "Favorites" },
  "nav.trash": { uz: "Savat", ru: "Корзина", en: "Trash" },
  "nav.notesPasswords": { uz: "Eslatma va parollar", ru: "Заметки и пароли", en: "Notes & Passwords" },

  // ---- sidebar / topbar ----
  "side.onDevice": { uz: "Shu qurilmada", ru: "На этом устройстве", en: "On this device" },
  "side.cloud": { uz: "Shifrlangan bulut", ru: "Зашифрованное облако", en: "Encrypted cloud" },
  "side.lock": { uz: "Vaultni qulflash", ru: "Заблокировать", en: "Lock vault" },
  "menu.export": { uz: "Zaxira nusxa olish", ru: "Экспорт резервной копии", en: "Export backup" },
  "menu.import": { uz: "Zaxiradan tiklash", ru: "Импорт резервной копии", en: "Import backup" },
  "menu.lockNow": { uz: "Hoziroq qulflash", ru: "Заблокировать сейчас", en: "Lock now" },
  "menu.erase": { uz: "Bu qurilmani tozalash", ru: "Стереть это устройство", en: "Erase this device" },
  "erase.confirm": {
    uz: "Bu qurilmadagi BARCHA vault ma’lumotlari o‘chirilsinmi? Buni ortga qaytarib bo‘lmaydi.",
    ru: "Стереть ВСЕ данные хранилища на этом устройстве? Это необратимо.",
    en: "Erase ALL vault data on this device? This cannot be undone.",
  },
  "delete.confirm": { uz: "Butunlay o‘chirilsinmi? Buni ortga qaytarib bo‘lmaydi.", ru: "Удалить навсегда? Это необратимо.", en: "Delete permanently? This cannot be undone." },

  // ---- units ----
  "unit.photos": { uz: "rasm", ru: "фото", en: "photos" },
  "unit.videos": { uz: "video", ru: "видео", en: "videos" },
  "unit.contacts": { uz: "kontakt", ru: "контактов", en: "contacts" },
  "unit.documents": { uz: "hujjat", ru: "документов", en: "documents" },
  "unit.favorites": { uz: "sevimli", ru: "избранных", en: "favorites" },
  "unit.trash": { uz: "savatdagi element", ru: "элементов в корзине", en: "items in trash" },

  // ---- uploads ----
  "upload.photos": { uz: "Rasm qo‘shish", ru: "Добавить фото", en: "Add photos" },
  "upload.videos": { uz: "Video qo‘shish", ru: "Добавить видео", en: "Add videos" },
  "upload.files": { uz: "Fayl qo‘shish", ru: "Добавить файлы", en: "Add files" },
  "upload.encrypting": { uz: "Shifrlanmoqda {done}/{total}", ru: "Шифрование {done}/{total}", en: "Encrypting {done}/{total}" },
  "upload.drop": { uz: "Shifrlab qo‘shish uchun tashlang", ru: "Отпустите, чтобы зашифровать и добавить", en: "Drop to encrypt & add" },
  "upload.added": { uz: "{n} ta element qo‘shildi", ru: "Добавлено элементов: {n}", en: "Added {n} items" },
  "upload.failed": { uz: "Xato: {name}", ru: "Ошибка: {name}", en: "Failed: {name}" },

  // ---- empty states ----
  "empty.photos.t": { uz: "Hozircha rasm yo‘q", ru: "Пока нет фото", en: "No photos yet" },
  "empty.photos.s": {
    uz: "Rasm qo‘shing — ular saqlanishdan oldin shu qurilmada shifrlanadi. Sudrab tashlash ham ishlaydi.",
    ru: "Добавьте фото — они шифруются на этом устройстве ещё до сохранения. Перетаскивание тоже работает.",
    en: "Add photos and they’ll be encrypted on this device before they’re ever stored. Drag & drop works too.",
  },
  "empty.videos.t": { uz: "Hozircha video yo‘q", ru: "Пока нет видео", en: "No videos yet" },
  "empty.videos.s": {
    uz: "Videolar bo‘laklarga bo‘lib shifrlanadi — xotiraga to‘liq yuklanmaydi, ijro tez boshlanadi va maxfiy qoladi.",
    ru: "Видео шифруются частями и не загружаются целиком в память — воспроизведение быстрое и приватное.",
    en: "Videos are encrypted in chunks so they never load fully into memory — playback starts fast and stays private.",
  },
  "empty.favorites.t": { uz: "Hozircha sevimlilar yo‘q", ru: "Пока нет избранного", en: "No favorites yet" },
  "empty.favorites.s": {
    uz: "Rasm va videolarni sevimli deb belgilang — ular tez kirish uchun shu yerda to‘planadi.",
    ru: "Отмечайте фото и видео как избранные — они соберутся здесь для быстрого доступа.",
    en: "Mark photos and videos as favorites and they’ll gather here for quick access.",
  },
  "empty.trash.t": { uz: "Savat bo‘sh", ru: "Корзина пуста", en: "Trash is empty" },
  "empty.trash.s": {
    uz: "O‘chirilgan elementlar avval shu yerga tushadi — butunlay yo‘qolishidan oldin tiklashingiz mumkin.",
    ru: "Удалённые элементы сначала попадают сюда, чтобы вы могли их восстановить.",
    en: "Deleted items land here first, so you can restore them before they’re gone for good.",
  },
  "empty.contacts.t": { uz: "Hozircha kontakt yo‘q", ru: "Пока нет контактов", en: "No contacts yet" },
  "empty.contacts.s": {
    uz: "Ismlar, raqamlar va emaillarni saqlang — barchasi shu qurilmada shifrlangan.",
    ru: "Храните имена, номера и адреса — всё зашифровано на этом устройстве.",
    en: "Store names, numbers and emails — all encrypted on this device.",
  },
  "empty.passwords.t": { uz: "Hozircha login yo‘q", ru: "Пока нет входов", en: "No logins yet" },
  "empty.passwords.s": {
    uz: "Parol va loginlarni saqlang. Bir bosishda nusxalang — clipboard avtomatik tozalanadi.",
    ru: "Храните пароли и логины. Копируйте одним нажатием — буфер очищается автоматически.",
    en: "Store passwords and logins. Copy with one tap — the clipboard auto-clears.",
  },
  "empty.notes.t": { uz: "Hozircha eslatma yo‘q", ru: "Пока нет заметок", en: "No notes yet" },
  "empty.notes.s": {
    uz: "Maxfiy eslatmalar, boshdan-oxir shifrlangan. Ularni faqat siz o‘qiy olasiz.",
    ru: "Личные заметки со сквозным шифрованием. Читать можете только вы.",
    en: "Private notes, encrypted end-to-end. Only you can read them.",
  },
  "empty.documents.t": { uz: "Hozircha hujjat yo‘q", ru: "Пока нет документов", en: "No documents yet" },
  "empty.documents.s": {
    uz: "PDF, skan va boshqa fayllar — saqlashdan oldin shifrlanadi. Qo‘shish uchun sudrab tashlang.",
    ru: "PDF, сканы и другие файлы — шифруются перед сохранением. Перетащите, чтобы добавить.",
    en: "PDFs, scans, and any other files — encrypted before storage. Drag & drop to add.",
  },

  // ---- gallery / viewer ----
  "gallery.selected": { uz: "{n} tanlandi", ru: "Выбрано: {n}", en: "{n} selected" },
  "gallery.favorite": { uz: "Sevimli", ru: "В избранное", en: "Favorite" },
  "date.today": { uz: "Bugun", ru: "Сегодня", en: "Today" },
  "date.yesterday": { uz: "Kecha", ru: "Вчера", en: "Yesterday" },
  "toast.favorited": { uz: "{n} ta sevimliga qo‘shildi", ru: "В избранное: {n}", en: "Favorited {n}" },
  "toast.movedN": { uz: "{n} ta savatga o‘tkazildi", ru: "В корзину перемещено: {n}", en: "Moved {n} to Trash" },
  "toast.moved": { uz: "Savatga o‘tkazildi", ru: "Перемещено в корзину", en: "Moved to Trash" },
  "toast.restored": { uz: "Tiklandi", ru: "Восстановлено", en: "Restored" },
  "toast.deletedForever": { uz: "Butunlay o‘chirildi", ru: "Удалено навсегда", en: "Deleted permanently" },
  "toast.couldNotDecrypt": { uz: "Bu elementni shifrdan chiqarib bo‘lmadi", ru: "Не удалось расшифровать этот элемент", en: "Could not decrypt this item" },

  // ---- contacts ----
  "contact.new": { uz: "Yangi kontakt", ru: "Новый контакт", en: "New contact" },
  "contact.edit": { uz: "Kontaktni tahrirlash", ru: "Изменить контакт", en: "Edit contact" },
  "contact.firstName": { uz: "Ism", ru: "Имя", en: "First name" },
  "contact.lastName": { uz: "Familiya", ru: "Фамилия", en: "Last name" },
  "contact.company": { uz: "Kompaniya", ru: "Компания", en: "Company" },
  "contact.phone": { uz: "Telefon", ru: "Телефон", en: "Phone" },
  "contact.email": { uz: "Email", ru: "Эл. почта", en: "Email" },
  "contact.notes": { uz: "Eslatmalar", ru: "Заметки", en: "Notes" },
  "contact.updated": { uz: "Kontakt yangilandi", ru: "Контакт обновлён", en: "Contact updated" },
  "contact.added": { uz: "Kontakt qo‘shildi", ru: "Контакт добавлен", en: "Contact added" },
  "contact.trashed": { uz: "Kontakt savatga o‘tkazildi", ru: "Контакт перемещён в корзину", en: "Contact moved to Trash" },
  "contact.unnamed": { uz: "Nomsiz", ru: "Без имени", en: "Unnamed" },

  // ---- password ----
  "pw.new": { uz: "Yangi login", ru: "Новый вход", en: "New login" },
  "pw.edit": { uz: "Loginni tahrirlash", ru: "Изменить вход", en: "Edit login" },
  "pw.title": { uz: "Nomi", ru: "Название", en: "Title" },
  "pw.username": { uz: "Foydalanuvchi nomi", ru: "Имя пользователя", en: "Username" },
  "pw.password": { uz: "Parol", ru: "Пароль", en: "Password" },
  "pw.website": { uz: "Veb-sayt", ru: "Веб-сайт", en: "Website" },
  "pw.notes": { uz: "Eslatmalar", ru: "Заметки", en: "Notes" },
  "pw.strong": { uz: "Kuchli parol", ru: "Надёжный пароль", en: "Strong password" },
  "pw.passphrase": { uz: "Parol iborasi", ru: "Парольная фраза", en: "Passphrase" },
  "pw.copyUsername": { uz: "Foydalanuvchi nomidan nusxa olish", ru: "Скопировать имя пользователя", en: "Copy username" },
  "pw.openWebsite": { uz: "Veb-saytni ochish", ru: "Открыть сайт", en: "Open website" },
  "pw.copied": { uz: "Parol nusxalandi", ru: "Пароль скопирован", en: "Password copied" },
  "pw.userCopied": { uz: "Foydalanuvchi nomi nusxalandi", ru: "Имя пользователя скопировано", en: "Username copied" },
  "pw.saved": { uz: "Saqlandi", ru: "Сохранено", en: "Saved" },
  "pw.updated": { uz: "Yangilandi", ru: "Обновлено", en: "Updated" },

  // ---- note ----
  "note.new": { uz: "Yangi eslatma", ru: "Новая заметка", en: "New note" },
  "note.edit": { uz: "Eslatmani tahrirlash", ru: "Изменить заметку", en: "Edit note" },
  "note.title": { uz: "Sarlavha", ru: "Заголовок", en: "Title" },
  "note.body": { uz: "Eslatma", ru: "Заметка", en: "Note" },
  "note.placeholder": { uz: "Maxfiy narsa yozing…", ru: "Напишите что-то личное…", en: "Write something private…" },

  // ---- secure tabs ----
  "secure.passwords": { uz: "Parollar", ru: "Пароли", en: "Passwords" },
  "secure.notes": { uz: "Eslatmalar", ru: "Заметки", en: "Notes" },

  // ---- documents ----
  "doc.decrypting": { uz: "Shifrdan chiqarilmoqda…", ru: "Расшифровка…", en: "Decrypting…" },

  // ---- search ----
  "search.placeholder": { uz: "Kontaktlar, eslatmalar, parollar, hujjatlarni qidiring…", ru: "Поиск по контактам, заметкам, паролям, документам…", en: "Search contacts, notes, passwords, documents…" },
  "search.none": { uz: "Hech narsa topilmadi.", ru: "Ничего не найдено.", en: "No matches." },
  "search.prompt": { uz: "Vaultni qidirish uchun yozing.", ru: "Введите текст для поиска.", en: "Type to search your vault." },

  // ---- backup ----
  "backup.preparing": { uz: "Shifrlangan zaxira tayyorlanmoqda…", ru: "Подготовка зашифрованной копии…", en: "Preparing encrypted backup…" },
  "backup.downloaded": { uz: "Zaxira nusxa yuklab olindi", ru: "Резервная копия скачана", en: "Backup downloaded" },
  "backup.restored": { uz: "{n} ta element tiklandi", ru: "Восстановлено элементов: {n}", en: "Restored {n} items" },
  "backup.invalid": { uz: "Yaroqsiz zaxira fayli", ru: "Неверный файл резервной копии", en: "Invalid backup file" },

  // ---- clipboard ----
  "clip.copied": { uz: "Nusxalandi", ru: "Скопировано", en: "Copied" },
  "clip.clears": { uz: "{label} · {n}s dan keyin tozalanadi", ru: "{label} · очистится через {n}с", en: "{label} · clears in {n}s" },
  "clip.unavailable": { uz: "Clipboard mavjud emas", ru: "Буфер обмена недоступен", en: "Clipboard unavailable" },
  "clip.emailCopied": { uz: "Email nusxalandi", ru: "Эл. почта скопирована", en: "Email copied" },

  // ---- data lost (browser cleared local vault) ----
  "datalost.title": {
    uz: "Oldingi vault ma’lumotlari o‘chirilgan",
    ru: "Прежние данные хранилища удалены",
    en: "Your previous vault was cleared",
  },
  "datalost.body": {
    uz: "Bu brauzer avval yaratgan vaultingizni o‘chirib yuborgan (yashirin/incognito rejim, sayt ma’lumotlari tozalangan yoki xotira cheklovi). Local ma’lumotni tiklab bo‘lmaydi. Yangi vault yarating va saqlanib qolishi uchun: oddiy oynadan foydalaning, doim aynan shu manzilni oching va shifrlangan “Zaxira nusxa”ni saqlab boring.",
    ru: "Этот браузер удалил созданное ранее хранилище (режим инкогнито, очистка данных сайта или лимит хранилища). Локальные данные восстановить нельзя. Создайте новое хранилище, а чтобы оно сохранялось: используйте обычное окно, всегда открывайте один и тот же адрес и делайте зашифрованную «Резервную копию».",
    en: "This browser removed the vault you created earlier (private/incognito mode, cleared site data, or storage limits). Local data can’t be recovered. Create a new vault — and to keep it: use a normal window, always open the same address, and keep an encrypted Export backup.",
  },

  // ---- language ----
  "lang.label": { uz: "Til", ru: "Язык", en: "Language" },
};

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = T[key];
  let str = entry ? (entry[lang] ?? entry.en) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}
