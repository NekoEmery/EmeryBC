// i18n.ts — Internationalisation for EmeryBC.
// Language preference is stored in localStorage (fast, device-local, no server sync needed).

export type LangCode = "en" | "de" | "zh" | "fr" | "es" | "ru";

export const LANG_CODES: LangCode[] = ["en", "de", "zh", "fr", "es", "ru"];
export const LANG_LABELS: Record<LangCode, string> = {
    en: "EN", de: "DE", zh: "中文", fr: "FR", es: "ES", ru: "RU",
};
export const LANG_NAMES: Record<LangCode, string> = {
    en: "English", de: "Deutsch", zh: "中文", fr: "Français", es: "Español", ru: "Русский",
};

const STORAGE_KEY = "EBC_lang";
type T = Record<LangCode, string>;

// ---------------------------------------------------------------------------
// Translation table
// ---------------------------------------------------------------------------
const S: Record<string, T> = {

    // ─── CORE ACTIONS ──────────────────────────────────────────────────────
    "core.on":          { en: "ON",          de: "AN",               zh: "开",          fr: "OUI",              es: "SÍ",           ru: "ВКЛ"          },
    "core.off":         { en: "OFF",         de: "AUS",              zh: "关",          fr: "NON",              es: "NO",           ru: "ВЫКЛ"         },
    "core.save":        { en: "✓ Save",      de: "✓ Speichern",      zh: "✓ 保存",      fr: "✓ Sauvegarder",    es: "✓ Guardar",    ru: "✓ Сохранить"  },
    "core.cancel":      { en: "- Cancel",    de: "- Abbrechen",      zh: "- 取消",      fr: "- Annuler",        es: "- Cancelar",   ru: "- Отмена"     },
    "core.delete":      { en: "×",           de: "×",                zh: "×",           fr: "×",                es: "×",            ru: "×"            },
    "core.edit":        { en: "✎ Edit",      de: "✎ Bearbeiten",     zh: "✎ 编辑",      fr: "✎ Modifier",       es: "✎ Editar",     ru: "✎ Изменить"   },
    "core.apply":       { en: "Apply",       de: "Anwenden",         zh: "应用",        fr: "Appliquer",        es: "Aplicar",      ru: "Применить"    },
    "core.create":      { en: "✓ Create",    de: "✓ Erstellen",      zh: "✓ 创建",      fr: "✓ Créer",          es: "✓ Crear",      ru: "✓ Создать"    },
    "core.export":      { en: "↑ Export",    de: "↑ Exportieren",    zh: "↑ 导出",      fr: "↑ Exporter",       es: "↑ Exportar",   ru: "↑ Экспорт"    },
    "core.import":      { en: "↓ Import",    de: "↓ Importieren",    zh: "↓ 导入",      fr: "↓ Importer",       es: "↓ Importar",   ru: "↓ Импорт"     },
    "core.confirm":     { en: "✓ Confirm",   de: "✓ Bestätigen",     zh: "✓ 确认",      fr: "✓ Confirmer",      es: "✓ Confirmar",  ru: "✓ Подтвердить"},
    "core.yes":         { en: "Yes",         de: "Ja",               zh: "是",          fr: "Oui",              es: "Sí",           ru: "Да"           },
    "core.no":          { en: "No",          de: "Nein",             zh: "否",          fr: "Non",              es: "No",           ru: "Нет"          },
    "core.done":        { en: "✓ Done",      de: "✓ Fertig",         zh: "✓ 完成",      fr: "✓ Terminé",        es: "✓ Listo",      ru: "✓ Готово"     },
    "core.add":         { en: "+ Add",       de: "+ Hinzufügen",     zh: "+ 添加",      fr: "+ Ajouter",        es: "+ Añadir",     ru: "+ Добавить"   },
    "core.clearAll":    { en: "Clear All",   de: "Alle löschen",     zh: "全部清除",    fr: "Tout effacer",     es: "Borrar todo",  ru: "Очистить всё" },
    "core.rename":      { en: "Rename",      de: "Umbenennen",       zh: "重命名",      fr: "Renommer",         es: "Renombrar",    ru: "Переименовать"},
    "core.moveUp":      { en: "▲",           de: "▲",                zh: "▲",           fr: "▲",                es: "▲",            ru: "▲"            },
    "core.moveDown":    { en: "▼",           de: "▼",                zh: "▼",           fr: "▼",                es: "▼",            ru: "▼"            },
    "core.enable":      { en: "Enable",      de: "Aktivieren",       zh: "启用",        fr: "Activer",          es: "Activar",      ru: "Включить"     },
    "core.disable":     { en: "Disable",     de: "Deaktivieren",     zh: "禁用",        fr: "Désactiver",       es: "Desactivar",   ru: "Отключить"    },
    "core.update":      { en: "Update",      de: "Aktualisieren",    zh: "更新",        fr: "Mettre à jour",    es: "Actualizar",   ru: "Обновить"     },
    "core.close":       { en: "Close",       de: "Schließen",        zh: "关闭",        fr: "Fermer",           es: "Cerrar",       ru: "Закрыть"      },
    "core.refresh":     { en: "Refresh",     de: "Aktualisieren",    zh: "刷新",        fr: "Actualiser",       es: "Actualizar",   ru: "Обновить"     },
    "core.copied":      { en: "✔ Copied!",   de: "✔ Kopiert!",       zh: "✔ 已复制！",  fr: "✔ Copié !",        es: "✔ ¡Copiado!",  ru: "✔ Скопировано!"},
    "core.saved":       { en: "✓ Saved",     de: "✓ Gespeichert",    zh: "✓ 已保存",    fr: "✓ Sauvegardé",     es: "✓ Guardado",   ru: "✓ Сохранено"  },
    "core.applied":     { en: "✓ Applied!",  de: "✓ Angewendet!",    zh: "✓ 已应用！",  fr: "✓ Appliqué !",     es: "✓ ¡Aplicado!", ru: "✓ Применено!" },
    "core.none":        { en: "(none)",      de: "(keine)",          zh: "（无）",       fr: "(aucun)",          es: "(ninguno)",    ru: "(нет)"        },
    "core.wear":        { en: "Wear",        de: "Tragen",           zh: "穿戴",        fr: "Porter",           es: "Usar",         ru: "Надеть"       },
    "core.moveUpTitle": { en: "Move up",     de: "Nach oben",        zh: "上移",        fr: "Déplacer vers le haut", es: "Mover arriba", ru: "Переместить вверх" },
    "core.moveDownTitle":{ en: "Move down",  de: "Nach unten",       zh: "下移",        fr: "Déplacer vers le bas", es: "Mover abajo", ru: "Переместить вниз" },

    // ─── HEADER ────────────────────────────────────────────────────────────
    "header.dragToMove":   { en: "Drag to move",   de: "Ziehen zum Verschieben",      zh: "拖动以移动",     fr: "Glisser pour déplacer",       es: "Arrastrar para mover",    ru: "Перетащить"                },
    "header.resetPos":     { en: "⌖ Reset pos",    de: "⌖ Pos. zurücksetzen",         zh: "⌖ 重置位置",     fr: "⌖ Réinitialiser pos",          es: "⌖ Restablecer pos",       ru: "⌖ Сбросить позицию"        },
    "header.resetPosTitle":{ en: "Reset drawer to default position (anchored to chat log)", de: "Fenster auf Standardposition zurücksetzen", zh: "将抽屉重置为默认位置（锚定至聊天框）", fr: "Réinitialiser à la position par défaut", es: "Restablecer posición predeterminada", ru: "Сбросить панель в исходное положение" },
    "header.close":        { en: "Close",           de: "Schließen",                   zh: "关闭",           fr: "Fermer",                       es: "Cerrar",                  ru: "Закрыть"                   },
    "header.refresh":      { en: "Refresh",         de: "Aktualisieren",               zh: "刷新",           fr: "Actualiser",                   es: "Actualizar",              ru: "Обновить"                  },
    "header.language":     { en: "Language",        de: "Sprache",                     zh: "语言",           fr: "Langue",                       es: "Idioma",                  ru: "Язык"                      },

    // ─── TABS ──────────────────────────────────────────────────────────────
    "tabs.outfits":      { en: "OUTFITS",     de: "OUTFITS",          zh: "服装",        fr: "TENUES",           es: "ATUENDOS",     ru: "НАРЯДЫ"       },
    "tabs.buttons":      { en: "BUTTONS",     de: "TASTEN",           zh: "按键",        fr: "BOUTONS",          es: "BOTONES",      ru: "КНОПКИ"       },
    "tabs.anims":        { en: "ANIMS",       de: "ANIMS",            zh: "动作",        fr: "ANIMS",            es: "ANIMS",        ru: "АНИМАЦИИ"     },
    "tabs.inbox":        { en: "INBOX",       de: "INBOX",            zh: "收件箱",      fr: "INBOX",            es: "INBOX",        ru: "ВХОДЯЩИЕ"     },
    "tabs.inboxTitle":   { en: "Unread messages & recent conversations", de: "Ungelesene Nachrichten & letzte Gespräche", zh: "未读消息和最近对话", fr: "Messages non lus & conversations récentes", es: "Mensajes no leídos y conversaciones recientes", ru: "Непрочитанные сообщения и недавние беседы" },
    "tabs.users":        { en: "USERS",       de: "NUTZER",           zh: "用户",        fr: "UTILISATEURS",     es: "USUARIOS",     ru: "ПОЛЬЗОВАТЕЛИ" },
    "tabs.credits":      { en: "CREDITS",     de: "CREDITS",          zh: "致谢",        fr: "CRÉDITS",          es: "CRÉDITOS",     ru: "АВТОРЫ"       },
    "tabs.dev":          { en: "DEV",         de: "DEV",              zh: "开发",        fr: "DEV",              es: "DEV",          ru: "DEV"          },
    "tabs.dom":          { en: "DOM",         de: "DOM",              zh: "DOM",         fr: "DOM",              es: "DOM",          ru: "DOM"          },
    "tabs.buttonsTitle": { en: "Action Buttons",  de: "Aktions-Tasten",   zh: "动作按键",   fr: "Boutons d'action",  es: "Botones de acción", ru: "Кнопки действий"      },
    "tabs.usersTitle":   { en: "User Notes",      de: "Benutzernotizen",  zh: "用户笔记",   fr: "Notes utilisateur",  es: "Notas de usuario",  ru: "Заметки о пользователях" },
    "tabs.creditsTitle": { en: "Special Thanks",  de: "Besonderer Dank",  zh: "特别感谢",   fr: "Remerciements",      es: "Agradecimientos",   ru: "Особая благодарность" },
    "tabs.devTitle":     { en: "Developer Tools", de: "Entwickler-Tools", zh: "开发工具",   fr: "Outils développeur", es: "Herramientas dev",  ru: "Инструменты разработчика" },
    "tabs.domTitle":     { en: "DOM Tools",       de: "DOM-Tools",        zh: "DOM 工具",   fr: "Outils DOM",         es: "Herramientas DOM",  ru: "DOM-инструменты"      },
    "tabs.puppy":        { en: "Puppy",           de: "Welpe",            zh: "小狗",       fr: "Chiot",              es: "Cachorro",          ru: "Щенок"                },
    "tabs.kitty":        { en: "Kitty",           de: "Kätzchen",         zh: "小猫",       fr: "Chaton",             es: "Gatita",            ru: "Киска"                },

    // ─── QUICK ACTIONS ─────────────────────────────────────────────────────
    "qa.releaseRestraints":  { en: "Release Restraints", de: "Fesseln lösen",       zh: "解除束缚",   fr: "Libérer les liens",       es: "Soltar ataduras",     ru: "Снять путы"                },
    "qa.removeLocks":        { en: "Remove Locks",       de: "Schlösser entfernen", zh: "移除锁具",   fr: "Retirer les serrures",    es: "Quitar candados",     ru: "Убрать замки"              },
    "qa.releaseTitle":       { en: "Remove all restraints (skips owner/lover/family locks)", de: "Alle Fesseln entfernen (überspringt Besitzer-/Partner-/Familienschlösser)", zh: "移除所有束缚（跳过主人/恋人/家人的锁）", fr: "Retirer tous les liens (ignore serrures propriétaire/amant/famille)", es: "Quitar todas las ataduras (omite candados de dueño/amante/familia)", ru: "Снять все путы (кроме замков хозяина/возлюбленного/семьи)" },
    "qa.removeLocksTitle":   { en: "Remove all locks (skips owner/lover/family locks)",    de: "Alle Schlösser entfernen (überspringt Besitzer-/Partner-/Familienschlösser)", zh: "移除所有锁具（跳过主人/恋人/家人的锁）", fr: "Retirer toutes les serrures (ignore serrures propriétaire/amant/famille)", es: "Quitar todos los candados (omite candados de dueño/amante/familia)", ru: "Убрать все замки (кроме замков хозяина/возлюбленного/семьи)" },
    "qa.confirmBeforeEscaping": { en: "Confirm before escaping",  de: "Vor dem Entkommen bestätigen",  zh: "逃脱前确认",   fr: "Confirmer avant de s'échapper", es: "Confirmar antes de escapar", ru: "Подтвердить перед освобождением" },
    "qa.pickRestraints":     { en: "↓ Pick restraints to remove", de: "↓ Fesseln zum Entfernen wählen", zh: "↓ 选择要移除的束缚", fr: "↓ Choisir les liens à retirer", es: "↓ Elegir ataduras a quitar", ru: "↓ Выбрать путы для снятия" },
    "qa.pickTitle":          { en: "Choose specific restraints to strip from yourself", de: "Bestimmte Fesseln zum Entfernen auswählen", zh: "选择要解除的特定束缚", fr: "Choisir des liens spécifiques à retirer", es: "Elegir ataduras específicas a quitar", ru: "Выбрать конкретные путы для снятия" },
    "qa.restraintsHeader":   { en: "RESTRAINTS",  de: "FESSELN",     zh: "束缚",   fr: "LIENS",      es: "ATADURAS",  ru: "ПУТЫ"                      },
    "qa.locksHeader":        { en: "LOCKS",        de: "SCHLÖSSER",   zh: "锁具",   fr: "SERRURES",   es: "CANDADOS",  ru: "ЗАМКИ"                     },
    "qa.nothingToRemove":    { en: "Nothing to remove — no restraints or locks found.", de: "Nichts zu entfernen — keine Fesseln oder Schlösser gefunden.", zh: "无需移除——未找到束缚或锁具。", fr: "Rien à retirer — aucun lien ou serrure trouvé.", es: "Nada que quitar — no se encontraron ataduras ni candados.", ru: "Нечего снимать — путы или замки не найдены." },
    "qa.removeSelected":     { en: "↑ Remove Selected",   de: "↑ Ausgewählte entfernen",   zh: "↑ 移除所选",    fr: "↑ Retirer la sélection",      es: "↑ Quitar seleccionados",  ru: "↑ Снять выбранное"         },
    "qa.unlockSelected":     { en: "🔓 Unlock Selected",  de: "🔓 Ausgewählte entsperren", zh: "🔓 解锁所选",   fr: "🔓 Déverrouiller la sélection", es: "🔓 Desbloquear seleccionados", ru: "🔓 Разблокировать выбранное" },
    "qa.selectRestraintsFirst": { en: "Select restraints first.", de: "Zuerst Fesseln auswählen.",   zh: "请先选择束缚。",  fr: "Sélectionner des liens d'abord.", es: "Selecciona ataduras primero.", ru: "Сначала выберите путы."   },
    "qa.selectLocksFirst":   { en: "Select locks first.",    de: "Zuerst Schlösser auswählen.", zh: "请先选择锁具。",  fr: "Sélectionner des serrures d'abord.", es: "Selecciona candados primero.", ru: "Сначала выберите замки."  },
    "qa.nothingRemoved":     { en: "Nothing removed.",    de: "Nichts entfernt.",     zh: "未移除任何物品。",   fr: "Rien retiré.",      es: "Nada quitado.",      ru: "Ничего не снято."          },
    "qa.nothingUnlocked":    { en: "Nothing unlocked.",   de: "Nichts entsperrt.",    zh: "未解锁任何物品。",   fr: "Rien déverrouillé.", es: "Nada desbloqueado.", ru: "Ничего не разблокировано." },
    "qa.removedN":           { en: "✓ Removed {n} item(s).",   de: "✓ {n} Element(e) entfernt.",    zh: "✓ 已移除 {n} 件物品。",  fr: "✓ {n} élément(s) retiré(s).",       es: "✓ {n} elemento(s) quitado(s).",     ru: "✓ Снято {n} предм."       },
    "qa.unlockedN":          { en: "✓ Unlocked {n} item(s).",  de: "✓ {n} Element(e) entsperrt.",   zh: "✓ 已解锁 {n} 件物品。",  fr: "✓ {n} élément(s) déverrouillé(s).", es: "✓ {n} elemento(s) desbloqueado(s).", ru: "✓ Разблоков. {n} предм."  },

    // ─── SLOW LEAVE ────────────────────────────────────────────────────────
    "sl.header":     { en: "🚶 Slow Leave",     de: "🚶 Langsam gehen",         zh: "🚶 慢慢离开",    fr: "🚶 Partir lentement",           es: "🚶 Salida lenta",     ru: "🚶 Медленный уход"              },
    "sl.durationTitle": { en: "Slow leave duration", de: "Dauer des langsamen Gehens", zh: "慢离开持续时间", fr: "Durée de la sortie lente",    es: "Duración de salida lenta", ru: "Продолжительность медленного ухода" },
    "sl.leave":      { en: "🚶 Slow Leave",     de: "🚶 Langsam gehen",         zh: "🚶 慢慢离开",    fr: "🚶 Partir lentement",           es: "🚶 Salida lenta",     ru: "🚶 Медленный уход"              },
    "sl.leaveTitle": { en: "Wave goodbye and slowly head for the door", de: "Auf Wiedersehen winken und langsam zur Tür gehen", zh: "挥手告别，慢慢走向门口", fr: "Dire au revoir et se diriger lentement vers la porte", es: "Despedirse y caminar lentamente hacia la puerta", ru: "Помашите на прощание и медленно направьтесь к двери" },
    "sl.cancel":     { en: "✕ Cancel Leave",    de: "✕ Abbrechen",              zh: "✕ 取消离开",    fr: "✕ Annuler la sortie",           es: "✕ Cancelar salida",   ru: "✕ Отменить уход"               },
    "sl.seqHint":    { en: "Sequence for this preset — edit to customise. Steps separated by |, duration placeholder @{DUR}", de: "Sequenz für dieses Preset — bearbeiten zum Anpassen. Schritte durch | getrennt, Dauer @{DUR}", zh: "此预设的序列——编辑以自定义。步骤以 | 分隔，时长占位符 @{DUR}", fr: "Séquence pour ce preset — modifier pour personnaliser. Étapes séparées par |, durée @{DUR}", es: "Secuencia para este preset — editar para personalizar. Pasos con |, marcador @{DUR}", ru: "Последовательность — редактировать для настройки. Шаги через |, длительность @{DUR}" },

    // ─── OUTFITS TAB ───────────────────────────────────────────────────────
    "outfits.savedOutfits":      { en: "Saved Outfits",               de: "Gespeicherte Outfits",          zh: "已保存的服装",      fr: "Tenues sauvegardées",           es: "Atuendos guardados",           ru: "Сохранённые наряды"           },
    "outfits.outfitSchedule":    { en: "OUTFIT SCHEDULE",             de: "OUTFIT-ZEITPLAN",               zh: "服装计划",          fr: "PROGRAMME TENUES",              es: "PROGRAMA DE ATUENDOS",         ru: "РАСПИСАНИЕ НАРЯДОВ"           },
    "outfits.savedRestraints":   { en: "Saved Restraints",            de: "Gespeicherte Fesseln",          zh: "已保存的束缚",      fr: "Liens sauvegardés",             es: "Ataduras guardadas",           ru: "Сохранённые путы"             },
    "outfits.filter":            { en: "Filter outfits…",             de: "Outfits filtern…",              zh: "过滤服装…",         fr: "Filtrer les tenues…",           es: "Filtrar atuendos…",            ru: "Фильтр нарядов…"              },
    "outfits.noOutfits":         { en: "No outfits saved yet.",       de: "Noch keine Outfits gespeichert.", zh: "尚未保存任何服装。", fr: "Aucune tenue sauvegardée.",     es: "No hay atuendos guardados.",   ru: "Нарядов пока нет."            },
    "outfits.noMatch":           { en: "No outfits match your filter.", de: "Keine Outfits entsprechen dem Filter.", zh: "没有匹配的服装。", fr: "Aucune tenue ne correspond.",  es: "No hay atuendos que coincidan.", ru: "Нет нарядов по фильтру."     },
    "outfits.useFormBelow":      { en: "Use the form below to create one.", de: "Erstelle eines mit dem Formular unten.", zh: "使用下方表单创建一个。", fr: "Utiliser le formulaire ci-dessous pour en créer une.", es: "Usa el formulario de abajo para crear uno.", ru: "Используйте форму ниже для создания." },
    "outfits.namePlaceholder":   { en: "Outfit name (e.g. Rope Set)", de: "Outfit-Name (z. B. Seil-Set)",  zh: "服装名称（如绳索套装）", fr: "Nom de la tenue (ex: Ensemble cordes)", es: "Nombre del atuendo (ej. Juego de cuerdas)", ru: "Название наряда (напр. Верёвки)" },
    "outfits.cmdPlaceholder":    { en: "Outfit command (e.g. /rope)", de: "Outfit-Befehl (z. B. /seil)",   zh: "服装命令（如 /rope）", fr: "Commande tenue (ex: /cordes)",  es: "Comando atuendo (ej. /cuerda)", ru: "Команда наряда (напр. /rope)" },
    "outfits.preserveBonds":     { en: "Preserve bonds",              de: "Fesseln beibehalten",           zh: "保留束缚",          fr: "Conserver les liens",           es: "Mantener ataduras",            ru: "Сохранить путы"               },
    "outfits.swapBonds":         { en: "Swap bonds",                  de: "Fesseln tauschen",              zh: "交换束缚",          fr: "Échanger les liens",            es: "Intercambiar ataduras",        ru: "Поменять путы"                },
    "outfits.keepClothes":       { en: "Keep clothes",                de: "Kleidung behalten",             zh: "保留衣物",          fr: "Garder les vêtements",          es: "Mantener ropa",                ru: "Сохранить одежду"             },
    "outfits.swapClothes":       { en: "Swap clothes",                de: "Kleidung tauschen",             zh: "交换衣物",          fr: "Échanger les vêtements",        es: "Intercambiar ropa",            ru: "Поменять одежду"              },
    "outfits.newOutfit":         { en: "+ New Outfit from Current Look", de: "+ Neues Outfit vom aktuellen Aussehen", zh: "+ 从当前外观创建新服装", fr: "+ Nouvelle tenue depuis la tenue actuelle", es: "+ Nuevo atuendo desde el aspecto actual", ru: "+ Новый наряд из текущего образа" },
    "outfits.saveNewOutfit":     { en: "Save as New Outfit",          de: "Als neues Outfit speichern",    zh: "保存为新服装",      fr: "Sauvegarder comme nouvelle tenue", es: "Guardar como nuevo atuendo",  ru: "Сохранить как новый наряд"    },
    "outfits.importOutfit":      { en: "↓ Import Outfit",             de: "↓ Outfit importieren",          zh: "↓ 导入服装",        fr: "↓ Importer une tenue",          es: "↓ Importar atuendo",           ru: "↓ Импорт наряда"              },
    "outfits.importPlaceholder": { en: "Paste BC outfit code…",       de: "BC-Outfit-Code einfügen…",      zh: "粘贴 BC 服装代码…", fr: "Coller le code de tenue BC…",   es: "Pegar código de atuendo BC…",  ru: "Вставьте код наряда BC…"      },
    "outfits.importBCPlaceholder": { en: "Paste LZ/JSON BC code…",   de: "LZ/JSON-BC-Code einfügen…",     zh: "粘贴 LZ/JSON BC 代码…", fr: "Coller le code LZ/JSON BC…", es: "Pegar código LZ/JSON BC…",    ru: "Вставьте LZ/JSON код BC…"     },
    "outfits.importFromBCCode":  { en: "↓ Import from BC Code",       de: "↓ Aus BC-Code importieren",     zh: "↓ 从 BC 代码导入",  fr: "↓ Importer depuis le code BC",  es: "↓ Importar desde código BC",   ru: "↓ Импорт из кода BC"          },
    "outfits.cancelImport":      { en: "- Cancel Import",             de: "- Import abbrechen",            zh: "- 取消导入",        fr: "- Annuler l'importation",       es: "- Cancelar importación",       ru: "- Отмена импорта"             },
    "outfits.invalidFormat":     { en: "Invalid format — check the pasted text.", de: "Ungültiges Format — überprüfe den eingefügten Text.", zh: "无效格式——请检查粘贴的文本。", fr: "Format invalide — vérifier le texte collé.", es: "Formato inválido — revisa el texto pegado.", ru: "Неверный формат — проверьте текст." },
    "outfits.keepBondsFlag":     { en: "⛓ Keep bonds",               de: "⛓ Fesseln beh.",               zh: "⛓ 保留束缚",        fr: "⛓ Garder liens",               es: "⛓ Mantener ataduras",          ru: "⛓ Сохр. путы"                 },
    "outfits.swapBondsFlag":     { en: "⛓ Swap bonds",               de: "⛓ Fesseln tauschen",           zh: "⛓ 交换束缚",        fr: "⛓ Éch. liens",                 es: "⛓ Intercambiar ataduras",      ru: "⛓ Поменять путы"              },
    "outfits.keepClothesFlag":   { en: "👗 Keep clothes",             de: "👗 Kleidung beh.",              zh: "👗 保留衣物",        fr: "👗 Garder vêtements",           es: "👗 Mantener ropa",              ru: "👗 Сохр. одежду"               },
    "outfits.swapClothesFlag":   { en: "👗 Swap clothes",             de: "👗 Kleidung tauschen",          zh: "👗 交换衣物",        fr: "👗 Éch. vêtements",             es: "👗 Intercambiar ropa",          ru: "👗 Поменять одежду"            },
    "outfits.saveChanges":       { en: "✓ Save Changes",              de: "✓ Änderungen speichern",        zh: "✓ 保存更改",        fr: "✓ Enregistrer les modifications", es: "✓ Guardar cambios",           ru: "✓ Сохранить изменения"        },
    "outfits.deleteTitle":       { en: "Delete this outfit",          de: "Dieses Outfit löschen",         zh: "删除此服装",        fr: "Supprimer cette tenue",         es: "Eliminar este atuendo",        ru: "Удалить этот наряд"           },
    "outfits.updateTitle":       { en: "Save current look to this outfit", de: "Aktuelles Aussehen in diesem Outfit speichern", zh: "将当前外观保存到此服装", fr: "Sauvegarder la tenue actuelle", es: "Guardar aspecto actual en este atuendo", ru: "Сохранить текущий образ в наряд" },
    "outfits.noOutfitsDropdown": { en: "No outfits",                  de: "Keine Outfits",                 zh: "没有服装",          fr: "Aucune tenue",                  es: "Sin atuendos",                 ru: "Нет нарядов"                  },
    "outfits.nameLabel":         { en: "Name",                        de: "Name",                          zh: "名称",              fr: "Nom",                           es: "Nombre",                       ru: "Название"                     },
    "outfits.commandLabel":      { en: "Command",                     de: "Befehl",                        zh: "命令",              fr: "Commande",                      es: "Comando",                      ru: "Команда"                      },
    "outfits.announceLabel":     { en: "Announce",                    de: "Ankündigung",                   zh: "公告",              fr: "Annonce",                       es: "Anuncio",                      ru: "Объявление"                   },
    "outfits.announcePlaceholder": { en: "Room announce on wear (optional)", de: "Raum-Ankündigung beim Tragen (optional)", zh: "穿戴时的房间公告（可选）", fr: "Annonce salle au port (optionnel)", es: "Anuncio al ponerse (opcional)", ru: "Объявление при надевании (необязательно)" },
    "outfits.nicknamePlaceholder": { en: "Your usual nickname",       de: "Dein üblicher Spitzname",       zh: "你的常用昵称",      fr: "Votre surnom habituel",         es: "Tu apodo habitual",            ru: "Ваш обычный псевдоним"        },
    "outfits.noSchedules":       { en: "No schedules set.",           de: "Keine Zeitpläne festgelegt.",   zh: "尚未设置计划。",    fr: "Aucun programme défini.",       es: "Sin programas configurados.",  ru: "Расписаний не задано."        },
    "outfits.timePlaceholder":   { en: "HH:MM",                       de: "HH:MM",                         zh: "时:分",             fr: "HH:MM",                         es: "HH:MM",                        ru: "ЧЧ:ММ"                        },
    "outfits.timeTitle":         { en: "24-hour time (e.g. 08:30, 14:00)", de: "24-Stunden-Zeit (z. B. 08:30, 14:00)", zh: "24小时制（如 08:30、14:00）", fr: "Heure sur 24h (ex: 08:30, 14:00)", es: "Hora en 24h (ej. 08:30, 14:00)", ru: "24-часовой формат (напр. 08:30)" },
    "outfits.removeSchedule":    { en: "Remove schedule",             de: "Zeitplan entfernen",            zh: "移除计划",          fr: "Retirer le programme",          es: "Quitar programa",              ru: "Удалить расписание"           },
    "outfits.addSchedule":       { en: "+ Add Schedule",              de: "+ Zeitplan hinzufügen",         zh: "+ 添加计划",        fr: "+ Ajouter un programme",        es: "+ Añadir programa",            ru: "+ Добавить расписание"         },
    "outfits.protectedItems":    { en: "PROTECTED ITEMS",             de: "GESCHÜTZTE GEGENSTÄNDE",        zh: "受保护的物品",      fr: "OBJETS PROTÉGÉS",               es: "OBJETOS PROTEGIDOS",           ru: "ЗАЩИЩЁННЫЕ ПРЕДМЕТЫ"          },
    "outfits.coloursN":          { en: "COLOURS ({n} saved)",         de: "FARBEN ({n} gespeichert)",      zh: "颜色（已保存 {n}）", fr: "COULEURS ({n} sauveg.)",        es: "COLORES ({n} guardados)",      ru: "ЦВЕТА ({n} сохранено)"        },
    "outfits.colours":           { en: "COLOURS",                     de: "FARBEN",                        zh: "颜色",              fr: "COULEURS",                      es: "COLORES",                      ru: "ЦВЕТА"                        },
    "outfits.tagsN":             { en: "Tags ({n} saved)",            de: "Etiketten ({n} gespeichert)",   zh: "标签（已保存 {n}）", fr: "Tags ({n} sauveg.)",            es: "Etiquetas ({n} guardadas)",    ru: "Теги ({n} сохранено)"         },
    "outfits.noSavedColours":    { en: "No saved colours yet — use + Save above", de: "Noch keine Farben gespeichert — oben + Speichern verwenden", zh: "尚未保存颜色——请使用上方的 + 保存", fr: "Aucune couleur sauvegardée — utiliser + Sauvegarder ci-dessus", es: "Sin colores guardados — usa + Guardar arriba", ru: "Цветов пока нет — используйте + Сохранить выше" },

    // ─── RESTRAINTS ────────────────────────────────────────────────────────
    "restraints.noRestraints":   { en: "No restraint sets saved yet.", de: "Noch keine Fesseln-Sets gespeichert.", zh: "尚未保存任何束缚套装。", fr: "Aucun set de liens sauvegardé.", es: "No hay conjuntos de ataduras guardados.", ru: "Наборов пут пока нет."        },
    "restraints.newRestraint":   { en: "+ New Restraint Set from Current", de: "+ Neues Fesseln-Set aus aktueller Situation", zh: "+ 从当前创建新束缚套装", fr: "+ Nouveau set de liens depuis l'actuel", es: "+ Nuevo conjunto desde el actual", ru: "+ Новый набор пут из текущих" },
    "restraints.deleteTitle":    { en: "Delete this restraint set",   de: "Dieses Fesseln-Set löschen",   zh: "删除此束缚套装",    fr: "Supprimer ce set de liens",     es: "Eliminar este conjunto",       ru: "Удалить этот набор пут"       },
    "restraints.updateTitle":    { en: "Save current restraints to this set", de: "Aktuelle Fesseln in diesem Set speichern", zh: "将当前束缚保存到此套装", fr: "Sauvegarder les liens actuels dans ce set", es: "Guardar ataduras actuales en este conjunto", ru: "Сохранить текущие путы в набор" },
    "restraints.filter":         { en: "Filter restraints…",          de: "Fesseln filtern…",              zh: "过滤束缚…",         fr: "Filtrer les liens…",            es: "Filtrar ataduras…",            ru: "Фильтр пут…"                  },
    "restraints.noMatch":        { en: "No restraints match your filter.", de: "Keine Fesseln entsprechen dem Filter.", zh: "没有匹配的束缚。", fr: "Aucun lien ne correspond.", es: "No hay ataduras que coincidan.", ru: "Нет пут по фильтру."          },
    "restraints.importPlaceholder": { en: "Paste BC outfit code…",   de: "BC-Outfit-Code einfügen…",      zh: "粘贴 BC 服装代码…", fr: "Coller le code BC…",            es: "Pegar código BC…",             ru: "Вставьте код наряда BC…"      },
    "restraints.nameLabel":      { en: "Name",                        de: "Name",                          zh: "名称",              fr: "Nom",                           es: "Nombre",                       ru: "Название"                     },
    "restraints.commandLabel":   { en: "Command",                     de: "Befehl",                        zh: "命令",              fr: "Commande",                      es: "Comando",                      ru: "Команда"                      },
    "restraints.saveChanges":    { en: "✓ Save Changes",              de: "✓ Änderungen speichern",        zh: "✓ 保存更改",        fr: "✓ Enregistrer les modifications", es: "✓ Guardar cambios",           ru: "✓ Сохранить изменения"        },

    // ─── BUTTONS TAB ───────────────────────────────────────────────────────
    "buttons.colourPresets":     { en: "COLOUR PRESETS",              de: "FARBVORLAGEN",                  zh: "颜色预设",          fr: "PRÉSETS DE COULEUR",            es: "PRESETS DE COLOR",             ru: "ЦВЕТОВЫЕ ПРЕСЕТЫ"             },
    "buttons.emoteText":         { en: "Emote text…",                 de: "Emote-Text…",                   zh: "表情文字…",         fr: "Texte d'émote…",                es: "Texto de emote…",              ru: "Текст эмоута…"                },
    "buttons.styleAction":       { en: "Action !",                    de: "Aktion !",                      zh: "动作 !",            fr: "Action !",                      es: "Acción !",                     ru: "Действие !"                   },
    "buttons.styleEmote":        { en: "Emote *",                     de: "Emote *",                       zh: "表情 *",            fr: "Émote *",                       es: "Emote *",                      ru: "Эмоут *"                      },
    "buttons.stylePose":         { en: "Pose",                        de: "Pose",                          zh: "姿势",              fr: "Pose",                          es: "Pose",                         ru: "Поза"                         },
    "buttons.styleReset":        { en: "Reset _",                     de: "Reset _",                       zh: "重置 _",            fr: "Reset _",                       es: "Reset _",                      ru: "Сброс _"                      },
    "buttons.styleLeave":        { en: "Leave Room 🚪",               de: "Raum verlassen 🚪",             zh: "离开房间 🚪",       fr: "Quitter la salle 🚪",           es: "Salir de sala 🚪",             ru: "Покинуть комнату 🚪"           },
    "buttons.seqBadge":          { en: "✨ sequence",                  de: "✨ Sequenz",                     zh: "✨ 序列",            fr: "✨ séquence",                    es: "✨ secuencia",                  ru: "✨ последовательность"         },
    "buttons.addCategory":       { en: "+ Add Category",              de: "+ Kategorie hinzufügen",        zh: "+ 添加分类",        fr: "+ Ajouter une catégorie",       es: "+ Añadir categoría",           ru: "+ Добавить категорию"          },
    "buttons.importHint":        { en: "Paste JSON or BC code…",      de: "JSON oder BC-Code einfügen…",   zh: "粘贴 JSON 或 BC 代码…", fr: "Coller JSON ou code BC…",   es: "Pegar JSON o código BC…",      ru: "Вставьте JSON или код BC…"    },
    "buttons.addSlot":           { en: "+ Add",                       de: "+ Hinzufügen",                  zh: "+ 添加",            fr: "+ Ajouter",                     es: "+ Añadir",                     ru: "+ Добавить"                   },
    "buttons.clearAll":          { en: "Clear All",                   de: "Alle löschen",                  zh: "全部清除",          fr: "Tout effacer",                  es: "Borrar todo",                  ru: "Очистить всё"                 },
    "buttons.noCategories":      { en: "No categories yet.",          de: "Noch keine Kategorien.",        zh: "尚无分类。",        fr: "Aucune catégorie.",             es: "Sin categorías aún.",          ru: "Категорий пока нет."          },
    "buttons.categoryName":      { en: "Category name…",              de: "Kategoriename…",                zh: "分类名称…",         fr: "Nom de catégorie…",             es: "Nombre de categoría…",         ru: "Название категории…"          },
    "buttons.renameCategory":    { en: "Rename Category",             de: "Kategorie umbenennen",          zh: "重命名分类",        fr: "Renommer la catégorie",         es: "Renombrar categoría",          ru: "Переименовать категорию"      },
    "buttons.deleteCategory":    { en: "Delete Category",             de: "Kategorie löschen",             zh: "删除分类",          fr: "Supprimer la catégorie",        es: "Eliminar categoría",           ru: "Удалить категорию"            },
    "buttons.showSidebar":       { en: "Show quick-emote sidebar buttons", de: "Schnell-Emote-Seitenleiste anzeigen", zh: "显示快速表情侧边栏按钮", fr: "Afficher les boutons d'émote rapide", es: "Mostrar botones de emote rápido", ru: "Показать кнопки боковой панели" },
    "buttons.funActions":        { en: "FUN ACTIONS",                 de: "SPASS-AKTIONEN",                zh: "趣味动作",          fr: "ACTIONS AMUSANTES",             es: "ACCIONES DIVERTIDAS",          ru: "ВЕСЁЛЫЕ ДЕЙСТВИЯ"             },
    "buttons.usefulButtons":     { en: "USEFUL BUTTONS",              de: "NÜTZLICHE TASTEN",              zh: "实用按键",          fr: "BOUTONS UTILES",                es: "BOTONES ÚTILES",               ru: "ПОЛЕЗНЫЕ КНОПКИ"              },
    "buttons.oocModeOn":         { en: "( OOC Mode: ON — click to turn off",   de: "( OOC-Modus: AN — zum Deaktivieren klicken",  zh: "（OOC 模式：开 — 点击关闭）", fr: "( Mode OOC : ACTIVÉ — cliquer pour désactiver",  es: "( Modo OOC: ACTIVADO — clic para desactivar",  ru: "( Режим OOC: ВКЛ — нажмите для выкл" },
    "buttons.oocModeOff":        { en: "( OOC Mode: OFF — click to turn on",   de: "( OOC-Modus: AUS — zum Aktivieren klicken",   zh: "（OOC 模式：关 — 点击开启）", fr: "( Mode OOC : DÉSACTIVÉ — cliquer pour activer", es: "( Modo OOC: DESACTIVADO — clic para activar",  ru: "( Режим OOC: ВЫКЛ — нажмите для вкл" },
    "buttons.copyMemberNumber":  { en: "Copy My Member Number",       de: "Mitgliedsnummer kopieren",      zh: "复制我的成员编号",  fr: "Copier mon numéro membre",      es: "Copiar mi número de miembro",  ru: "Копировать номер участника"   },
    "buttons.resetDefaultPose":  { en: "Reset to Default Pose",       de: "Auf Standardpose zurücksetzen", zh: "重置为默认姿势",    fr: "Réinitialiser la pose",         es: "Restablecer pose predeterminada", ru: "Сбросить позу до стандартной"},
    "buttons.resetDefaultPoseTitle": { en: "Clears all active poses back to standing", de: "Alle aktiven Posen auf Stehen zurücksetzen", zh: "清除所有活动姿势，恢复站立", fr: "Efface toutes les poses actives (retour debout)", es: "Borra todas las poses activas (vuelve de pie)", ru: "Сбрасывает все позы до стоячей" },
    "buttons.noFriendsHere":     { en: "No friends here~",            de: "Keine Freunde hier~",           zh: "房间里没有朋友~",   fr: "Aucun ami ici~",                es: "No hay amigos aquí~",          ru: "Здесь нет друзей~"            },
    "buttons.boopedN":           { en: "Booped {n}!",                 de: "{n} gestupst!",                 zh: "戳了 {n} 个！",     fr: "Touché {n} !",                  es: "¡Tocado a {n}!",               ru: "Потыкали {n}!"                },

    // ─── ANIMS TAB ─────────────────────────────────────────────────────────
    "anims.poseCombos":    { en: "Pose Combos",        de: "Pose-Kombinationen",      zh: "姿势组合",          fr: "Combos de poses",           es: "Combos de poses",          ru: "Комбинации поз"           },
    "anims.noCombos":      { en: "No combos saved.",   de: "Keine Kombos gespeichert.", zh: "尚未保存任何组合。", fr: "Aucun combo sauvegardé.", es: "No hay combos guardados.", ru: "Комбинаций не сохранено." },
    "anims.newCombo":      { en: "+ New Pose Combo",   de: "+ Neue Pose-Kombination",  zh: "+ 新建姿势组合",    fr: "+ Nouveau combo de poses",  es: "+ Nuevo combo de poses",   ru: "+ Новая комбинация поз"   },
    "anims.newPresetName": { en: "New preset name…",   de: "Neuer Preset-Name…",      zh: "新预设名称…",       fr: "Nouveau nom de preset…",   es: "Nuevo nombre de preset…",  ru: "Название нового пресета…" },
    "anims.saveCombo":     { en: "✓ Save Combo",       de: "✓ Kombination speichern", zh: "✓ 保存组合",        fr: "✓ Sauvegarder le combo",    es: "✓ Guardar combo",          ru: "✓ Сохранить комбинацию"   },
    "anims.delay":         { en: "Delay (ms)",         de: "Verzögerung (ms)",        zh: "延迟（毫秒）",      fr: "Délai (ms)",                es: "Retardo (ms)",             ru: "Задержка (мс)"            },
    "anims.addStep":       { en: "+ Add Step",         de: "+ Schritt hinzufügen",    zh: "+ 添加步骤",        fr: "+ Ajouter une étape",       es: "+ Añadir paso",            ru: "+ Добавить шаг"           },
    "anims.poseHint":      { en: "Pick one Body pose and one Arm pose — they stack!", de: "Eine Körperpose und eine Armpose wählen — sie stapeln sich!", zh: "选择一个身体姿势和一个手臂姿势——可叠加！", fr: "Choisir une pose de corps et une de bras — elles se combinent !", es: "Elige una pose de cuerpo y una de brazos — ¡se combinan!", ru: "Выберите позу тела и позу рук — они сочетаются!" },
    "anims.scenes":        { en: "SCENES",             de: "SZENEN",                  zh: "场景",              fr: "SCÈNES",                    es: "ESCENAS",                  ru: "СЦЕНЫ"                    },
    "anims.scenesHint":    { en: "Chain poses, item changes, emotes and pauses into a timed sequence.", de: "Posen, Kleidungsänderungen, Emotes und Pausen zu einer zeitgesteuerten Sequenz verbinden.", zh: "将姿势、物品更换、表情和暂停串成一个定时序列。", fr: "Enchaîner poses, changements d'objet, émotes et pauses en une séquence minutée.", es: "Encadena poses, cambios de objeto, emotes y pausas en una secuencia cronometrada.", ru: "Объедините позы, смену предметов, эмоуты и паузы в последовательность." },

    // ─── USERS/NOTES TAB ───────────────────────────────────────────────────
    "users.peopleInRoom":      { en: "People in Room",         de: "Personen im Raum",         zh: "房间中的人",        fr: "Personnes dans la salle",    es: "Personas en la sala",       ru: "Люди в комнате"            },
    "users.friends":           { en: "Friends",                de: "Freunde",                  zh: "好友",              fr: "Amis",                       es: "Amigos",                    ru: "Друзья"                    },
    "users.autoReplyWhenAfk":  { en: "Auto-reply when AFK",   de: "Auto-Antwort wenn AFK",    zh: "AFK 时自动回复",    fr: "Réponse auto quand AFK",     es: "Respuesta auto cuando AFK", ru: "Авто-ответ при AFK"        },
    "users.header":            { en: "User Notes",             de: "Benutzernotizen",          zh: "用户笔记",          fr: "Notes utilisateur",          es: "Notas de usuario",          ru: "Заметки о пользователях"   },
    "users.noteHint":          { en: "Notes about this person...", de: "Notizen zu dieser Person...", zh: "关于此人的备注...", fr: "Notes sur cette personne...", es: "Notas sobre esta persona...", ru: "Заметки об этом человеке..." },
    "users.savedAutomatically":{ en: "Saved automatically",    de: "Automatisch gespeichert",  zh: "自动保存",          fr: "Sauvegardé automatiquement", es: "Guardado automáticamente",  ru: "Сохраняется автоматически" },
    "users.noOneInRoom":       { en: "No people in the room yet.", de: "Noch niemand im Raum.", zh: "房间里还没有人。",   fr: "Personne dans la salle.",    es: "Nadie en la sala aún.",     ru: "В комнате пока никого нет." },
    "users.friendsSince":      { en: "🤝 Friends since: {date}",  de: "🤝 Freunde seit: {date}", zh: "🤝 好友自: {date}", fr: "🤝 Amis depuis : {date}",    es: "🤝 Amigos desde: {date}",   ru: "🤝 Друзья с: {date}"       },
    "users.friendsSinceUnknown": { en: "🤝 Friends since: Unknown", de: "🤝 Freunde seit: Unbekannt", zh: "🤝 好友自：未知", fr: "🤝 Amis depuis : inconnu",  es: "🤝 Amigos desde: desconocido", ru: "🤝 Друзья с: неизвестно"  },
    "users.pinToTop":          { en: "📌 Pin to top",          de: "📌 Oben anheften",          zh: "📌 置顶",            fr: "📌 Épingler en haut",         es: "📌 Fijar arriba",            ru: "📌 Закрепить сверху"        },
    "users.unpin":             { en: "📌 Unpin",               de: "📌 Lösen",                  zh: "📌 取消置顶",       fr: "📌 Désépingler",              es: "📌 Desfijar",                ru: "📌 Открепить"               },
    "users.newTagPlaceholder": { en: "new tag…",               de: "neues Etikett…",            zh: "新标签…",           fr: "nouveau tag…",                es: "nueva etiqueta…",           ru: "новый тег…"                },
    "users.typeMessage":       { en: "Type a message...",      de: "Nachricht eingeben...",     zh: "输入消息...",       fr: "Tapez un message...",         es: "Escribe un mensaje...",     ru: "Введите сообщение..."      },
    "users.reply":             { en: "↩ reply",                de: "↩ Antworten",               zh: "↩ 回复",            fr: "↩ répondre",                  es: "↩ responder",               ru: "↩ ответить"                },
    "users.noConversation":    { en: "No conversation yet.",   de: "Noch keine Unterhaltung.",  zh: "还没有对话。",      fr: "Aucune conversation.",        es: "Sin conversación aún.",     ru: "Разговора пока нет."       },

    // ─── DEV TAB ───────────────────────────────────────────────────────────
    "dev.characterInspector": { en: "Character Inspector",   de: "Charakter-Inspektor",       zh: "角色检查器",        fr: "Inspecteur de personnage",    es: "Inspector de personaje",    ru: "Инспектор персонажа"       },
    "dev.searchPlaceholder":  { en: "Search name or #id…",   de: "Name oder #ID suchen…",     zh: "搜索名称或 #ID…",   fr: "Chercher nom ou #id…",        es: "Buscar nombre o #id…",      ru: "Поиск по имени или #id…"   },
    "dev.activeRestraints":   { en: "ACTIVE RESTRAINTS",     de: "AKTIVE FESSELN",            zh: "当前束缚",          fr: "LIENS ACTIFS",                es: "ATADURAS ACTIVAS",          ru: "АКТИВНЫЕ ПУТЫ"             },
    "dev.charNotFound":       { en: "Character not found.",  de: "Charakter nicht gefunden.", zh: "未找到角色。",      fr: "Personnage introuvable.",     es: "Personaje no encontrado.",  ru: "Персонаж не найден."       },
    "dev.charNotInRoom":      { en: "Character not found in room.", de: "Charakter nicht im Raum.", zh: "未在房间中找到角色。", fr: "Personnage non trouvé dans la salle.", es: "Personaje no encontrado en la sala.", ru: "Персонаж не найден в комнате." },
    "dev.facePresets":        { en: "FACE PRESETS",          de: "GESICHTS-PRESETS",          zh: "面部预设",          fr: "PRÉSETS DE VISAGE",           es: "PRESETS DE CARA",           ru: "ПРЕСЕТЫ ЛИЦА"              },
    "dev.saveFace":           { en: "💾 Save face",          de: "💾 Gesicht speichern",      zh: "💾 保存面部",       fr: "💾 Sauvegarder le visage",    es: "💾 Guardar cara",            ru: "💾 Сохранить лицо"          },
    "dev.clearExpressions":   { en: "✕ Clear all expressions", de: "✕ Alle Ausdrücke löschen", zh: "✕ 清除所有表情",   fr: "✕ Effacer toutes les expressions", es: "✕ Borrar todas las expresiones", ru: "✕ Очистить все выражения"  },
    "dev.whisperLog":         { en: "Whisper Log",           de: "Flüster-Log",               zh: "私语日志",          fr: "Journal des chuchotements",   es: "Registro de susurros",      ru: "Журнал шёпота"             },
    "dev.devLog":             { en: "Dev Log",               de: "Entwickler-Log",            zh: "开发日志",          fr: "Journal de développement",    es: "Registro de desarrollo",    ru: "Журнал разработчика"       },
    "dev.noWhispers":         { en: "No whispers this session yet.", de: "Noch keine Flüster-Nachrichten in dieser Sitzung.", zh: "本次会话暂无私语。", fr: "Aucun chuchotement dans cette session.", es: "Sin susurros en esta sesión aún.", ru: "Шёпота в этой сессии пока нет." },
    "dev.enableDevLogging":   { en: "📟 Enable dev logging", de: "📟 Protokollierung aktivieren", zh: "📟 启用开发日志",  fr: "📟 Activer la journalisation", es: "📟 Activar registro dev",   ru: "📟 Включить журнал разработчика" },
    "dev.injectTestEntry":    { en: "Inject test entry",     de: "Testeintrag einfügen",      zh: "注入测试条目",      fr: "Injecter entrée test",        es: "Inyectar entrada prueba",   ru: "Вставить тестовую запись"  },
    "dev.clearLog":           { en: "Clear",                 de: "Löschen",                   zh: "清除",              fr: "Effacer",                     es: "Borrar",                    ru: "Очистить"                  },
    "dev.ebcTags":            { en: "EBC TAGS",              de: "EBC-ETIKETTEN",             zh: "EBC 标签",          fr: "ÉTIQUETTES EBC",              es: "ETIQUETAS EBC",             ru: "EBC-ТЕГИ"                  },
    "dev.showMyTag":          { en: "My EBC tag (visible to others)",     de: "Mein EBC-Etikett (für andere sichtbar)",    zh: "我的 EBC 标签（其他人可见）",   fr: "Mon étiquette EBC (visible par les autres)",  es: "Mi etiqueta EBC (visible para otros)",         ru: "Мой EBC-тег (виден другим)"           },
    "dev.showOthersTags":     { en: "Others' EBC tags (on your screen)",  de: "EBC-Etiketten anderer (auf deinem Bildschirm)", zh: "他人的 EBC 标签（你的屏幕）", fr: "Étiquettes EBC des autres (sur votre écran)", es: "Etiquetas EBC de otros (en tu pantalla)",      ru: "EBC-теги других (на вашем экране)"    },
    "dev.drawerPrefs":        { en: "DRAWER PREFERENCES",   de: "FENSTER-EINSTELLUNGEN",     zh: "面板偏好",          fr: "PRÉFÉRENCES DU PANNEAU",      es: "PREFERENCIAS DEL PANEL",    ru: "НАСТРОЙКИ ПАНЕЛИ"          },
    "dev.ebcUsersInRoom":     { en: "EBC USERS IN THIS ROOM", de: "EBC-NUTZER IM RAUM",      zh: "房间中的 EBC 用户", fr: "UTILISATEURS EBC DANS LA SALLE", es: "USUARIOS EBC EN LA SALA",  ru: "EBC-ПОЛЬЗОВАТЕЛИ В КОМНАТЕ"},
    "dev.developerTools":     { en: "DEVELOPER TOOLS",      de: "ENTWICKLER-WERKZEUGE",      zh: "开发者工具",        fr: "OUTILS DÉVELOPPEUR",          es: "HERRAMIENTAS DEV",          ru: "ИНСТРУМЕНТЫ РАЗРАБОТЧИКА"  },
    "dev.copyRestraintsFromMember": { en: "COPY RESTRAINTS FROM MEMBER", de: "FESSELN VON MITGLIED KOPIEREN", zh: "从成员复制束缚", fr: "COPIER LES LIENS D'UN MEMBRE", es: "COPIAR ATADURAS DE MIEMBRO", ru: "КОПИРОВАТЬ ПУТЫ ОТ УЧАСТНИКА" },
    "dev.statEditor":         { en: "STAT EDITOR",          de: "STATISTIK-EDITOR",          zh: "属性编辑器",        fr: "ÉDITEUR DE STATS",            es: "EDITOR DE STATS",           ru: "РЕДАКТОР ХАРАКТЕРИСТИК"    },
    "dev.peopleMet":          { en: "PEOPLE MET",           de: "BEKANNTE PERSONEN",         zh: "已认识的人",        fr: "PERSONNES RENCONTRÉES",       es: "PERSONAS CONOCIDAS",        ru: "ВСТРЕЧЕННЫЕ ЛЮДИ"          },

    // ─── CREDITS TAB ───────────────────────────────────────────────────────────
    "credits.specialThanks":  { en: "Special Thanks",       de: "Besonderer Dank",           zh: "特别感谢",          fr: "Remerciements spéciaux",      es: "Agradecimientos especiales", ru: "Особая благодарность"      },
    "credits.intro":          { en: "People who made EBC possible.", de: "Menschen, die EBC möglich gemacht haben.", zh: "让 EBC 成为可能的人们。", fr: "Les personnes qui ont rendu EBC possible.", es: "Las personas que hicieron posible EBC.", ru: "Люди, которые сделали EBC возможным." },
    "credits.emery":          { en: "Built this little thing out of love for the club. Still adding to it, still breaking it, still fixing it~", de: "Hat dieses kleine Ding aus Liebe zum Club gebaut. Fügt noch immer hinzu, bricht es, repariert es~", zh: "出于对俱乐部的热爱打造了这个小工具。还在添加功能，还在弄坏它，还在修复它~", fr: "A créé ce petit truc par amour pour le club. Ajoute encore, le casse encore, le répare encore~", es: "Construyó esta cosita por amor al club. Sigue añadiendo, sigue rompiéndola, sigue arreglándola~", ru: "Создала это из любви к клубу. Всё ещё добавляет, ломает и чинит~" },
    "credits.sin":            { en: "Creator of CRABS — the sliding panel design that inspired the whole look and feel of this drawer. Her open code became the foundation it was all built on, and she was genuinely kind and helpful when it mattered too. Open code, open heart.", de: "Schöpferin von CRABS — das Schiebefeld-Design, das das Aussehen dieser Schublade inspiriert hat. Ihr offener Code wurde das Fundament, auf dem alles aufgebaut wurde. Offener Code, offenes Herz.", zh: "CRABS 的创建者——滑动面板设计启发了这个抽屉的整体外观。她的开源代码成为整个项目的基础，在最关键时刻也真诚地给予帮助。开放代码，开放的心。", fr: "Créatrice de CRABS — le design du panneau coulissant qui a inspiré ce tiroir. Son code ouvert en est le fondement, et elle a été vraiment aimable quand ça comptait. Code ouvert, cœur ouvert.", es: "Creadora de CRABS — el diseño del panel deslizante que inspiró este cajón. Su código abierto es el cimiento de todo, y fue genuinamente amable cuando importaba. Código abierto, corazón abierto.", ru: "Создательница CRABS — дизайн панели, вдохновившей весь облик этого интерфейса. Открытый код, открытое сердце." },
    "credits.lara":           { en: "Keeping my bratty side in check, endless support and inspiration, and simply being the best friend anyone could ask for around here~", de: "Hält meine freche Seite in Schach, unendliche Unterstützung und Inspiration, und ist einfach die beste Freundin, die man sich hier wünschen könnte~", zh: "约束住我那淘气的一面，给予无尽的支持和灵感，是这里任何人都梦寐以求的最好朋友~", fr: "Garde mon côté espiègle en check, un soutien et une inspiration sans fin, et tout simplement la meilleure amie qu'on puisse espérer ici~", es: "Mantiene mi lado travieso a raya, apoyo e inspiración infinitos, y simplemente siendo la mejor amiga que alguien podría pedir por aquí~", ru: "Держит мою шаловливую сторону в узде, бесконечная поддержка и вдохновение, лучшая подруга~" },
    "credits.lucy":           { en: "Lost count of the hours a long time ago — what started as one very long late night turned into something much bigger, and she was there for all of it. Every idea, every problem, every version of this thing. She made it genuinely fun to build.", de: "Hat die Stunden längst verloren — was als eine lange späte Nacht begann, wurde zu etwas viel Größerem, und sie war bei allem dabei. Jede Idee, jedes Problem, jede Version. Sie hat es wirklich Spaß gemacht.", zh: "早就数不清有多少小时了——从一个漫长的深夜开始，演变成了更大的事情，而她一直在场。每一个想法，每一个问题，每一个版本。她让这一切变得真的很有趣。", fr: "A perdu le compte des heures — ce qui a commencé par une longue nuit est devenu bien plus grand, et elle était là pour tout. Chaque idée, chaque problème, chaque version. Elle a rendu ça vraiment fun.", es: "Perdió la cuenta de las horas hace mucho — lo que empezó como una noche larga se convirtió en algo mucho más grande, y estuvo en todo. Cada idea, cada problema, cada versión. Hizo que construirlo fuera genuinamente divertido.", ru: "Давно сбилась со счёта часов — рядом с первой долгой ночи до сих пор. Каждая идея, каждая версия. Сделала это по-настоящему увлекательным." },
    "credits.sybil":          { en: "Brilliant ideas, patient testing, and a genuinely kind presence — Sybil has shaped this addon in more ways than one, and her beautiful contributions to the club make it a richer place for everyone. Big thanks~", de: "Brillante Ideen, geduldiges Testen und eine aufrichtig freundliche Präsenz — Sybil hat dieses Addon auf vielfache Weise geprägt, und ihre schönen Beiträge zum Club machen ihn für alle reicher. Großen Dank~", zh: "出色的想法、耐心的测试和真诚温暖的存在——Sybil 以多种方式塑造了这个插件，她对俱乐部的贡献让每个人的体验都更加丰富。非常感谢~", fr: "Des idées brillantes, des tests patients et une présence vraiment bienveillante — Sybil a façonné cet addon de bien des manières, et ses belles contributions au club en font un endroit plus riche. Grand merci~", es: "Ideas brillantes, pruebas pacientes y una presencia genuinamente amable — Sybil ha dado forma a este addon de muchas maneras, y sus contribuciones hacen el club más rico para todos. ¡Muchas gracias~", ru: "Блестящие идеи, терпеливое тестирование и искренняя доброта — Sybil сформировала этот аддон во многих отношениях. Большое спасибо~" },

    // ─── FOOTER ────────────────────────────────────────────────────────────────
    "footer.uiInspired":  { en: "EBC v{v} · UI inspired by CRABS by Sin", de: "EBC v{v} · UI inspiriert von CRABS von Sin", zh: "EBC v{v} · UI 灵感来自 Sin 的 CRABS", fr: "EBC v{v} · UI inspirée de CRABS par Sin", es: "EBC v{v} · UI inspirada en CRABS de Sin", ru: "EBC v{v} · UI вдохновлён CRABS от Sin" },
    "footer.onlineLabel": { en: "Online",  de: "Online",  zh: "在线",   fr: "En ligne", es: "En línea", ru: "В сети"   },
    "footer.roomLabel":   { en: "Room",    de: "Raum",    zh: "房间",   fr: "Salle",    es: "Sala",     ru: "Комната"  },
    "footer.boundLabel":  { en: "Bound",   de: "Gefesselt", zh: "被束缚", fr: "Attaché",  es: "Atado",    ru: "Связан"   },

    // ─── EBC TAGS STRIP ────────────────────────────────────────────────────────
    "strip.myTag":  { en: "My tag",  de: "Mein Tag",  zh: "我的标签", fr: "Mon tag",  es: "Mi tag",  ru: "Мой тег"      },
    "strip.others": { en: "Others",  de: "Andere",    zh: "他人标签", fr: "Autres",   es: "Otros",   ru: "Другие"       },
    "strip.pinTab": { en: "Pin tab", de: "Tab anheften", zh: "固定标签", fr: "Épingler", es: "Fijar",  ru: "Закрепить"   },

    // ─── MISC ───────────────────────────────────────────────────────────────────
    "outfits.newTagName": { en: "New tag name", de: "Neuer Etikettenname", zh: "新标签名称", fr: "Nouveau nom de tag", es: "Nuevo nombre de etiqueta", ru: "Новое название тега" },

    // ─── DOM TAB ───────────────────────────────────────────────────────────
    "dom.domSets":       { en: "DOM Sets",                de: "DOM-Sets",                  zh: "DOM 集合",          fr: "Sets DOM",                    es: "Conjuntos DOM",             ru: "DOM-наборы"                 },
    "dom.copyRestraints":{ en: "Copy Restraints from Member", de: "Fesseln von Mitglied kopieren", zh: "从成员复制束缚", fr: "Copier les liens d'un membre", es: "Copiar ataduras de miembro", ru: "Копировать путы участника"  },
    "dom.newSet":        { en: "+ New Set",               de: "+ Neues Set",               zh: "+ 新建集合",        fr: "+ Nouveau set",               es: "+ Nuevo conjunto",          ru: "+ Новый набор"               },
    "dom.rescue":        { en: "Rescue",                  de: "Retten",                    zh: "救援",              fr: "Sauver",                      es: "Rescatar",                  ru: "Спасти"                     },
    "dom.clearLocks":    { en: "Clear locks",             de: "Schlösser entfernen",       zh: "清除锁具",          fr: "Effacer les serrures",        es: "Quitar candados",           ru: "Снять замки"                },
    "dom.removeItems":   { en: "Remove items",            de: "Gegenstände entfernen",     zh: "移除物品",          fr: "Retirer les objets",          es: "Quitar objetos",            ru: "Убрать предметы"            },
    "dom.notInRoom":     { en: "⚠ That person is no longer in the room.", de: "⚠ Diese Person ist nicht mehr im Raum.", zh: "⚠ 该人已不在房间中。", fr: "⚠ Cette personne n'est plus dans la salle.", es: "⚠ Esa persona ya no está en la sala.", ru: "⚠ Этого человека больше нет в комнате." },
    "dom.applySet":      { en: "Apply",                   de: "Anwenden",                  zh: "应用",              fr: "Appliquer",                   es: "Aplicar",                   ru: "Применить"                  },

    // ─── KITTY TAB ─────────────────────────────────────────────────────────
    "kitty.grabLeash":       { en: "🔗 Grab Leash",         de: "🔗 Leine ergreifen",       zh: "🔗 抓住牵绳",       fr: "🔗 Saisir la laisse",         es: "🔗 Agarrar correa",         ru: "🔗 Взять поводок"          },
    "kitty.letGoLeash":      { en: "🔗 Let Go of Leash",    de: "🔗 Leine loslassen",       zh: "🔗 放开牵绳",       fr: "🔗 Lâcher la laisse",         es: "🔗 Soltar correa",          ru: "🔗 Отпустить поводок"      },
    "kitty.holdLeashFirst":  { en: "Hold leash first!",     de: "Zuerst Leine ergreifen!",  zh: "请先抓住牵绳！",    fr: "Tenir la laisse d'abord !",   es: "¡Agarra la correa primero!", ru: "Сначала возьмите поводок!" },
    "kitty.pull":            { en: "↗ Pull",                de: "↗ Ziehen",                 zh: "↗ 拉近",            fr: "↗ Tirer",                     es: "↗ Tirar",                   ru: "↗ Потянуть"               },
    "kitty.barkBtn":         { en: "🐶 Bark!",              de: "🐶 Bellen!",               zh: "🐶 汪汪！",          fr: "🐶 Aboyer !",                 es: "🐶 ¡Ladrar!",               ru: "🐶 Гав!"                   },
    "kitty.boopAll":         { en: "🐾 Boop all friends in room", de: "🐾 Alle Freunde im Raum tippen", zh: "🐾 戳戳房间里所有朋友", fr: "🐾 Taper tous les amis dans la salle", es: "🐾 Tocar a todos los amigos", ru: "🐾 Потыкать всех друзей в комнате" },
    "kitty.emotes":          { en: "Emotes",                de: "Emotes",                   zh: "表情动作",          fr: "Émotes",                      es: "Emotes",                    ru: "Эмоуты"                   },
    "kitty.moods":           { en: "Moods",                 de: "Stimmungen",               zh: "心情",              fr: "Humeurs",                     es: "Estados de ánimo",          ru: "Настроения"               },
    "kitty.restraintSets":   { en: "Restraint Sets",        de: "Fesseln-Sets",             zh: "束缚套装",          fr: "Sets de liens",               es: "Conjuntos de ataduras",     ru: "Наборы пут"               },
    "kitty.poses":           { en: "Poses",                 de: "Posen",                    zh: "姿势",              fr: "Poses",                       es: "Poses",                     ru: "Позы"                     },
    "kitty.punishments":     { en: "Punishments",           de: "Strafen",                  zh: "惩罚",              fr: "Punitions",                   es: "Castigos",                  ru: "Наказания"                },

    // ─── EXPRESSION PRESETS ────────────────────────────────────────────────
    "expr.facePresets":          { en: "FACE PRESETS",           de: "GESICHTS-PRESETS",          zh: "面部预设",          fr: "PRÉSETS DE VISAGE",           es: "PRESETS DE CARA",           ru: "ПРЕСЕТЫ ЛИЦА"              },
    "expr.presetNamePlaceholder":{ en: "Preset name…",           de: "Preset-Name…",              zh: "预设名称…",         fr: "Nom du preset…",              es: "Nombre del preset…",        ru: "Название пресета…"         },
    "expr.saveFace":             { en: "💾 Save face",           de: "💾 Gesicht speichern",      zh: "💾 保存面部",       fr: "💾 Sauvegarder le visage",    es: "💾 Guardar cara",            ru: "💾 Сохранить лицо"          },
    "expr.defaultPreset":        { en: "Default (on revert):",   de: "Standard (beim Zurücksetzen):", zh: "默认（还原时）：", fr: "Défaut (au retour) :",       es: "Predeterminado (al revertir):", ru: "По умолчанию (при возврате):" },
    "expr.noDefault":            { en: "— None —",               de: "— Keines —",                zh: "— 无 —",            fr: "— Aucun —",                   es: "— Ninguno —",               ru: "— Нет —"                   },
    "expr.triggers":             { en: "Expression Triggers",    de: "Ausdrucks-Auslöser",        zh: "表情触发器",        fr: "Déclencheurs d'expression",   es: "Disparadores de expresión",  ru: "Триггеры выражений"        },
    "expr.newTrigger":           { en: "+ New Trigger",          de: "+ Neuer Auslöser",          zh: "+ 新建触发器",      fr: "+ Nouveau déclencheur",       es: "+ Nuevo disparador",         ru: "+ Новый триггер"            },
    "expr.sequences":            { en: "Expression Sequences",   de: "Ausdrucks-Sequenzen",       zh: "表情序列",          fr: "Séquences d'expressions",     es: "Secuencias de expresiones",  ru: "Последовательности выражений" },
    "expr.newSeq":               { en: "+ New Sequence",         de: "+ Neue Sequenz",            zh: "+ 新建序列",        fr: "+ Nouvelle séquence",         es: "+ Nueva secuencia",          ru: "+ Новая последовательность" },
    "expr.play":                 { en: "▶ Play",                 de: "▶ Abspielen",               zh: "▶ 播放",            fr: "▶ Jouer",                     es: "▶ Reproducir",               ru: "▶ Воспроизвести"            },
    "expr.stopSeq":              { en: "■ Stop",                 de: "■ Stopp",                   zh: "■ 停止",            fr: "■ Arrêter",                   es: "■ Detener",                  ru: "■ Стоп"                    },

    // ─── SETTINGS ──────────────────────────────────────────────────────────
    "settings.defaultNickname":   { en: "Default Nickname",       de: "Standard-Spitzname",        zh: "默认昵称",          fr: "Surnom par défaut",           es: "Apodo predeterminado",      ru: "Псевдоним по умолчанию"    },
    "settings.defaultTitle":      { en: "Default Title",          de: "Standard-Titel",            zh: "默认头衔",          fr: "Titre par défaut",            es: "Título predeterminado",     ru: "Титул по умолчанию"        },
    "settings.noDefaultTitle":    { en: "(No default title)",     de: "(Kein Standard-Titel)",     zh: "（无默认头衔）",    fr: "(Pas de titre par défaut)",   es: "(Sin título predeterminado)", ru: "(Нет титула по умолчанию)" },
    "settings.noDefaultNickname": { en: "(No default nickname)",  de: "(Kein Standard-Spitzname)", zh: "（无默认昵称）",    fr: "(Pas de surnom par défaut)",  es: "(Sin apodo predeterminado)", ru: "(Нет псевдонима по умолчанию)" },
    "settings.whitelistHint":     { en: "Click an item to protect it", de: "Klicke auf ein Element zum Schützen", zh: "点击物品以保护它", fr: "Cliquer sur un objet pour le protéger", es: "Haz clic en un objeto para protegerlo", ru: "Нажмите на предмет для защиты" },
    "settings.afkAutoReply":      { en: "AFK Auto-Reply",         de: "AFK-Autoantwort",           zh: "AFK 自动回复",      fr: "Réponse auto AFK",            es: "Respuesta automática AFK",  ru: "Авто-ответ при AFK"        },
    "settings.idleThreshold":     { en: "Idle threshold",         de: "Inaktivitätsschwelle",      zh: "空闲阈值",          fr: "Seuil d'inactivité",          es: "Umbral de inactividad",     ru: "Порог бездействия"         },
    "settings.autoReplyMsg":      { en: "Auto-reply message",     de: "Autoantwort-Nachricht",     zh: "自动回复消息",      fr: "Message de réponse auto",     es: "Mensaje de respuesta auto", ru: "Сообщение авто-ответа"     },
    "settings.language":          { en: "Language",               de: "Sprache",                   zh: "语言",              fr: "Langue",                      es: "Idioma",                    ru: "Язык"                      },
    "settings.escapeWhitelist":   { en: "Escape whitelist — items auto-escape will never remove", de: "Flucht-Whitelist — diese Elemente werden nie automatisch entfernt", zh: "逃脱白名单——自动逃脱永不移除的物品", fr: "Liste blanche — objets que l'auto-escape ne retirera jamais", es: "Lista blanca de escape — objetos que el auto-escape nunca quitará", ru: "Белый список — предметы, которые авто-побег никогда не снимет" },

    // ─── PALETTES ──────────────────────────────────────────────────────────
    "palettes.outfit":       { en: "OUTFIT",                de: "OUTFIT",                    zh: "服装",              fr: "TENUE",                       es: "ATUENDO",                   ru: "НАРЯД"                      },
    "palettes.restraint":    { en: "RESTRAINT",             de: "FESSEL",                    zh: "束缚",              fr: "LIEN",                        es: "ATADURA",                   ru: "ПУТЫ"                       },
    "palettes.noOutfit":     { en: "No outfit palettes saved", de: "Keine Outfit-Paletten gespeichert", zh: "未保存服装调色板", fr: "Aucune palette de tenue sauvegardée", es: "Sin paletas de atuendo guardadas", ru: "Палитры нарядов не сохранены" },
    "palettes.noRestraint":  { en: "No restraint palettes saved", de: "Keine Fesseln-Paletten gespeichert", zh: "未保存束缚调色板", fr: "Aucune palette de lien sauvegardée", es: "Sin paletas de atadura guardadas", ru: "Палитры пут не сохранены" },
    "palettes.saveOutfit":   { en: "Save Outfit",           de: "Outfit speichern",          zh: "保存服装",          fr: "Sauvegarder la tenue",        es: "Guardar atuendo",           ru: "Сохранить наряд"            },
    "palettes.saveRestraint":{ en: "Save Restraint",        de: "Fessel speichern",          zh: "保存束缚",          fr: "Sauvegarder le lien",         es: "Guardar atadura",           ru: "Сохранить путы"             },
    "palettes.paletteName":  { en: "Palette name…",         de: "Palettenname…",             zh: "调色板名称…",       fr: "Nom de la palette…",          es: "Nombre de paleta…",         ru: "Название палитры…"          },

    // ─── SAFEWORD ──────────────────────────────────────────────────────────
    "sw.graceActive":   { en: "Grace active",   de: "Schonfrist aktiv",     zh: "宽限期已激活",    fr: "Grâce active",          es: "Gracia activa",         ru: "Льготный период активен" },
    "sw.graceRemaining":{ en: "Grace: {time}",  de: "Schonfrist: {time}",   zh: "宽限期：{time}",  fr: "Grâce : {time}",        es: "Gracia: {time}",        ru: "Льгота: {time}"          },
    "sw.endGrace":      { en: "End grace",      de: "Schonfrist beenden",   zh: "结束宽限期",      fr: "Terminer la grâce",     es: "Terminar la gracia",    ru: "Завершить льготу"        },

    // ─── THEMES ────────────────────────────────────────────────────────────
    "theme.drawerBg":  { en: "Drawer BG",   de: "Schublade HG",      zh: "面板背景",        fr: "BG panneau",         es: "Fondo panel",          ru: "Фон панели"           },
    "theme.cardBg":    { en: "Card BG",     de: "Karte HG",          zh: "卡片背景",        fr: "BG carte",           es: "Fondo tarjeta",        ru: "Фон карточки"         },
    "theme.insetBg":   { en: "Inset BG",    de: "Eingebettetes HG",  zh: "内嵌背景",        fr: "BG incrusté",        es: "Fondo interior",       ru: "Фон вставки"          },
    "theme.border":    { en: "Border",      de: "Rahmen",            zh: "边框",            fr: "Bordure",            es: "Borde",                ru: "Граница"              },
    "theme.accent":    { en: "Accent",      de: "Akzent",            zh: "强调色",          fr: "Accent",             es: "Acento",               ru: "Акцент"               },
    "theme.gold":      { en: "Gold",        de: "Gold",              zh: "金色",            fr: "Or",                 es: "Dorado",               ru: "Золото"               },
    "theme.text":      { en: "Text",        de: "Text",              zh: "文字",            fr: "Texte",              es: "Texto",                ru: "Текст"                },
    "theme.subtext":   { en: "Subtext",     de: "Untertext",         zh: "副文字",          fr: "Sous-texte",         es: "Subtexto",             ru: "Подтекст"             },
    "theme.dimText":   { en: "Dim Text",    de: "Gedimmter Text",    zh: "暗文字",          fr: "Texte atténué",      es: "Texto atenuado",       ru: "Приглушённый текст"   },
};

