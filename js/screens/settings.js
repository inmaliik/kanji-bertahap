// Settings: next-visitor actions, answer log management, and content preview
// links for the content team and expert validators.

import { h } from "../dom.js";
import { clearLog, getLogStatus, logToCsv, markExported } from "../logger.js";
import { flushLog, getSenderStatus, subscribeSenderStatus } from "../log-sender.js";
import { FURIGANA_MODE, resetProgress, saveProgress, storageUsage, STORAGE_WARNING_RATIO } from "../state.js";
import { isStorageAvailable } from "../storage.js";
import { getBuildId } from "../build.js";
import { rewardsAvailable, unredeemed } from "../rewards.js";
import { backLink } from "./common.js";
import { consentStatusText } from "./consent.js";
import { menuBar } from "./menu.js";
import { clearBoard, loadDevice, ranking, saveDevice } from "../leaderboard.js";
import { currentMode } from "../event-log.js";
import {
  asksConsent,
  exhibitionSwitchAvailable,
  MODE_LABELS,
  participantCodeProblem,
  participantCodeRequired,
  PARTICIPANT_CODE_EXAMPLE,
  RESEARCH_LINK_HASH,
  SESSION_MODE,
} from "../session-mode.js";

const DELETE_CONFIRM_WORD = "HAPUS";
const STORAGE_CRITICAL_RATIO = 0.95;

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : null;

function csvFilename(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `kanji-bertahap-log-${stamp}.csv`;
}

