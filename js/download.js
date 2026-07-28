// js/download.js — PDF & ZIP download for novel chapters
(function () {
  'use strict';

  const JSPDF_CDN = 'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js';
  const JSZIP_CDN = 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js';

  let jsPDF = null;
  let JSZip = null;
  let librariesLoaded = false;

  // --- Library loading ---

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="' + url + '"]');
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureLibraries() {
    if (librariesLoaded) return true;
    try {
      await loadScript(JSPDF_CDN);
      await loadScript(JSZIP_CDN);
      jsPDF = window.jspdf.jsPDF;
      JSZip = window.JSZip;
      librariesLoaded = true;
      return true;
    } catch (e) {
      console.error('Failed to load PDF/ZIP libraries:', e);
      showToast('Failed to load download libraries. Please check your connection.', 'error');
      return false;
    }
  }

  // --- Utilities ---

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').substring(0, 80);
  }

  function showToast(message, type) {
    const existing = document.querySelector('.download-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'download-toast ' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- PDF generation ---

  function createChapterPDF(chapter, novelTitle) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const titleLines = doc.splitTextToSize(chapter.title, maxWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 7 + 4;

    // Novel name subtitle
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(novelTitle, margin, y);
    y += 8;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Chapter content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);

    const content = chapter.content || '';
    const paragraphs = content.split('\n').filter(p => p.trim());

    for (const para of paragraphs) {
      const lines = doc.splitTextToSize(para.trim(), maxWidth);
      for (const line of lines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 6;
      }
      y += 4; // paragraph spacing
    }

    return doc;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // --- Public API ---

  window.DownloadManager = {
    init: function () {
      this.bindModalEvents();
    },

    bindModalEvents: function () {
      const modal = document.getElementById('download-modal');
      const overlay = document.getElementById('download-overlay');
      const closeBtn = document.getElementById('download-close');
      const cancelBtn = document.getElementById('download-cancel');
      const confirmBtn = document.getElementById('download-confirm');
      const formatRadios = document.querySelectorAll('input[name="dl-format"]');
      const individualOpts = document.getElementById('dl-individual-opts');

      if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
      if (overlay) overlay.addEventListener('click', () => this.closeModal());

      // Show/hide individual options based on format selection
      formatRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (individualOpts) {
            individualOpts.classList.toggle('hidden', radio.value !== 'individual');
          }
        });
      });

      // Confirm download
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => this.executeBulkDownload());
      }

      // Bulk download button
      const bulkBtn = document.getElementById('bulk-download-btn');
      if (bulkBtn) {
        bulkBtn.addEventListener('click', () => this.openModal());
      }
    },

    openModal: function () {
      const modal = document.getElementById('download-modal');
      const overlay = document.getElementById('download-overlay');
      if (modal) modal.classList.add('open');
      if (overlay) overlay.classList.remove('hidden');

      // Set min/max for chapter range inputs
      const startInput = document.getElementById('dl-chapter-start');
      const endInput = document.getElementById('dl-chapter-end');
      if (startInput && window._downloadChapters) {
        startInput.min = 1;
        startInput.max = window._downloadChapters.length;
        startInput.value = 1;
      }
      if (endInput && window._downloadChapters) {
        endInput.min = 1;
        endInput.max = window._downloadChapters.length;
        endInput.value = window._downloadChapters.length;
      }
    },

    closeModal: function () {
      const modal = document.getElementById('download-modal');
      const overlay = document.getElementById('download-overlay');
      if (modal) modal.classList.remove('open');
      if (overlay) overlay.classList.add('hidden');
      this.setLoading(false);
    },

    setLoading: function (loading) {
      const confirmBtn = document.getElementById('download-confirm');
      const spinner = document.querySelector('.dl-btn-spinner');
      if (confirmBtn) {
        confirmBtn.disabled = loading;
        confirmBtn.textContent = loading ? '' : 'Download';
        if (spinner) spinner.classList.toggle('hidden', !loading);
        if (loading) {
          confirmBtn.innerHTML = '<div class="dl-btn-spinner"></div> Generating...';
        }
      }
    },

    // --- Per-chapter download ---
    async downloadChapter(chapterId, novelTitle, chapters) {
      const ok = await ensureLibraries();
      if (!ok) return;

      const chapter = chapters.find(c => c.id === chapterId);
      if (!chapter) {
        showToast('Chapter not found', 'error');
        return;
      }

      if (!chapter.content) {
        showToast('Chapter content not available for download', 'error');
        return;
      }

      try {
        const doc = createChapterPDF(chapter, novelTitle);
        const filename = sanitizeFilename(chapter.title) + '.pdf';
        doc.save(filename);
        showToast('Downloaded: ' + chapter.title, 'success');
      } catch (e) {
        console.error('PDF generation error:', e);
        showToast('Failed to generate PDF', 'error');
      }
    },

    // --- Bulk download ---
    async executeBulkDownload() {
      const ok = await ensureLibraries();
      if (!ok) return;

      const chapters = window._downloadChapters;
      const novelTitle = window._downloadNovelTitle || 'Novel';
      if (!chapters || chapters.length === 0) {
        showToast('No chapters available', 'error');
        return;
      }

      const startEl = document.getElementById('dl-chapter-start');
      const endEl = document.getElementById('dl-chapter-end');
      const formatEl = document.querySelector('input[name="dl-format"]:checked');
      const deliveryEl = document.querySelector('input[name="dl-delivery"]:checked');

      const start = parseInt(startEl.value) || 1;
      const end = parseInt(endEl.value) || chapters.length;
      const format = formatEl ? formatEl.value : 'single';
      const delivery = deliveryEl ? deliveryEl.value : 'individual';

      // Filter chapters in range
      const selected = chapters.filter(ch => ch.id >= start && ch.id <= end);
      const withContent = selected.filter(ch => ch.content);

      if (withContent.length === 0) {
        showToast('No downloadable chapters in selected range', 'error');
        return;
      }

      this.setLoading(true);

      try {
        if (format === 'single') {
          // Single combined PDF
          await this.downloadCombinedPDF(withContent, novelTitle, start, end);
        } else {
          // Individual chapter PDFs
          if (delivery === 'zip') {
            await this.downloadAsZip(withContent, novelTitle);
          } else {
            this.downloadIndividually(withContent, novelTitle);
          }
        }
        showToast('Download complete!', 'success');
        this.closeModal();
      } catch (e) {
        console.error('Bulk download error:', e);
        showToast('Download failed: ' + e.message, 'error');
      } finally {
        this.setLoading(false);
      }
    },

    async downloadCombinedPDF(chapters, novelTitle, start, end) {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;

      // Title page
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      const titleLines = doc.splitTextToSize(novelTitle, maxWidth);
      const titleY = (pageHeight - titleLines.length * 10) / 2;
      doc.text(titleLines, pageWidth / 2, titleY, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(120, 120, 120);
      doc.text('Chapters ' + start + ' - ' + end, pageWidth / 2, titleY + titleLines.length * 10 + 10, { align: 'center' });
      doc.text('Generated by Lumina Script', pageWidth / 2, titleY + titleLines.length * 10 + 20, { align: 'center' });

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        doc.addPage();

        let y = margin;

        // Chapter title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 30, 30);
        const chTitleLines = doc.splitTextToSize(chapter.title, maxWidth);
        doc.text(chTitleLines, margin, y);
        y += chTitleLines.length * 7 + 8;

        // Separator
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // Content
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        const paragraphs = (chapter.content || '').split('\n').filter(p => p.trim());

        for (const para of paragraphs) {
          const lines = doc.splitTextToSize(para.trim(), maxWidth);
          for (const line of lines) {
            if (y > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
            doc.text(line, margin, y);
            y += 6;
          }
          y += 4;
        }
      }

      const filename = sanitizeFilename(novelTitle) + '_chapters_' + start + '-' + end + '.pdf';
      doc.save(filename);
    },

    async downloadAsZip(chapters, novelTitle) {
      const zip = new JSZip();
      const folder = zip.folder(sanitizeFilename(novelTitle));

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const doc = createChapterPDF(chapter, novelTitle);
        const pdfBlob = doc.output('blob');
        const filename = sanitizeFilename(chapter.title) + '.pdf';
        folder.file(filename, pdfBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = sanitizeFilename(novelTitle) + '_chapters.zip';
      downloadBlob(zipBlob, zipFilename);
    },

    downloadIndividually(chapters, novelTitle) {
      // Stagger downloads to avoid browser blocking
      let delay = 0;
      for (const chapter of chapters) {
        setTimeout(() => {
          const doc = createChapterPDF(chapter, novelTitle);
          const filename = sanitizeFilename(chapter.title) + '.pdf';
          doc.save(filename);
        }, delay);
        delay += 500;
      }
    }
  };
})();