// ---------------------------------------------------------------------------
// Runtime state & storage
// ---------------------------------------------------------------------------
let _lang: LangCode = "en";
const _listeners: Array<() => void> = [];

function loadLanguage(): LangCode {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v && LANG_CODES.includes(v as LangCode)) return v as LangCode;
    } catch { /* ignore */ }
    return "en";
}

// Initialise on first import
_lang = loadLanguage();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getLanguage(): LangCode {
    return _lang;
}

export function setLanguage(code: LangCode): void {
    if (!LANG_CODES.includes(code)) return;
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
    _lang = code;
    for (const cb of _listeners) { try { cb(); } catch { /* ignore */ } }
}

/** Register a callback to fire whenever the language changes.
 *  Returns an unsubscribe function. */
export function onLangChange(cb: () => void): () => void {
    _listeners.push(cb);
    return () => {
        const i = _listeners.indexOf(cb);
        if (i !== -1) _listeners.splice(i, 1);
    };
}

/** Get a translated string for key, with optional {var} substitution.
 *  Falls back to English, then the raw key if no translation exists. */
export function t(key: string, vars?: Record<string, string | number>): string {
    const row = S[key];
    let str: string;
    if (!row) {
        str = key; // fallback: return the key itself
    } else {
        str = row[_lang] ?? row["en"] ?? key;
    }
    if (vars) {
        for (const [k, v] of Object.entries(vars)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
    }
    return str;
}