function downloadText(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = h("a", { href: url, download: filename, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Two-step confirmation: a button that opens a box with the real action. */
function confirmFlow({ openLabel, title, details, confirmLabel, requireWord = null, onConfirm }) {
  const wrapper = h("div", {});
  const openButton = h("button", { type: "button", class: "button button--danger button--block" }, openLabel);

  function showClosed() {
    wrapper.replaceChildren(openButton);
  }

  function showOpen() {
    const input = requireWord
      ? h("input", {
          type: "text",
          class: "text-input",
          id: "confirm-word",
          autocomplete: "off",
          autocapitalize: "characters",
          spellcheck: "false",
        })
      : null;
    const confirmButton = h(
      "button",
      { type: "button", class: "button button--danger", disabled: Boolean(requireWord), onClick: onConfirm },
      confirmLabel
    );
    input?.addEventListener("input", () => {
      confirmButton.disabled = input.value.trim().toUpperCase() !== requireWord;
    });
    wrapper.replaceChildren(
      h(
        "div",
        { class: "confirm", role: "group", "aria-label": title },
        h("p", { class: "confirm__title" }, title),
        h("ul", {}, details.map((d) => h("li", {}, d))),
        input
          ? [h("label", { for: "confirm-word", class: "confirm__label" }, `Ketik ${requireWord} untuk melanjutkan:`), input]
          : null,
        h(
          "div",
          { class: "button-row" },
          confirmButton,
          h("button", { type: "button", class: "button", onClick: () => (showClosed(), openButton.focus()) }, "Batal")
        )
      )
    );
    (input ?? confirmButton).focus();
  }

  openButton.addEventListener("click", showOpen);
  showClosed();
  return wrapper;
}

export function settingsScreen(app) {
  const root = h("div", { class: "screen settings" });
  const messages = {}; // card key → { kind, text }

  const messageFor = (key) => {
    const m = messages[key];
    return m ? h("p", { class: `notice notice--${m.kind}`, role: "status" }, m.text) : null;
  };

  function setMessage(key, kind, text) {
    Object.keys(messages).forEach((k) => delete messages[k]);
    messages[key] = { kind, text };
    render();
  }

  // --- Session mode (D-112) -----------------------------------------------------

  const MODE_HELP = {
    [SESSION_MODE.GENERAL]: [
      "Jawaban direkam hanya jika pemain menyetujuinya; kode peserta opsional.",
      "Papan peringkat mati.",
    ],
    [SESSION_MODE.EXHIBITION]: [
      "Tidak ada jawaban yang direkam atau dikirim, dan layar persetujuan dilewati.",
      "Papan peringkat tampil di peta.",
    ],
    [SESSION_MODE.RESEARCH]: [
      "Persetujuan dan kode peserta wajib sebelum bermain. Jika pemain tidak setuju, perangkat keluar dari mode penelitian.",
      "Papan peringkat dan mode pameran tidak tersedia.",
      "Mode ini bertahan setelah halaman dimuat ulang; reset progres mengembalikannya ke mode umum.",
    ],
  };

  function modeCard(mode) {
    return h(
      "section",
      { class: `card mode-card mode-card--${mode}`, "aria-labelledby": "mode-title" },
      h("h2", { id: "mode-title" }, "Mode sesi"),
      h("p", { class: "mode-card__current" }, "Mode saat ini: ", h("strong", {}, MODE_LABELS[mode])),
      mode === SESSION_MODE.RESEARCH
        ? h("p", {}, "Kode peserta: ", h("strong", {}, app.progress.participantCode ?? "belum diisi"))
        : null,
      h("ul", {}, MODE_HELP[mode].map((line) => h("li", {}, line))),
      h(
        "p",
        { class: "muted" },
        mode === SESSION_MODE.RESEARCH ? "" : "Mode pameran dinyalakan di bawah. ",
        "Mode penelitian dimasuki lewat tautan khusus dari peneliti (alamat aplikasi diakhiri ",
        h("code", {}, RESEARCH_LINK_HASH),
        ")."
      )
    );
  }

  // --- Next visitor -------------------------------------------------------------

  function resetCard() {
    // Earned rewards live in the player's progress: a reset loses them (D-123).
    const pending = rewardsAvailable(currentMode(app)) ? unredeemed(app.progress) : [];
    const lost = pending.length
      ? `⚠ ${pending.length} hadiah belum ditukar (${pending.map((r) => r.title).join(", ")}) ikut terhapus dan tidak bisa dikembalikan. Tukar dulu jika pemainnya masih ingin memakainya.`
      : null;
    return h(
      "section",
      { class: "card", "aria-labelledby": "reset-title" },
      h("h2", { id: "reset-title" }, "Pemain berikutnya"),
      h("p", { class: "muted" }, "Lakukan reset setiap kali perangkat berpindah ke pemain lain, misalnya di pameran."),
      messageFor("reset"),
      lost ? h("p", { class: "notice notice--warning" }, lost) : null,
      h("p", {}, "ID pemain saat ini: ", h("code", {}, app.progress.playerId)),
      confirmFlow({
        openLabel: "Reset progres",
        title: "Reset progres di perangkat ini?",
        details: [
          ...(lost ? [lost] : []),
          "Semua progres misi dihapus, termasuk misi yang sudah tuntas.",
          "Pemain berikutnya mendapat ID pemain baru; kode peserta, pilihan persetujuan, dan karakter dikosongkan, dan setelan furigana kembali ke bawaan.",
          "Mode penelitian berakhir: pemain berikutnya mulai di mode umum, atau mode pameran jika menyala.",
          "Riwayat jawaban (log) tidak dihapus.",
        ],
        confirmLabel: "Ya, reset progres",
        onConfirm: () => {
          app.progress = resetProgress();
          app.refreshBadge();
          setMessage("reset", "success", "✓ Progres direset. Perangkat siap untuk pemain berikutnya.");
        },
      })
    );
  }

  // --- Furigana (D-65) ----------------------------------------------------------

  const FURIGANA_OPTIONS = [
    { value: FURIGANA_MODE.ALWAYS, label: "Selalu tampil", help: "Bawaan. Furigana tampil di kalimat dan percakapan." },
    { value: FURIGANA_MODE.AFTER, label: "Tampil setelah menjawab", help: "Furigana disembunyikan sampai soal dijawab." },
    { value: FURIGANA_MODE.NEVER, label: "Tidak pernah", help: "Kalimat dan percakapan tampil tanpa furigana." },
  ];

  function furiganaCard() {
    const current = app.progress.settings.furiganaMode;
    return h(
      "section",
      { class: "card", "aria-labelledby": "furigana-title" },
      h("h2", { id: "furigana-title" }, "Furigana"),
      messageFor("furigana"),
      h(
        "fieldset",
        { class: "radio-list" },
        h("legend", { class: "sr-only" }, "Kapan furigana ditampilkan"),
        FURIGANA_OPTIONS.map((option) =>
          h(
            "label",
            {},
            h("input", {
              type: "radio",
              name: "furigana-mode",
              value: option.value,
              checked: option.value === current,
              onChange: () => {
                app.progress.settings.furiganaMode = option.value;
                saveProgress(app.progress);
                setMessage("furigana", "success", `✓ Furigana: ${option.label.toLowerCase()}.`);
              },
            }),
            h("span", {}, option.label, h("small", {}, option.help))
          )
        )
      ),
      h(
        "p",
        { class: "muted" },
        "Setelan ini disimpan untuk pemain saat ini dan tidak bisa diubah di tengah misi. Apa pun setelannya, ",
        "cara baca yang masih akan ditanyakan tetap disembunyikan supaya jawabannya tidak bocor."
      )
    );
  }

  // --- Exhibition mode (D-106) ------------------------------------------------

  function exhibitionCard(mode) {
    if (!exhibitionSwitchAvailable(mode)) {
      return h(
        "section",
        { class: "card", "aria-labelledby": "exhibition-title" },
        h("h2", { id: "exhibition-title" }, "Mode pameran"),
        h("p", {}, "Tidak tersedia di mode penelitian, supaya kondisi semua peserta sama. Papan peringkat terkunci mati.")
      );
    }
    const device = loadDevice();
    const count = ranking().length;
    return h(
      "section",
      { class: "card", "aria-labelledby": "exhibition-title" },
      h("h2", { id: "exhibition-title" }, "Mode pameran"),
      messageFor("exhibition"),
      h(
        "label",
        { class: "switch" },
        h("input", {
          type: "checkbox",
          checked: device.exhibitionMode,
          onChange: (event) => {
            saveDevice({ ...device, exhibitionMode: event.target.checked });
            setMessage(
              "exhibition",
              "success",
              event.target.checked
                ? "✓ Mode pameran menyala: tidak ada yang direkam, dan papan peringkat tampil di peta."
                : "✓ Mode pameran mati. Perangkat kembali ke mode umum."
            );
          },
        }),
        h("span", {}, "Mode pameran di perangkat ini")
      ),
      h(
        "p",
        { class: "muted" },
        "Untuk stan pameran. Selama menyala, tidak ada jawaban yang direkam atau dikirim, layar persetujuan dilewati, dan ",
        "papan peringkat tampil. Papan hanya berisi pemain di perangkat ini, dengan potret karakter dan nomor pemain, tanpa ",
        "nama atau kode peserta. Setelan dan papan tidak ikut terhapus saat reset progres."
      ),
      h("p", {}, `Pemain di papan: ${count}`),
      count
        ? confirmFlow({
            openLabel: "Kosongkan papan peringkat",
            title: "Kosongkan papan peringkat?",
            details: ["Semua pemain di papan perangkat ini dihapus, dan nomor pemain mulai lagi dari 01.", "Progres pemain dan log jawaban tidak berubah."],
            confirmLabel: "Ya, kosongkan",
            onConfirm: () => {
              clearBoard();
              setMessage("exhibition", "success", "✓ Papan peringkat dikosongkan.");
            },
          })
        : null
    );
  }

  function consentCard() {
    return h(
      "section",
      { class: "card", "aria-labelledby": "consent-title" },
      h("h2", { id: "consent-title" }, "Persetujuan perekaman"),
      h("p", {}, "Pemain saat ini: ", h("strong", {}, consentStatusText(app))),
      app.consentText
        ? h("p", { class: "muted" }, `Versi teks: ${app.consentText.version}${app.consentText.isPlaceholder ? " (TEKS SEMENTARA)" : ""}`)
        : h("p", { class: "notice notice--error" }, `✗ Teks persetujuan tidak bisa dimuat: ${app.consentError}`),
      h("p", { class: "muted" }, "Layar persetujuan muncul otomatis sebelum permainan pertama setiap pemain, termasuk setelah reset."),
      h("a", { class: "button button--block", href: "#/consent" }, "Buka layar persetujuan")
    );
  }

  function participantCard(mode) {
    const required = participantCodeRequired(mode);
    const current = app.progress.participantCode;
    const input = h("input", {
      type: "text",
      id: "participant-code",
      class: "text-input",
      value: current ?? "",
      maxlength: "32",
      placeholder: PARTICIPANT_CODE_EXAMPLE,
      autocomplete: "off",
      autocapitalize: "characters",
      spellcheck: "false",
      "aria-describedby": "participant-help participant-format",
    });

    const save = () => {
      const code = input.value.trim();
      const problem = participantCodeProblem(code);
      if (problem) {
        setMessage("participant", "error", `✗ ${problem}`);
        return;
      }
      app.progress.participantCode = code;
      saveProgress(app.progress);
      app.refreshBadge();
      setMessage("participant", "success", `✓ Kode peserta ${code} disimpan. Jawaban berikutnya dicatat dengan kode ini.`);
    };

    return h(
      "section",
      { class: "card", "aria-labelledby": "participant-title" },
      h("h2", { id: "participant-title" }, "Kode peserta"),
      messageFor("participant"),
      h(
        "p",
        { id: "participant-help" },
        required ? "Wajib di mode penelitian; kode bisa diganti tetapi tidak dikosongkan. Gunakan " : "Opsional. Isi hanya jika peneliti memberimu kode. Gunakan ",
        h("strong", {}, "kode anonim"),
        ", ",
        h("strong", {}, "bukan nama atau NIM"),
        "."
      ),
      h("label", { for: "participant-code", class: "field-label" }, current ? `Kode saat ini: ${current}` : "Belum ada kode"),
      input,
      h(
        "p",
        { id: "participant-format", class: "field-help" },
        "Format yang disarankan: huruf lalu angka, misalnya ",
        h("strong", {}, h("code", {}, PARTICIPANT_CODE_EXAMPLE)),
        "."
      ),
      h(
        "div",
        { class: "button-row" },
        h("button", { type: "button", class: "button button--primary", onClick: save }, "Simpan kode"),
        current && !required
          ? h(
              "button",
              {
                type: "button",
                class: "button",
                onClick: () => {
                  app.progress.participantCode = null;
                  saveProgress(app.progress);
                  setMessage("participant", "success", "✓ Kode peserta dikosongkan.");
                },
              },
              "Kosongkan kode"
            )
          : null
      )
    );
  }

  // --- Answer log ------------------------------------------------------------------

  function capacityBlock(log) {
    const usage = storageUsage();
    const percent = Math.min(100, Math.round(usage.ratio * 100));
    const avgRowChars = log.storedRows ? usage.used / log.storedRows : null;
    const rowsLeft = avgRowChars ? Math.max(0, Math.floor((usage.budget - usage.used) / avgRowChars)) : null;

    let notice = null;
    if (usage.ratio >= STORAGE_CRITICAL_RATIO || log.unsavedRows) {
      notice = h(
        "p",
        { class: "notice notice--error" },
        "✗ Penyimpanan penuh atau hampir penuh. Jawaban baru bisa hilang saat halaman ditutup. Pastikan semua log terkirim atau ekspor CSV sekarang, lalu hapus log."
      );
    } else if (usage.ratio >= STORAGE_WARNING_RATIO) {
      notice = h(
        "p",
        { class: "notice notice--warning" },
        "⚠ Penyimpanan hampir penuh. Pastikan semua log terkirim atau ekspor CSV, lalu hapus log (lihat README, bagian “Jika muncul peringatan kapasitas”)."
      );
    }

    return h(
      "div",
      { class: "capacity" },
      h("label", { for: "capacity-bar", class: "field-label" }, `Penyimpanan terpakai: sekitar ${percent}%`),
      h("progress", { id: "capacity-bar", max: 100, value: percent, class: percent >= STORAGE_WARNING_RATIO * 100 ? "is-warning" : "" }),
      rowsLeft !== null ? h("p", { class: "muted" }, `Perkiraan: masih cukup untuk sekitar ${rowsLeft.toLocaleString("id-ID")} jawaban lagi.`) : null,
      notice
    );
  }

  function senderBlock() {
    const s = getSenderStatus();
    if (s.blockedReason) {
      return h(
        "div",
        { class: "sender", id: "sender-status" },
        h("h3", {}, "Pengiriman ke server"),
        h(
          "p",
          { class: "notice notice--warning" },
          `⚠ Pengiriman dimatikan paksa: ${s.blockedReason}. Jawaban tetap tersimpan di perangkat ini, tetapi tidak ` +
            "akan pernah dikirim ke server, karena persetujuan atas teks sementara tidak sah untuk data penelitian."
        )
      );
    }
    if (!s.configured) {
      return h(
        "div",
        { class: "sender", id: "sender-status" },
        h("h3", {}, "Pengiriman ke server"),
        h(
          "p",
          {},
          s.enabled
            ? "⚠ Pengiriman diaktifkan tetapi URL server masih kosong. Log hanya tersimpan di perangkat ini."
            : "Nonaktif. Log hanya tersimpan di perangkat ini. Cara mengaktifkan ada di README bagian Pengiriman log."
        )
      );
    }
    return h(
      "div",
      { class: "sender", id: "sender-status" },
      h("h3", {}, "Pengiriman ke server"),
      h(
        "p",
        {},
        h("strong", {}, s.unsentRows === 0 ? "✓ Semua jawaban sudah terkirim." : `Belum terkirim: ${s.unsentRows} jawaban.`)
      ),
      s.lastSuccessAt ? h("p", { class: "muted" }, `Terakhir berhasil: ${formatTime(s.lastSuccessAt)}`) : null,
      s.lastError ? h("p", { class: "notice notice--error", role: "status" }, `✗ ${s.lastError}`) : null,
      h(
        "button",
        { type: "button", class: "button", disabled: s.sending || s.unsentRows === 0, onClick: () => flushLog() },
        s.sending ? "Mengirim…" : "Kirim sekarang"
      )
    );
  }

  function logCard() {
    const log = getLogStatus();
    const sender = getSenderStatus();

    const exportInfo = log.lastExportAt
      ? `Terakhir diekspor: ${formatTime(log.lastExportAt)} · ${log.rowsSinceExport} jawaban baru sejak itu.`
      : "Belum pernah diekspor dari perangkat ini.";

    const deleteDetails = [`${log.totalRows} jawaban di perangkat ini akan dihapus permanen.`];
    const sending = sender.configured && !sender.blockedReason;
    if (sending && sender.unsentRows) deleteDetails.push(`⚠ ${sender.unsentRows} jawaban BELUM terkirim ke server.`);
    if (log.rowsSinceExport) deleteDetails.push(`⚠ ${log.rowsSinceExport} jawaban belum pernah diekspor ke CSV.`);
    if ((!sending || !sender.unsentRows) && !log.rowsSinceExport) {
      deleteDetails.push("Semua jawaban sudah terkirim atau sudah diekspor.");
    }
    deleteDetails.push("Progres pemain tidak ikut terhapus.");

    return h(
      "section",
      { class: "card", "aria-labelledby": "log-title" },
      h("h2", { id: "log-title" }, "Riwayat jawaban"),
      messageFor("log"),
      h("p", {}, `${log.totalRows} jawaban tercatat di perangkat ini.`),
      log.unsavedRows
        ? h("p", { class: "notice notice--error" }, `✗ ${log.unsavedRows} jawaban tidak bisa disimpan karena penyimpanan penuh dan akan hilang saat halaman ditutup.`)
        : null,
      capacityBlock(log),
      senderBlock(),
      h(
        "div",
        { class: "export" },
        h("h3", {}, "Ekspor CSV"),
        h("p", { class: "muted" }, "Cadangan jika pengiriman ke server tidak bisa dipakai, misalnya saat jaringan mati."),
        h("p", {}, exportInfo),
        h(
          "button",
          {
            type: "button",
            class: "button button--primary button--block",
            disabled: log.totalRows === 0,
            onClick: () => {
              downloadText(logToCsv(), csvFilename(), "text/csv;charset=utf-8");
              markExported();
              setMessage("log", "success", `✓ File CSV berisi ${log.totalRows} jawaban sudah diunduh. Periksa folder Unduhan.`);
            },
          },
          "Ekspor CSV"
        )
      ),
      h(
        "div",
        { class: "delete-log" },
        h("h3", {}, "Hapus log"),
        log.totalRows === 0
          ? h("p", { class: "muted" }, "Tidak ada log untuk dihapus.")
          : confirmFlow({
              openLabel: "Hapus log…",
              title: "Hapus seluruh riwayat jawaban?",
              details: deleteDetails,
              confirmLabel: "Hapus log permanen",
              requireWord: DELETE_CONFIRM_WORD,
              onConfirm: () => {
                clearLog();
                setMessage("log", "success", "✓ Riwayat jawaban di perangkat ini sudah dihapus.");
              },
            })
      )
    );
  }

  // --- Content -------------------------------------------------------------------------

  function contentCard() {
    const { contentRevision } = app.content;
    const isDraft = /^draft/i.test(contentRevision);
    return h(
      "section",
      { class: "card", "aria-labelledby": "content-title" },
      h("h2", { id: "content-title" }, "Materi"),
      h("p", {}, "Revisi materi: ", h("strong", {}, contentRevision)),
      // The build every log row records; all research rows must share one (D-115).
      h("p", {}, "Build: ", h("code", {}, getBuildId().slice(0, 12))),
      isDraft
        ? h("p", { class: "notice notice--error" }, "✗ DRAF — nomor bab belum diverifikasi terhadap buku. Jangan kirim ke validator ahli.")
        : null,
      // No links to the content check or the preview: both show all material.
      // The team opens them by address (MULAI-DI-SINI.md), D-85.
      h("p", {}, h("a", { href: "#/about" }, "Tentang aplikasi")),
      h("p", { class: "muted" }, "Halaman pemeriksaan konten dan pratinjau untuk tim dibuka lewat alamatnya; lihat MULAI-DI-SINI.md.")
    );
  }

  function render() {
    const scrollY = window.scrollY;
    const mode = currentMode(app);
    // Built through h() so that a null child is skipped instead of becoming the text "null".
    const screen = h(
      "div",
      {},
      backLink("#/", "Peta"),
      menuBar(app, "settings"),
      h("h1", { tabindex: "-1" }, "Pengaturan"),
      isStorageAvailable()
        ? null
        : h("p", { class: "notice notice--warning" }, "⚠ Penyimpanan browser tidak tersedia. Progres dan log tidak akan tersimpan setelah halaman ditutup."),
      modeCard(mode),
      resetCard(),
      exhibitionCard(mode),
      furiganaCard(),
      // Exhibition mode records nothing, so it has no consent or participant code (D-112).
      asksConsent(mode) ? consentCard() : null,
      asksConsent(mode) ? participantCard(mode) : null,
      logCard(),
      contentCard()
    );
    root.replaceChildren(...screen.childNodes);
    window.scrollTo(0, scrollY);
  }

  // Live sender status while this screen is open.
  const unsubscribe = subscribeSenderStatus(() => {
    if (!root.isConnected) {
      unsubscribe();
      return;
    }
    root.querySelector("#sender-status")?.replaceWith(senderBlock());
  });

  render();
  return root;
}
