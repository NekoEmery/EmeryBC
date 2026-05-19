// i18n.ts — Internationalisation for EmeryBC.
// Language preference is stored in localStorage (fast, device-local, no server sync needed).

export type LangCode = "en" | "de" | "zh" | "fr" | "es";

export const LANG_CODES: LangCode[] = ["en", "de", "zh", "fr", "es"];
export const LANG_LABELS: Record<LangCode, string> = {
    en: "EN", de: "DE", zh: "中文", fr: "FR", es: "ES",
};
export const LANG_NAMES: Record<LangCode, string> = {
    en: "English", de: "Deutsch", zh: "中文", fr: "Français", es: "Español",
};

const STORAGE_KEY = "EBC_lang";
type T = Record<LangCode, string>;

// ---------------------------------------------------------------------------
// Translation table
// ---------------------------------------------------------------------------
const S: Record<string, T> = {

    // ─── CORE ACTIONS ──────────────────────────────────────────────────────
    "core.on":          { en: "ON",          de: "AN",               zh: "开",          fr: "OUI",              es: "SÍ"           },
    "core.off":         { en: "OFF",         de: "AUS",              zh: "关",          fr: "NON",              es: "NO"           },
    "core.save":        { en: "✓ Save",      de: "✓ Speichern",      zh: "✓ 保存",      fr: "✓ Sauvegarder",    es: "✓ Guardar"    },
    "core.cancel":      { en: "- Cancel",    de: "- Abbrechen",      zh: "- 取消",      fr: "- Annuler",        es: "- Cancelar"   },
    "core.delete":      { en: "×",           de: "×",                zh: "×",           fr: "×",                es: "×"            },
    "core.edit":        { en: "✎ Edit",      de: "✎ Bearbeiten",     zh: "✎ 编辑",      fr: "✎ Modifier",       es: "✎ Editar"     },
    "core.apply":       { en: "Apply",       de: "Anwenden",         zh: "应用",        fr: "Appliquer",        es: "Aplicar"      },
    "core.create":      { en: "✓ Create",    de: "✓ Erstellen",      zh: "✓ 创建",      fr: "✓ Créer",          es: "✓ Crear"      },
    "core.export":      { en: "↑ Export",    de: "↑ Exportieren",    zh: "↑ 导出",      fr: "↑ Exporter",       es: "↑ Exportar"   },
    "core.import":      { en: "↓ Import",    de: "↓ Importieren",    zh: "↓ 导入",      fr: "↓ Importer",       es: "↓ Importar"   },
    "core.confirm":     { en: "✓ Confirm",   de: "✓ Bestätigen",     zh: "✓ 确认",      fr: "✓ Confirmer",      es: "✓ Confirmar"  },
    "core.yes":         { en: "Yes",         de: "Ja",               zh: "是",          fr: "Oui",              es: "Sí"           },
    "core.no":          { en: "No",          de: "Nein",             zh: "否",          fr: "Non",              es: "No"           },
    "core.done":        { en: "✓ Done",      de: "✓ Fertig",         zh: "✓ 完成",      fr: "✓ Terminé",        es: "✓ Listo"      },
    "core.add":         { en: "+ Add",       de: "+ Hinzufügen",     zh: "+ 添加",      fr: "+ Ajouter",        es: "+ Añadir"     },
    "core.clearAll":    { en: "Clear All",   de: "Alle löschen",     zh: "全部清除",    fr: "Tout effacer",     es: "Borrar todo"  },
    "core.rename":      { en: "Rename",      de: "Umbenennen",       zh: "重命名",      fr: "Renommer",         es: "Renombrar"    },
    "core.moveUp":      { en: "▲",           de: "▲",                zh: "▲",           fr: "▲",                es: "▲"            },
    "core.moveDown":    { en: "▼",           de: "▼",                zh: "▼",           fr: "▼",                es: "▼"            },
    "core.enable":      { en: "Enable",      de: "Aktivieren",       zh: "启用",        fr: "Activer",          es: "Activar"      },
    "core.disable":     { en: "Disable",     de: "Deaktivieren",     zh: "禁用",        fr: "Désactiver",       es: "Desactivar"   },
    "core.update":      { en: "Update",      de: "Aktualisieren",    zh: "更新",        fr: "Mettre à jour",    es: "Actualizar"   },
    "core.close":       { en: "Close",       de: "Schließen",        zh: "关闭",        fr: "Fermer",           es: "Cerrar"       },
    "core.refresh":     { en: "Refresh",     de: "Aktualisieren",    zh: "刷新",        fr: "Actualiser",       es: "Actualizar"   },
    "core.copied":      { en: "✔ Copied!",   de: "✔ Kopiert!",       zh: "✔ 已复制！",  fr: "✔ Copié !",        es: "✔ ¡Copiado!"  },
    "core.saved":       { en: "✓ Saved",     de: "✓ Gespeichert",    zh: "✓ 已保存",    fr: "✓ Sauvegardé",     es: "✓ Guardado"   },
    "core.applied":     { en: "✓ Applied!",  de: "✓ Angewendet!",    zh: "✓ 已应用！",  fr: "✓ Appliqué !",     es: "✓ ¡Aplicado!" },
    "core.none":        { en: "(none)",      de: "(keine)",          zh: "（无）",       fr: "(aucun)",          es: "(ninguno)"    },
    "core.wear":        { en: "Wear",        de: "Tragen",           zh: "穿戴",        fr: "Porter",           es: "Usar"         },
    "core.moveUpTitle": { en: "Move up",     de: "Nach oben",        zh: "上移",        fr: "Déplacer vers le haut", es: "Mover arriba" },
    "core.moveDownTitle":{ en: "Move down",  de: "Nach unten",       zh: "下移",        fr: "Déplacer vers le bas", es: "Mover abajo" },

    // ─── HEADER ────────────────────────────────────────────────────────────
    "header.dragToMove":   { en: "Drag to move",   de: "Ziehen zum Verschieben",      zh: "拖动以移动",     fr: "Glisser pour déplacer",       es: "Arrastrar para mover"    },
    "header.resetPos":     { en: "⌖ Reset pos",    de: "⌖ Pos. zurücksetzen",         zh: "⌖ 重置位置",     fr: "⌖ Réinitialiser pos",          es: "⌖ Restablecer pos"       },
    "header.resetPosTitle":{ en: "Reset drawer to default position (anchored to chat log)", de: "Fenster auf Standardposition zurücksetzen", zh: "将抽屉重置为默认位置（锚定至聊天框）", fr: "Réinitialiser à la position par défaut", es: "Restablecer posición predeterminada" },
    "header.close":        { en: "Close",           de: "Schließen",                   zh: "关闭",           fr: "Fermer",                       es: "Cerrar"                  },
    "header.refresh":      { en: "Refresh",         de: "Aktualisieren",               zh: "刷新",           fr: "Actualiser",                   es: "Actualizar"              },
    "header.language":     { en: "Language",        de: "Sprache",                     zh: "语言",           fr: "Langue",                       es: "Idioma"                  },

    // ─── TABS ──────────────────────────────────────────────────────────────
    "tabs.outfits":      { en: "OUTFITS",     de: "OUTFITS",          zh: "服装",        fr: "TENUES",           es: "ATUENDOS"     },
    "tabs.buttons":      { en: "BUTTONS",     de: "TASTEN",           zh: "按键",        fr: "BOUTONS",          es: "BOTONES"      },
    "tabs.anims":        { en: "ANIMS",       de: "ANIMS",            zh: "动作",        fr: "ANIMS",            es: "ANIMS"        },
    "tabs.users":        { en: "USERS",       de: "NUTZER",           zh: "用户",        fr: "UTILISATEURS",     es: "USUARIOS"     },
    "tabs.credits":      { en: "CREDITS",     de: "CREDITS",          zh: "致谢",        fr: "CRÉDITS",          es: "CRÉDITOS"     },
    "tabs.dev":          { en: "DEV",         de: "DEV",              zh: "开发",        fr: "DEV",              es: "DEV"          },
    "tabs.dom":          { en: "DOM",         de: "DOM",              zh: "DOM",         fr: "DOM",              es: "DOM"          },
    "tabs.buttonsTitle": { en: "Action Buttons",  de: "Aktions-Tasten",   zh: "动作按键",   fr: "Boutons d'action",  es: "Botones de acción" },
    "tabs.usersTitle":   { en: "User Notes",      de: "Benutzernotizen",  zh: "用户笔记",   fr: "Notes utilisateur",  es: "Notas de usuario"  },
    "tabs.creditsTitle": { en: "Special Thanks",  de: "Besonderer Dank",  zh: "特别感谢",   fr: "Remerciements",      es: "Agradecimientos"   },
    "tabs.devTitle":     { en: "Developer Tools", de: "Entwickler-Tools", zh: "开发工具",   fr: "Outils développeur", es: "Herramientas dev"  },
    "tabs.domTitle":     { en: "DOM Tools",       de: "DOM-Tools",        zh: "DOM 工具",   fr: "Outils DOM",         es: "Herramientas DOM"  },
    "tabs.puppy":        { en: "Puppy",           de: "Welpe",            zh: "小狗",       fr: "Chiot",              es: "Cachorro"          },
    "tabs.kitty":        { en: "Kitty",           de: "Kätzchen",         zh: "小猫",       fr: "Chaton",             es: "Gatita"            },

    // ─── QUICK ACTIONS ─────────────────────────────────────────────────────
    "qa.releaseRestraints":  { en: "Release Restraints", de: "Fesseln lösen",       zh: "解除束缚",   fr: "Libérer les liens",       es: "Soltar ataduras"     },
    "qa.removeLocks":        { en: "Remove Locks",       de: "Schlösser entfernen", zh: "移除锁具",   fr: "Retirer les serrures",    es: "Quitar candados"     },
    "qa.releaseTitle":       { en: "Remove all restraints (skips owner/lover/family locks)", de: "Alle Fesseln entfernen (überspringt Besitzer-/Partner-/Familienschlösser)", zh: "移除所有束缚（跳过主人/恋人/家人的锁）", fr: "Retirer tous les liens (ignore serrures propriétaire/amant/famille)", es: "Quitar todas las ataduras (omite candados de dueño/amante/familia)" },
    "qa.removeLocksTitle":   { en: "Remove all locks (skips owner/lover/family locks)",    de: "Alle Schlösser entfernen (überspringt Besitzer-/Partner-/Familienschlösser)", zh: "移除所有锁具（跳过主人/恋人/家人的锁）", fr: "Retirer toutes les serrures (ignore serrures propriétaire/amant/famille)", es: "Quitar todos los candados (omite candados de dueño/amante/familia)" },
    "qa.confirmBeforeEscaping": { en: "Confirm before escaping",  de: "Vor dem Entkommen bestätigen",  zh: "逃脱前确认",   fr: "Confirmer avant de s'échapper", es: "Confirmar antes de escapar" },
    "qa.pickRestraints":     { en: "↓ Pick restraints to remove", de: "↓ Fesseln zum Entfernen wählen", zh: "↓ 选择要移除的束缚", fr: "↓ Choisir les liens à retirer", es: "↓ Elegir ataduras a quitar" },
    "qa.pickTitle":          { en: "Choose specific restraints to strip from yourself", de: "Bestimmte Fesseln zum Entfernen auswählen", zh: "选择要解除的特定束缚", fr: "Choisir des liens spécifiques à retirer", es: "Elegir ataduras específicas a quitar" },
    "qa.restraintsHeader":   { en: "RESTRAINTS",  de: "FESSELN",     zh: "束缚",   fr: "LIENS",      es: "ATADURAS" },
    "qa.locksHeader":        { en: "LOCKS",        de: "SCHLÖSSER",   zh: "锁具",   fr: "SERRURES",   es: "CANDADOS" },
    "qa.nothingToRemove":    { en: "Nothing to remove — no restraints or locks found.", de: "Nichts zu entfernen — keine Fesseln oder Schlösser gefunden.", zh: "无需移除——未找到束缚或锁具。", fr: "Rien à retirer — aucun lien ou serrure trouvé.", es: "Nada que quitar — no se encontraron ataduras ni candados." },
    "qa.removeSelected":     { en: "↑ Remove Selected",   de: "↑ Ausgewählte entfernen",   zh: "↑ 移除所选",    fr: "↑ Retirer la sélection",      es: "↑ Quitar seleccionados"  },
    "qa.unlockSelected":     { en: "🔓 Unlock Selected",  de: "🔓 Ausgewählte entsperren", zh: "🔓 解锁所选",   fr: "🔓 Déverrouiller la sélection", es: "🔓 Desbloquear seleccionados" },
    "qa.selectRestraintsFirst": { en: "Select restraints first.", de: "Zuerst Fesseln auswählen.",   zh: "请先选择束缚。",  fr: "Sélectionner des liens d'abord.", es: "Selecciona ataduras primero."  },
    "qa.selectLocksFirst":   { en: "Select locks first.",    de: "Zuerst Schlösser auswählen.", zh: "请先选择锁具。",  fr: "Sélectionner des serrures d'abord.", es: "Selecciona candados primero." },
    "qa.nothingRemoved":     { en: "Nothing removed.",    de: "Nichts entfernt.",     zh: "未移除任何物品。",   fr: "Rien retiré.",      es: "Nada quitado."      },
    "qa.nothingUnlocked":    { en: "Nothing unlocked.",   de: "Nichts entsperrt.",    zh: "未解锁任何物品。",   fr: "Rien déverrouillé.", es: "Nada desbloqueado." },
    "qa.removedN":           { en: "✓ Removed {n} item(s).",   de: "✓ {n} Element(e) entfernt.",    zh: "✓ 已移除 {n} 件物品。",  fr: "✓ {n} élément(s) retiré(s).",       es: "✓ {n} elemento(s) quitado(s)."     },
    "qa.unlockedN":          { en: "✓ Unlocked {n} item(s).",  de: "✓ {n} Element(e) entsperrt.",   zh: "✓ 已解锁 {n} 件物品。",  fr: "✓ {n} élément(s) déverrouillé(s).", es: "✓ {n} elemento(s) desbloqueado(s)." },

    // ─── SLOW LEAVE ────────────────────────────────────────────────────────
    "sl.header":     { en: "🚶 Slow Leave",     de: "🚶 Langsam gehen",         zh: "🚶 慢慢离开",    fr: "🚶 Partir lentement",           es: "🚶 Salida lenta"     },
    "sl.durationTitle": { en: "Slow leave duration", de: "Dauer des langsamen Gehens", zh: "慢离开持续时间", fr: "Durée de la sortie lente",    es: "Duración de salida lenta" },
    "sl.leave":      { en: "🚶 Slow Leave",     de: "🚶 Langsam gehen",         zh: "🚶 慢慢离开",    fr: "🚶 Partir lentement",           es: "🚶 Salida lenta"     },
    "sl.leaveTitle": { en: "Wave goodbye and slowly head for the door", de: "Auf Wiedersehen winken und langsam zur Tür gehen", zh: "挥手告别，慢慢走向门口", fr: "Dire au revoir et se diriger lentement vers la porte", es: "Despedirse y caminar lentamente hacia la puerta" },
    "sl.cancel":     { en: "✕ Cancel Leave",    de: "✕ Abbrechen",              zh: "✕ 取消离开",    fr: "✕ Annuler la sortie",           es: "✕ Cancelar salida"   },
    "sl.seqHint":    { en: "Sequence for this preset — edit to customise. Steps separated by |, duration placeholder @{DUR}", de: "Sequenz für dieses Preset — bearbeiten zum Anpassen. Schritte durch | getrennt, Dauer @{DUR}", zh: "此预设的序列——编辑以自定义。步骤以 | 分隔，时长占位符 @{DUR}", fr: "Séquence pour ce preset — modifier pour personnaliser. Étapes séparées par |, durée @{DUR}", es: "Secuencia para este preset — editar para personalizar. Pasos con |, marcador @{DUR}" },

    // ─── OUTFITS TAB ───────────────────────────────────────────────────────
    "outfits.savedOutfits":      { en: "Saved Outfits",               de: "Gespeicherte Outfits",          zh: "已保存的服装",      fr: "Tenues sauvegardées",           es: "Atuendos guardados"           },
    "outfits.outfitSchedule":    { en: "OUTFIT SCHEDULE",             de: "OUTFIT-ZEITPLAN",               zh: "服装计划",          fr: "PROGRAMME TENUES",              es: "PROGRAMA DE ATUENDOS"         },
    "outfits.savedRestraints":   { en: "Saved Restraints",            de: "Gespeicherte Fesseln",          zh: "已保存的束缚",      fr: "Liens sauvegardés",             es: "Ataduras guardadas"           },
    "outfits.filter":            { en: "Filter outfits…",             de: "Outfits filtern…",              zh: "过滤服装…",         fr: "Filtrer les tenues…",           es: "Filtrar atuendos…"            },
    "outfits.noOutfits":         { en: "No outfits saved yet.",       de: "Noch keine Outfits gespeichert.", zh: "尚未保存任何服装。", fr: "Aucune tenue sauvegardée.",     es: "No hay atuendos guardados."   },
    "outfits.noMatch":           { en: "No outfits match your filter.", de: "Keine Outfits entsprechen dem Filter.", zh: "没有匹配的服装。", fr: "Aucune tenue ne correspond.",  es: "No hay atuendos que coincidan." },
    "outfits.useFormBelow":      { en: "Use the form below to create one.", de: "Erstelle eines mit dem Formular unten.", zh: "使用下方表单创建一个。", fr: "Utiliser le formulaire ci-dessous pour en créer une.", es: "Usa el formulario de abajo para crear uno." },
    "outfits.namePlaceholder":   { en: "Outfit name (e.g. Rope Set)", de: "Outfit-Name (z. B. Seil-Set)",  zh: "服装名称（如绳索套装）", fr: "Nom de la tenue (ex: Ensemble cordes)", es: "Nombre del atuendo (ej. Juego de cuerdas)" },
    "outfits.cmdPlaceholder":    { en: "Outfit command (e.g. /rope)", de: "Outfit-Befehl (z. B. /seil)",   zh: "服装命令（如 /rope）", fr: "Commande tenue (ex: /cordes)",  es: "Comando atuendo (ej. /cuerda)" },
    "outfits.preserveBonds":     { en: "Preserve bonds",              de: "Fesseln beibehalten",           zh: "保留束缚",          fr: "Conserver les liens",           es: "Mantener ataduras"            },
    "outfits.swapBonds":         { en: "Swap bonds",                  de: "Fesseln tauschen",              zh: "交换束缚",          fr: "Échanger les liens",            es: "Intercambiar ataduras"        },
    "outfits.keepClothes":       { en: "Keep clothes",                de: "Kleidung behalten",             zh: "保留衣物",          fr: "Garder les vêtements",          es: "Mantener ropa"                },
    "outfits.swapClothes":       { en: "Swap clothes",                de: "Kleidung tauschen",             zh: "交换衣物",          fr: "Échanger les vêtements",        es: "Intercambiar ropa"            },
    "outfits.newOutfit":         { en: "+ New Outfit from Current Look", de: "+ Neues Outfit vom aktuellen Aussehen", zh: "+ 从当前外观创建新服装", fr: "+ Nouvelle tenue depuis la tenue actuelle", es: "+ Nuevo atuendo desde el aspecto actual" },
    "outfits.saveNewOutfit":     { en: "Save as New Outfit",          de: "Als neues Outfit speichern",    zh: "保存为新服装",      fr: "Sauvegarder comme nouvelle tenue", es: "Guardar como nuevo atuendo"  },
    "outfits.importOutfit":      { en: "↓ Import Outfit",             de: "↓ Outfit importieren",          zh: "↓ 导入服装",        fr: "↓ Importer une tenue",          es: "↓ Importar atuendo"           },
    "outfits.importPlaceholder": { en: "Paste BC outfit code…",       de: "BC-Outfit-Code einfügen…",      zh: "粘贴 BC 服装代码…", fr: "Coller le code de tenue BC…",   es: "Pegar código de atuendo BC…"  },
    "outfits.importBCPlaceholder": { en: "Paste LZ/JSON BC code…",   de: "LZ/JSON-BC-Code einfügen…",     zh: "粘贴 LZ/JSON BC 代码…", fr: "Coller le code LZ/JSON BC…", es: "Pegar código LZ/JSON BC…"    },
    "outfits.importFromBCCode":  { en: "↓ Import from BC Code",       de: "↓ Aus BC-Code importieren",     zh: "↓ 从 BC 代码导入",  fr: "↓ Importer depuis le code BC",  es: "↓ Importar desde código BC"   },
    "outfits.cancelImport":      { en: "- Cancel Import",             de: "- Import abbrechen",            zh: "- 取消导入",        fr: "- Annuler l'importation",       es: "- Cancelar importación"       },
    "outfits.invalidFormat":     { en: "Invalid format — check the pasted text.", de: "Ungültiges Format — überprüfe den eingefügten Text.", zh: "无效格式——请检查粘贴的文本。", fr: "Format invalide — vérifier le texte collé.", es: "Formato inválido — revisa el texto pegado." },
    "outfits.keepBondsFlag":     { en: "⛓ Keep bonds",               de: "⛓ Fesseln beh.",               zh: "⛓ 保留束缚",        fr: "⛓ Garder liens",               es: "⛓ Mantener ataduras"          },
    "outfits.swapBondsFlag":     { en: "⛓ Swap bonds",               de: "⛓ Fesseln tauschen",           zh: "⛓ 交换束缚",        fr: "⛓ Éch. liens",                 es: "⛓ Intercambiar ataduras"      },
    "outfits.keepClothesFlag":   { en: "👗 Keep clothes",             de: "👗 Kleidung beh.",              zh: "👗 保留衣物",        fr: "👗 Garder vêtements",           es: "👗 Mantener ropa"              },
    "outfits.swapClothesFlag":   { en: "👗 Swap clothes",             de: "👗 Kleidung tauschen",          zh: "👗 交换衣物",        fr: "👗 Éch. vêtements",             es: "👗 Intercambiar ropa"          },
    "outfits.saveChanges":       { en: "✓ Save Changes",              de: "✓ Änderungen speichern",        zh: "✓ 保存更改",        fr: "✓ Enregistrer les modifications", es: "✓ Guardar cambios"           },
    "outfits.deleteTitle":       { en: "Delete this outfit",          de: "Dieses Outfit löschen",         zh: "删除此服装",        fr: "Supprimer cette tenue",         es: "Eliminar este atuendo"        },
    "outfits.updateTitle":       { en: "Save current look to this outfit", de: "Aktuelles Aussehen in diesem Outfit speichern", zh: "将当前外观保存到此服装", fr: "Sauvegarder la tenue actuelle", es: "Guardar aspecto actual en este atuendo" },
    "outfits.noOutfitsDropdown": { en: "No outfits",                  de: "Keine Outfits",                 zh: "没有服装",          fr: "Aucune tenue",                  es: "Sin atuendos"                 },
    "outfits.nameLabel":         { en: "Name",                        de: "Name",                          zh: "名称",              fr: "Nom",                           es: "Nombre"                       },
    "outfits.commandLabel":      { en: "Command",                     de: "Befehl",                        zh: "命令",              fr: "Commande",                      es: "Comando"                      },
    "outfits.announceLabel":     { en: "Announce",                    de: "Ankündigung",                   zh: "公告",              fr: "Annonce",                       es: "Anuncio"                      },
    "outfits.announcePlaceholder": { en: "Room announce on wear (optional)", de: "Raum-Ankündigung beim Tragen (optional)", zh: "穿戴时的房间公告（可选）", fr: "Annonce salle au port (optionnel)", es: "Anuncio al ponerse (opcional)" },
    "outfits.nicknamePlaceholder": { en: "Your usual nickname",       de: "Dein üblicher Spitzname",       zh: "你的常用昵称",      fr: "Votre surnom habituel",         es: "Tu apodo habitual"            },
    "outfits.noSchedules":       { en: "No schedules set.",           de: "Keine Zeitpläne festgelegt.",   zh: "尚未设置计划。",    fr: "Aucun programme défini.",       es: "Sin programas configurados."  },
    "outfits.timePlaceholder":   { en: "HH:MM",                       de: "HH:MM",                         zh: "时:分",             fr: "HH:MM",                         es: "HH:MM"                        },
    "outfits.timeTitle":         { en: "24-hour time (e.g. 08:30, 14:00)", de: "24-Stunden-Zeit (z. B. 08:30, 14:00)", zh: "24小时制（如 08:30、14:00）", fr: "Heure sur 24h (ex: 08:30, 14:00)", es: "Hora en 24h (ej. 08:30, 14:00)" },
    "outfits.removeSchedule":    { en: "Remove schedule",             de: "Zeitplan entfernen",            zh: "移除计划",          fr: "Retirer le programme",          es: "Quitar programa"              },
    "outfits.addSchedule":       { en: "+ Add Schedule",              de: "+ Zeitplan hinzufügen",         zh: "+ 添加计划",        fr: "+ Ajouter un programme",        es: "+ Añadir programa"            },
    "outfits.protectedItems":    { en: "PROTECTED ITEMS",             de: "GESCHÜTZTE GEGENSTÄNDE",        zh: "受保护的物品",      fr: "OBJETS PROTÉGÉS",               es: "OBJETOS PROTEGIDOS"           },
    "outfits.coloursN":          { en: "COLOURS ({n} saved)",         de: "FARBEN ({n} gespeichert)",      zh: "颜色（已保存 {n}）", fr: "COULEURS ({n} sauveg.)",        es: "COLORES ({n} guardados)"      },
    "outfits.colours":           { en: "COLOURS",                     de: "FARBEN",                        zh: "颜色",              fr: "COULEURS",                      es: "COLORES"                      },
    "outfits.tagsN":             { en: "Tags ({n} saved)",            de: "Etiketten ({n} gespeichert)",   zh: "标签（已保存 {n}）", fr: "Tags ({n} sauveg.)",            es: "Etiquetas ({n} guardadas)"    },
    "outfits.noSavedColours":    { en: "No saved colours yet — use + Save above", de: "Noch keine Farben gespeichert — oben + Speichern verwenden", zh: "尚未保存颜色——请使用上方的 + 保存", fr: "Aucune couleur sauvegardée — utiliser + Sauvegarder ci-dessus", es: "Sin colores guardados — usa + Guardar arriba" },

    // ─── RESTRAINTS ────────────────────────────────────────────────────────
    "restraints.noRestraints":   { en: "No restraint sets saved yet.", de: "Noch keine Fesseln-Sets gespeichert.", zh: "尚未保存任何束缚套装。", fr: "Aucun set de liens sauvegardé.", es: "No hay conjuntos de ataduras guardados." },
    "restraints.newRestraint":   { en: "+ New Restraint Set from Current", de: "+ Neues Fesseln-Set aus aktueller Situation", zh: "+ 从当前创建新束缚套装", fr: "+ Nouveau set de liens depuis l'actuel", es: "+ Nuevo conjunto desde el actual" },
    "restraints.deleteTitle":    { en: "Delete this restraint set",   de: "Dieses Fesseln-Set löschen",   zh: "删除此束缚套装",    fr: "Supprimer ce set de liens",     es: "Eliminar este conjunto"       },
    "restraints.updateTitle":    { en: "Save current restraints to this set", de: "Aktuelle Fesseln in diesem Set speichern", zh: "将当前束缚保存到此套装", fr: "Sauvegarder les liens actuels dans ce set", es: "Guardar ataduras actuales en este conjunto" },
    "restraints.filter":         { en: "Filter restraints…",          de: "Fesseln filtern…",              zh: "过滤束缚…",         fr: "Filtrer les liens…",            es: "Filtrar ataduras…"            },
    "restraints.noMatch":        { en: "No restraints match your filter.", de: "Keine Fesseln entsprechen dem Filter.", zh: "没有匹配的束缚。", fr: "Aucun lien ne correspond.", es: "No hay ataduras que coincidan." },
    "restraints.importPlaceholder": { en: "Paste BC outfit code…",   de: "BC-Outfit-Code einfügen…",      zh: "粘贴 BC 服装代码…", fr: "Coller le code BC…",            es: "Pegar código BC…"             },
    "restraints.nameLabel":      { en: "Name",                        de: "Name",                          zh: "名称",              fr: "Nom",                           es: "Nombre"                       },
    "restraints.commandLabel":   { en: "Command",                     de: "Befehl",                        zh: "命令",              fr: "Commande",                      es: "Comando"                      },
    "restraints.saveChanges":    { en: "✓ Save Changes",              de: "✓ Änderungen speichern",        zh: "✓ 保存更改",        fr: "✓ Enregistrer les modifications", es: "✓ Guardar cambios"           },

    // ─── BUTTONS TAB ───────────────────────────────────────────────────────
    "buttons.colourPresets":     { en: "COLOUR PRESETS",              de: "FARBVORLAGEN",                  zh: "颜色预设",          fr: "PRÉSETS DE COULEUR",            es: "PRESETS DE COLOR"             },
    "buttons.emoteText":         { en: "Emote text…",                 de: "Emote-Text…",                   zh: "表情文字…",         fr: "Texte d'émote…",                es: "Texto de emote…"              },
    "buttons.styleAction":       { en: "Action !",                    de: "Aktion !",                      zh: "动作 !",            fr: "Action !",                      es: "Acción !"                     },
    "buttons.styleEmote":        { en: "Emote *",                     de: "Emote *",                       zh: "表情 *",            fr: "Émote *",                       es: "Emote *"                      },
    "buttons.stylePose":         { en: "Pose",                        de: "Pose",                          zh: "姿势",              fr: "Pose",                          es: "Pose"                         },
    "buttons.styleReset":        { en: "Reset _",                     de: "Reset _",                       zh: "重置 _",            fr: "Reset _",                       es: "Reset _"                      },
    "buttons.styleLeave":        { en: "Leave Room 🚪",               de: "Raum verlassen 🚪",             zh: "离开房间 🚪",       fr: "Quitter la salle 🚪",           es: "Salir de sala 🚪"             },
    "buttons.seqBadge":          { en: "✨ sequence",                  de: "✨ Sequenz",                     zh: "✨ 序列",            fr: "✨ séquence",                    es: "✨ secuencia"                  },
    "buttons.addCategory":       { en: "+ Add Category",              de: "+ Kategorie hinzufügen",        zh: "+ 添加分类",        fr: "+ Ajouter une catégorie",       es: "+ Añadir categoría"           },
    "buttons.importHint":        { en: "Paste JSON or BC code…",      de: "JSON oder BC-Code einfügen…",   zh: "粘贴 JSON 或 BC 代码…", fr: "Coller JSON ou code BC…",   es: "Pegar JSON o código BC…"      },
    "buttons.addSlot":           { en: "+ Add",                       de: "+ Hinzufügen",                  zh: "+ 添加",            fr: "+ Ajouter",                     es: "+ Añadir"                     },
    "buttons.clearAll":          { en: "Clear All",                   de: "Alle löschen",                  zh: "全部清除",          fr: "Tout effacer",                  es: "Borrar todo"                  },
    "buttons.noCategories":      { en: "No categories yet.",          de: "Noch keine Kategorien.",        zh: "尚无分类。",        fr: "Aucune catégorie.",             es: "Sin categorías aún."          },
    "buttons.categoryName":      { en: "Category name…",              de: "Kategoriename…",                zh: "分类名称…",         fr: "Nom de catégorie…",             es: "Nombre de categoría…"         },
    "buttons.renameCategory":    { en: "Rename Category",             de: "Kategorie umbenennen",          zh: "重命名分类",        fr: "Renommer la catégorie",         es: "Renombrar categoría"          },
    "buttons.deleteCategory":    { en: "Delete Category",             de: "Kategorie löschen",             zh: "删除分类",          fr: "Supprimer la catégorie",        es: "Eliminar categoría"           },
    "buttons.funActions":        { en: "FUN ACTIONS",                 de: "SPASS-AKTIONEN",                zh: "趣味动作",          fr: "ACTIONS AMUSANTES",             es: "ACCIONES DIVERTIDAS"          },
    "buttons.usefulButtons":     { en: "USEFUL BUTTONS",              de: "NÜTZLICHE TASTEN",              zh: "实用按键",          fr: "BOUTONS UTILES",                es: "BOTONES ÚTILES"               },
    "buttons.oocModeOn":         { en: "( OOC Mode: ON — click to turn off",   de: "( OOC-Modus: AN — zum Deaktivieren klicken",  zh: "（OOC 模式：开 — 点击关闭）", fr: "( Mode OOC : ACTIVÉ — cliquer pour désactiver",  es: "( Modo OOC: ACTIVADO — clic para desactivar"  },
    "buttons.oocModeOff":        { en: "( OOC Mode: OFF — click to turn on",   de: "( OOC-Modus: AUS — zum Aktivieren klicken",   zh: "（OOC 模式：关 — 点击开启）", fr: "( Mode OOC : DÉSACTIVÉ — cliquer pour activer", es: "( Modo OOC: DESACTIVADO — clic para activar"  },
    "buttons.copyMemberNumber":  { en: "Copy My Member Number",       de: "Mitgliedsnummer kopieren",      zh: "复制我的成员编号",  fr: "Copier mon numéro membre",      es: "Copiar mi número de miembro"  },
    "buttons.resetDefaultPose":  { en: "Reset to Default Pose",       de: "Auf Standardpose zurücksetzen", zh: "重置为默认姿势",    fr: "Réinitialiser la pose",         es: "Restablecer pose predeterminada" },
    "buttons.resetDefaultPoseTitle": { en: "Clears all active poses back to standing", de: "Alle aktiven Posen auf Stehen zurücksetzen", zh: "清除所有活动姿势，恢复站立", fr: "Efface toutes les poses actives (retour debout)", es: "Borra todas las poses activas (vuelve de pie)" },
    "buttons.noFriendsHere":     { en: "No friends here~",            de: "Keine Freunde hier~",           zh: "房间里没有朋友~",   fr: "Aucun ami ici~",                es: "No hay amigos aquí~"          },
    "buttons.boopedN":           { en: "Booped {n}!",                 de: "{n} gestupst!",                 zh: "戳了 {n} 个！",     fr: "Touché {n} !",                  es: "¡Tocado a {n}!"               },

    // ─── ANIMS TAB ─────────────────────────────────────────────────────────
    "anims.poseCombos":    { en: "Pose Combos",        de: "Pose-Kombinationen",      zh: "姿势组合",          fr: "Combos de poses",           es: "Combos de poses"          },
    "anims.noCombos":      { en: "No combos saved.",   de: "Keine Kombos gespeichert.", zh: "尚未保存任何组合。", fr: "Aucun combo sauvegardé.", es: "No hay combos guardados." },
    "anims.newCombo":      { en: "+ New Pose Combo",   de: "+ Neue Pose-Kombination",  zh: "+ 新建姿势组合",    fr: "+ Nouveau combo de poses",  es: "+ Nuevo combo de poses"   },
    "anims.newPresetName": { en: "New preset name…",   de: "Neuer Preset-Name…",      zh: "新预设名称…",       fr: "Nouveau nom de preset…",   es: "Nuevo nombre de preset…"  },
    "anims.saveCombo":     { en: "✓ Save Combo",       de: "✓ Kombination speichern", zh: "✓ 保存组合",        fr: "✓ Sauvegarder le combo",    es: "✓ Guardar combo"          },
    "anims.delay":         { en: "Delay (ms)",         de: "Verzögerung (ms)",        zh: "延迟（毫秒）",      fr: "Délai (ms)",                es: "Retardo (ms)"             },
    "anims.addStep":       { en: "+ Add Step",         de: "+ Schritt hinzufügen",    zh: "+ 添加步骤",        fr: "+ Ajouter une étape",       es: "+ Añadir paso"            },
    "anims.poseHint":      { en: "Pick one Body pose and one Arm pose — they stack!", de: "Eine Körperpose und eine Armpose wählen — sie stapeln sich!", zh: "选择一个身体姿势和一个手臂姿势——可叠加！", fr: "Choisir une pose de corps et une de bras — elles se combinent !", es: "Elige una pose de cuerpo y una de brazos — ¡se combinan!" },
    "anims.scenes":        { en: "SCENES",             de: "SZENEN",                  zh: "场景",              fr: "SCÈNES",                    es: "ESCENAS"                  },
    "anims.scenesHint":    { en: "Chain poses, item changes, emotes and pauses into a timed sequence.", de: "Posen, Kleidungsänderungen, Emotes und Pausen zu einer zeitgesteuerten Sequenz verbinden.", zh: "将姿势、物品更换、表情和暂停串成一个定时序列。", fr: "Enchaîner poses, changements d'objet, émotes et pauses en une séquence minutée.", es: "Encadena poses, cambios de objeto, emotes y pausas en una secuencia cronometrada." },

    // ─── USERS/NOTES TAB ───────────────────────────────────────────────────
    "users.peopleInRoom":      { en: "People in Room",         de: "Personen im Raum",         zh: "房间中的人",        fr: "Personnes dans la salle",    es: "Personas en la sala"       },
    "users.friends":           { en: "Friends",                de: "Freunde",                  zh: "好友",              fr: "Amis",                       es: "Amigos"                    },
    "users.autoReplyWhenAfk":  { en: "Auto-reply when AFK",   de: "Auto-Antwort wenn AFK",    zh: "AFK 时自动回复",    fr: "Réponse auto quand AFK",     es: "Respuesta auto cuando AFK" },
    "users.header":            { en: "User Notes",             de: "Benutzernotizen",          zh: "用户笔记",          fr: "Notes utilisateur",          es: "Notas de usuario"          },
    "users.noteHint":          { en: "Notes about this person...", de: "Notizen zu dieser Person...", zh: "关于此人的备注...", fr: "Notes sur cette personne...", es: "Notas sobre esta persona..." },
    "users.savedAutomatically":{ en: "Saved automatically",    de: "Automatisch gespeichert",  zh: "自动保存",          fr: "Sauvegardé automatiquement", es: "Guardado automáticamente"  },
    "users.noOneInRoom":       { en: "No people in the room yet.", de: "Noch niemand im Raum.", zh: "房间里还没有人。",   fr: "Personne dans la salle.",    es: "Nadie en la sala aún."     },
    "users.friendsSince":      { en: "🤝 Friends since: {date}",  de: "🤝 Freunde seit: {date}", zh: "🤝 好友自: {date}", fr: "🤝 Amis depuis : {date}",    es: "🤝 Amigos desde: {date}"   },
    "users.friendsSinceUnknown": { en: "🤝 Friends since: Unknown", de: "🤝 Freunde seit: Unbekannt", zh: "🤝 好友自：未知", fr: "🤝 Amis depuis : inconnu",  es: "🤝 Amigos desde: desconocido" },
    "users.pinToTop":          { en: "📌 Pin to top",          de: "📌 Oben anheften",          zh: "📌 置顶",            fr: "📌 Épingler en haut",         es: "📌 Fijar arriba"            },
    "users.unpin":             { en: "📌 Unpin",               de: "📌 Lösen",                  zh: "📌 取消置顶",       fr: "📌 Désépingler",              es: "📌 Desfijar"                },
    "users.newTagPlaceholder": { en: "new tag…",               de: "neues Etikett…",            zh: "新标签…",           fr: "nouveau tag…",                es: "nueva etiqueta…"           },
    "users.typeMessage":       { en: "Type a message...",      de: "Nachricht eingeben...",     zh: "输入消息...",       fr: "Tapez un message...",         es: "Escribe un mensaje..."     },
    "users.reply":             { en: "↩ reply",                de: "↩ Antworten",               zh: "↩ 回复",            fr: "↩ répondre",                  es: "↩ responder"               },
    "users.noConversation":    { en: "No conversation yet.",   de: "Noch keine Unterhaltung.",  zh: "还没有对话。",      fr: "Aucune conversation.",        es: "Sin conversación aún."     },

    // ─── DEV TAB ───────────────────────────────────────────────────────────
    "dev.characterInspector": { en: "Character Inspector",   de: "Charakter-Inspektor",       zh: "角色检查器",        fr: "Inspecteur de personnage",    es: "Inspector de personaje"    },
    "dev.searchPlaceholder":  { en: "Search name or #id…",   de: "Name oder #ID suchen…",     zh: "搜索名称或 #ID…",   fr: "Chercher nom ou #id…",        es: "Buscar nombre o #id…"      },
    "dev.activeRestraints":   { en: "ACTIVE RESTRAINTS",     de: "AKTIVE FESSELN",            zh: "当前束缚",          fr: "LIENS ACTIFS",                es: "ATADURAS ACTIVAS"          },
    "dev.charNotFound":       { en: "Character not found.",  de: "Charakter nicht gefunden.", zh: "未找到角色。",      fr: "Personnage introuvable.",     es: "Personaje no encontrado."  },
    "dev.charNotInRoom":      { en: "Character not found in room.", de: "Charakter nicht im Raum.", zh: "未在房间中找到角色。", fr: "Personnage non trouvé dans la salle.", es: "Personaje no encontrado en la sala." },
    "dev.facePresets":        { en: "FACE PRESETS",          de: "GESICHTS-PRESETS",          zh: "面部预设",          fr: "PRÉSETS DE VISAGE",           es: "PRESETS DE CARA"           },
    "dev.saveFace":           { en: "💾 Save face",          de: "💾 Gesicht speichern",      zh: "💾 保存面部",       fr: "💾 Sauvegarder le visage",    es: "💾 Guardar cara"            },
    "dev.clearExpressions":   { en: "✕ Clear all expressions", de: "✕ Alle Ausdrücke löschen", zh: "✕ 清除所有表情",   fr: "✕ Effacer toutes les expressions", es: "✕ Borrar todas las expresiones" },
    "dev.whisperLog":         { en: "Whisper Log",           de: "Flüsterprotokoll",          zh: "私语日志",          fr: "Journal des chuchotements",   es: "Registro de susurros"      },
    "dev.devLog":             { en: "Dev Log",               de: "Entwicklungsprotokoll",     zh: "开发日志",          fr: "Journal de développement",    es: "Registro de desarrollo"    },
    "dev.enableDevLogging":   { en: "📟 Enable dev logging", de: "📟 Protokollierung aktivieren", zh: "📟 启用开发日志",  fr: "📟 Activer la journalisation", es: "📟 Activar registro dev"   },
    "dev.injectTestEntry":    { en: "Inject test entry",     de: "Testeintrag einfügen",      zh: "注入测试条目",      fr: "Injecter entrée test",        es: "Inyectar entrada prueba"   },
    "dev.clearLog":           { en: "Clear",                 de: "Löschen",                   zh: "清除",              fr: "Effacer",                     es: "Borrar"                    },
    "dev.ebcTags":            { en: "EBC TAGS",              de: "EBC-ETIKETTEN",             zh: "EBC 标签",          fr: "ÉTIQUETTES EBC",              es: "ETIQUETAS EBC"             },
    "dev.showMyTag":          { en: "My EBC tag (visible to others)",     de: "Mein EBC-Etikett (für andere sichtbar)",    zh: "我的 EBC 标签（其他人可见）",   fr: "Mon étiquette EBC (visible par les autres)",  es: "Mi etiqueta EBC (visible para otros)"         },
    "dev.showOthersTags":     { en: "Others' EBC tags (on your screen)",  de: "EBC-Etiketten anderer (auf deinem Bildschirm)", zh: "他人的 EBC 标签（你的屏幕）", fr: "Étiquettes EBC des autres (sur votre écran)", es: "Etiquetas EBC de otros (en tu pantalla)"      },
    "dev.drawerPrefs":        { en: "DRAWER PREFERENCES",   de: "FENSTER-EINSTELLUNGEN",     zh: "面板偏好",          fr: "PRÉFÉRENCES DU PANNEAU",      es: "PREFERENCIAS DEL PANEL"    },
    "dev.ebcUsersInRoom":     { en: "EBC USERS IN THIS ROOM", de: "EBC-NUTZER IM RAUM",      zh: "房间中的 EBC 用户", fr: "UTILISATEURS EBC DANS LA SALLE", es: "USUARIOS EBC EN LA SALA"   },
    "dev.developerTools":     { en: "DEVELOPER TOOLS",      de: "ENTWICKLER-WERKZEUGE",      zh: "开发者工具",        fr: "OUTILS DÉVELOPPEUR",          es: "HERRAMIENTAS DEV"          },
    "dev.copyRestraintsFromMember": { en: "COPY RESTRAINTS FROM MEMBER", de: "FESSELN VON MITGLIED KOPIEREN", zh: "从成员复制束缚", fr: "COPIER LES LIENS D'UN MEMBRE", es: "COPIAR ATADURAS DE MIEMBRO" },
    "dev.statEditor":         { en: "STAT EDITOR",          de: "STATISTIK-EDITOR",          zh: "属性编辑器",        fr: "ÉDITEUR DE STATS",            es: "EDITOR DE STATS"           },
    "dev.peopleMet":          { en: "PEOPLE MET",           de: "BEKANNTE PERSONEN",         zh: "已认识的人",        fr: "PERSONNES RENCONTRÉES",       es: "PERSONAS CONOCIDAS"        },

    // ─── CREDITS TAB ───────────────────────────────────────────────────────────
    "credits.specialThanks":  { en: "Special Thanks",       de: "Besonderer Dank",           zh: "特别感谢",          fr: "Remerciements spéciaux",      es: "Agradecimientos especiales" },
    "credits.intro":          { en: "People who made EBC possible.", de: "Menschen, die EBC möglich gemacht haben.", zh: "让 EBC 成为可能的人们。", fr: "Les personnes qui ont rendu EBC possible.", es: "Las personas que hicieron posible EBC." },

    // ─── DOM TAB ───────────────────────────────────────────────────────────
    "dom.domSets":       { en: "DOM Sets",                de: "DOM-Sets",                  zh: "DOM 集合",          fr: "Sets DOM",                    es: "Conjuntos DOM"             },
    "dom.copyRestraints":{ en: "Copy Restraints from Member", de: "Fesseln von Mitglied kopieren", zh: "从成员复制束缚", fr: "Copier les liens d'un membre", es: "Copiar ataduras de miembro" },
    "dom.newSet":        { en: "+ New Set",               de: "+ Neues Set",               zh: "+ 新建集合",        fr: "+ Nouveau set",               es: "+ Nuevo conjunto"          },
    "dom.rescue":        { en: "Rescue",                  de: "Retten",                    zh: "救援",              fr: "Sauver",                      es: "Rescatar"                  },
    "dom.clearLocks":    { en: "Clear locks",             de: "Schlösser entfernen",       zh: "清除锁具",          fr: "Effacer les serrures",        es: "Quitar candados"           },
    "dom.removeItems":   { en: "Remove items",            de: "Gegenstände entfernen",     zh: "移除物品",          fr: "Retirer les objets",          es: "Quitar objetos"            },
    "dom.notInRoom":     { en: "⚠ That person is no longer in the room.", de: "⚠ Diese Person ist nicht mehr im Raum.", zh: "⚠ 该人已不在房间中。", fr: "⚠ Cette personne n'est plus dans la salle.", es: "⚠ Esa persona ya no está en la sala." },
    "dom.applySet":      { en: "Apply",                   de: "Anwenden",                  zh: "应用",              fr: "Appliquer",                   es: "Aplicar"                   },

    // ─── KITTY TAB ─────────────────────────────────────────────────────────
    "kitty.grabLeash":       { en: "🔗 Grab Leash",         de: "🔗 Leine ergreifen",       zh: "🔗 抓住牵绳",       fr: "🔗 Saisir la laisse",         es: "🔗 Agarrar correa"         },
    "kitty.letGoLeash":      { en: "🔗 Let Go of Leash",    de: "🔗 Leine loslassen",       zh: "🔗 放开牵绳",       fr: "🔗 Lâcher la laisse",         es: "🔗 Soltar correa"          },
    "kitty.holdLeashFirst":  { en: "Hold leash first!",     de: "Zuerst Leine ergreifen!",  zh: "请先抓住牵绳！",    fr: "Tenir la laisse d'abord !",   es: "¡Agarra la correa primero!" },
    "kitty.pull":            { en: "↗ Pull",                de: "↗ Ziehen",                 zh: "↗ 拉近",            fr: "↗ Tirer",                     es: "↗ Tirar"                   },
    "kitty.barkBtn":         { en: "🐶 Bark!",              de: "🐶 Bellen!",               zh: "🐶 汪汪！",          fr: "🐶 Aboyer !",                 es: "🐶 ¡Ladrar!"               },
    "kitty.boopAll":         { en: "🐾 Boop all friends in room", de: "🐾 Alle Freunde im Raum tippen", zh: "🐾 戳戳房间里所有朋友", fr: "🐾 Taper tous les amis dans la salle", es: "🐾 Tocar a todos los amigos" },
    "kitty.emotes":          { en: "Emotes",                de: "Emotes",                   zh: "表情动作",          fr: "Émotes",                      es: "Emotes"                    },
    "kitty.moods":           { en: "Moods",                 de: "Stimmungen",               zh: "心情",              fr: "Humeurs",                     es: "Estados de ánimo"          },
    "kitty.restraintSets":   { en: "Restraint Sets",        de: "Fesseln-Sets",             zh: "束缚套装",          fr: "Sets de liens",               es: "Conjuntos de ataduras"     },
    "kitty.poses":           { en: "Poses",                 de: "Posen",                    zh: "姿势",              fr: "Poses",                       es: "Poses"                     },
    "kitty.punishments":     { en: "Punishments",           de: "Strafen",                  zh: "惩罚",              fr: "Punitions",                   es: "Castigos"                  },

    // ─── EXPRESSION PRESETS ────────────────────────────────────────────────
    "expr.facePresets":          { en: "FACE PRESETS",           de: "GESICHTS-PRESETS",          zh: "面部预设",          fr: "PRÉSETS DE VISAGE",           es: "PRESETS DE CARA"           },
    "expr.presetNamePlaceholder":{ en: "Preset name…",           de: "Preset-Name…",              zh: "预设名称…",         fr: "Nom du preset…",              es: "Nombre del preset…"        },
    "expr.saveFace":             { en: "💾 Save face",           de: "💾 Gesicht speichern",      zh: "💾 保存面部",       fr: "💾 Sauvegarder le visage",    es: "💾 Guardar cara"            },
    "expr.defaultPreset":        { en: "Default (on revert):",   de: "Standard (beim Zurücksetzen):", zh: "默认（还原时）：", fr: "Défaut (au retour) :",       es: "Predeterminado (al revertir):" },
    "expr.noDefault":            { en: "— None —",               de: "— Keines —",                zh: "— 无 —",            fr: "— Aucun —",                   es: "— Ninguno —"               },
    "expr.triggers":             { en: "Expression Triggers",    de: "Ausdrucks-Auslöser",        zh: "表情触发器",        fr: "Déclencheurs d'expression",   es: "Disparadores de expresión"  },
    "expr.newTrigger":           { en: "+ New Trigger",          de: "+ Neuer Auslöser",          zh: "+ 新建触发器",      fr: "+ Nouveau déclencheur",       es: "+ Nuevo disparador"         },
    "expr.sequences":            { en: "Expression Sequences",   de: "Ausdrucks-Sequenzen",       zh: "表情序列",          fr: "Séquences d'expressions",     es: "Secuencias de expresiones"  },
    "expr.newSeq":               { en: "+ New Sequence",         de: "+ Neue Sequenz",            zh: "+ 新建序列",        fr: "+ Nouvelle séquence",         es: "+ Nueva secuencia"          },
    "expr.play":                 { en: "▶ Play",                 de: "▶ Abspielen",               zh: "▶ 播放",            fr: "▶ Jouer",                     es: "▶ Reproducir"               },
    "expr.stopSeq":              { en: "■ Stop",                 de: "■ Stopp",                   zh: "■ 停止",            fr: "■ Arrêter",                   es: "■ Detener"                  },

    // ─── SETTINGS ──────────────────────────────────────────────────────────
    "settings.defaultNickname":   { en: "Default Nickname",       de: "Standard-Spitzname",        zh: "默认昵称",          fr: "Surnom par défaut",           es: "Apodo predeterminado"       },
    "settings.defaultTitle":      { en: "Default Title",          de: "Standard-Titel",            zh: "默认头衔",          fr: "Titre par défaut",            es: "Título predeterminado"      },
    "settings.noDefaultTitle":    { en: "(No default title)",     de: "(Kein Standard-Titel)",     zh: "（无默认头衔）",    fr: "(Pas de titre par défaut)",   es: "(Sin título predeterminado)" },
    "settings.noDefaultNickname": { en: "(No default nickname)",  de: "(Kein Standard-Spitzname)", zh: "（无默认昵称）",    fr: "(Pas de surnom par défaut)",  es: "(Sin apodo predeterminado)" },
    "settings.whitelistHint":     { en: "Click an item to protect it", de: "Klicke auf ein Element zum Schützen", zh: "点击物品以保护它", fr: "Cliquer sur un objet pour le protéger", es: "Haz clic en un objeto para protegerlo" },
    "settings.afkAutoReply":      { en: "AFK Auto-Reply",         de: "AFK-Autoantwort",           zh: "AFK 自动回复",      fr: "Réponse auto AFK",            es: "Respuesta automática AFK"   },
    "settings.idleThreshold":     { en: "Idle threshold",         de: "Inaktivitätsschwelle",      zh: "空闲阈值",          fr: "Seuil d'inactivité",          es: "Umbral de inactividad"      },
    "settings.autoReplyMsg":      { en: "Auto-reply message",     de: "Autoantwort-Nachricht",     zh: "自动回复消息",      fr: "Message de réponse auto",     es: "Mensaje de respuesta auto"  },
    "settings.language":          { en: "Language",               de: "Sprache",                   zh: "语言",              fr: "Langue",                      es: "Idioma"                     },
    "settings.escapeWhitelist":   { en: "Escape whitelist — items auto-escape will never remove", de: "Flucht-Whitelist — diese Elemente werden nie automatisch entfernt", zh: "逃脱白名单——自动逃脱永不移除的物品", fr: "Liste blanche — objets que l'auto-escape ne retirera jamais", es: "Lista blanca de escape — objetos que el auto-escape nunca quitará" },

    // ─── PALETTES ──────────────────────────────────────────────────────────
    "palettes.outfit":       { en: "OUTFIT",                de: "OUTFIT",                    zh: "服装",              fr: "TENUE",                       es: "ATUENDO"                   },
    "palettes.restraint":    { en: "RESTRAINT",             de: "FESSEL",                    zh: "束缚",              fr: "LIEN",                        es: "ATADURA"                   },
    "palettes.noOutfit":     { en: "No outfit palettes saved", de: "Keine Outfit-Paletten gespeichert", zh: "未保存服装调色板", fr: "Aucune palette de tenue sauvegardée", es: "Sin paletas de atuendo guardadas" },
    "palettes.noRestraint":  { en: "No restraint palettes saved", de: "Keine Fesseln-Paletten gespeichert", zh: "未保存束缚调色板", fr: "Aucune palette de lien sauvegardée", es: "Sin paletas de atadura guardadas" },
    "palettes.saveOutfit":   { en: "Save Outfit",           de: "Outfit speichern",          zh: "保存服装",          fr: "Sauvegarder la tenue",        es: "Guardar atuendo"            },
    "palettes.saveRestraint":{ en: "Save Restraint",        de: "Fessel speichern",          zh: "保存束缚",          fr: "Sauvegarder le lien",         es: "Guardar atadura"            },
    "palettes.paletteName":  { en: "Palette name…",         de: "Palettenname…",             zh: "调色板名称…",       fr: "Nom de la palette…",          es: "Nombre de paleta…"          },

    // ─── SAFEWORD ──────────────────────────────────────────────────────────
    "sw.graceActive":   { en: "Grace active",   de: "Schonfrist aktiv",     zh: "宽限期已激活",    fr: "Grâce active",          es: "Gracia activa"         },
    "sw.graceRemaining":{ en: "Grace: {time}",  de: "Schonfrist: {time}",   zh: "宽限期：{time}",  fr: "Grâce : {time}",        es: "Gracia: {time}"        },
    "sw.endGrace":      { en: "End grace",      de: "Schonfrist beenden",   zh: "结束宽限期",      fr: "Terminer la grâce",     es: "Terminar la gracia"    },

    // ─── THEMES ────────────────────────────────────────────────────────────
    "theme.drawerBg":  { en: "Drawer BG",   de: "Schublade HG",      zh: "面板背景",        fr: "BG panneau",         es: "Fondo panel"          },
    "theme.cardBg":    { en: "Card BG",     de: "Karte HG",          zh: "卡片背景",        fr: "BG carte",           es: "Fondo tarjeta"        },
    "theme.insetBg":   { en: "Inset BG",    de: "Eingebettetes HG",  zh: "内嵌背景",        fr: "BG incrusté",        es: "Fondo interior"       },
    "theme.border":    { en: "Border",      de: "Rahmen",            zh: "边框",            fr: "Bordure",            es: "Borde"                },
    "theme.accent":    { en: "Accent",      de: "Akzent",            zh: "强调色",          fr: "Accent",             es: "Acento"               },
    "theme.gold":      { en: "Gold",        de: "Gold",              zh: "金色",            fr: "Or",                 es: "Dorado"               },
    "theme.text":      { en: "Text",        de: "Text",              zh: "文字",            fr: "Texte",              es: "Texto"                },
    "theme.subtext":   { en: "Subtext",     de: "Untertext",         zh: "副文字",          fr: "Sous-texte",         es: "Subtexto"             },
    "theme.dimText":   { en: "Dim Text",    de: "Gedimmter Text",    zh: "暗文字",          fr: "Texte atténué",      es: "Texto atenuado"       },
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
