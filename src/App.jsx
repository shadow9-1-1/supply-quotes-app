import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, Building2, Download, FileSpreadsheet, FileText, Home, Plus,
  Receipt, Save, Trash2, WalletCards, X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { MAIN_COMPANIES, TEMPLATE_META } from './data/companies';

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const money = (value) => Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const toNumber = (value) => Number(value || 0);
const roundHalfUp = (value) => {
  const number = toNumber(value);
  return number >= 0
    ? Math.floor(number + 0.5 + Number.EPSILON)
    : Math.ceil(number - 0.5 - Number.EPSILON);
};
const cleanFileName = (value) => String(value || 'عرض سعر').replace(/[\\/:*?"<>|]/g, '-').trim();
const effectiveCoverage = (item, output, company) => {
  const baseCoverage = toNumber(item.baseCoverage);
  if (output.id === company.primary.id) return baseCoverage;
  return +(baseCoverage + toNumber(item.coverageRates?.[output.id])).toFixed(2);
};
const outputPrice = (item, output, company) => {
  const mainPrice = roundHalfUp(item.sellPrice);
  if (output.id === company.primary.id) return mainPrice;
  const buyPrice = toNumber(item.buyPrice);
  const coverage = effectiveCoverage(item, output, company);
  if (buyPrice) return roundHalfUp(buyPrice * (1 + coverage / 100));
  return roundHalfUp(mainPrice * (1 + toNumber(item.coverageRates?.[output.id]) / 100));
};
const salesValue = (item, output, company) => roundHalfUp(
  toNumber(item.qty) * outputPrice(item, output, company)
);
const outputTotal = (items, output, company) => items.reduce(
  (sum, item) => sum + salesValue(item, output, company), 0
);

const shuffleIds = (items) => {
  const ids = items.map((item) => item.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[randomIndex]] = [ids[randomIndex], ids[index]];
  }
  return ids;
};

const rotateIds = (ids, offset) => {
  if (ids.length < 2) return [...ids];
  const normalizedOffset = ((offset % ids.length) + ids.length) % ids.length;
  return [...ids.slice(normalizedOffset), ...ids.slice(0, normalizedOffset)];
};

const sameIdOrder = (left, right) => left.length === right.length
  && left.every((id, index) => id === right[index]);

const makeSubsidiaryRowOrders = (items, subsidiaries) => {
  const originalIds = items.map((item) => item.id);
  if (originalIds.length < 2) {
    return Object.fromEntries(subsidiaries.map((output) => [output.id, [...originalIds]]));
  }

  let baseOrder = shuffleIds(items);
  if (sameIdOrder(baseOrder, originalIds)) baseOrder = rotateIds(baseOrder, 1);

  return Object.fromEntries(subsidiaries.map((output, index) => [
    output.id,
    rotateIds(baseOrder, index),
  ]));
};

const makeSingleSubsidiaryRowOrder = (items) => {
  const originalIds = items.map((item) => item.id);
  if (originalIds.length < 2) return originalIds;
  let shuffled = shuffleIds(items);
  if (sameIdOrder(shuffled, originalIds)) shuffled = rotateIds(shuffled, 1);
  return shuffled;
};

const waitForReactPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

const isAppleMobileBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const applyArabicExportFixes = (root) => {
  if (!root) return;
  root.setAttribute('dir', 'rtl');
  root.setAttribute('lang', 'ar');
  root.style.direction = 'rtl';

  root.querySelectorAll('*').forEach((node) => {
    if (!node.style) return;
    node.style.letterSpacing = 'normal';
    node.style.wordSpacing = 'normal';
    node.style.fontKerning = 'normal';
  });

  root.querySelectorAll('.rtl-text, .quote-title, .client-block, .intro-lines, .exact-terms, th, td').forEach((node) => {
    node.setAttribute('dir', 'rtl');
    node.setAttribute('lang', 'ar');
    if (!node.style) return;
    node.style.direction = 'rtl';
    node.style.unicodeBidi = 'isolate';
  });
};

const canvasHasContent = (canvas) => {
  try {
    const probe = document.createElement('canvas');
    probe.width = 40;
    probe.height = 55;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (!context) return true;
    context.drawImage(canvas, 0, 0, probe.width, probe.height);
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
    let nonWhiteSamples = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245) {
        nonWhiteSamples += 1;
        if (nonWhiteSamples > 8) return true;
      }
    }
    return false;
  } catch {
    // A browser may protect pixel reads even though the image itself is valid.
    return true;
  }
};

function makeEmptyItem(company) {
  return {
    id: uid(), name: '', unit: '', qty: '', buyPrice: '', baseCoverage: '', sellPrice: '', notes: '',
    coverageRates: Object.fromEntries(company.coverages.map((coverage) => [coverage.id, ''])),
  };
}

function normalizeQuote(source, company) {
  const primaryMeta = TEMPLATE_META[company.primary.template];
  const quote = source || {};
  const items = (quote.items?.length ? quote.items : [makeEmptyItem(company)]).map((item) => {
    const legacyBase = item.baseCoverage ?? (toNumber(item.coverage) + toNumber(item['pro' + 'fit']) || '');
    const buy = toNumber(item.buyPrice);
    const derivedCoverage = buy && item.sellPrice !== '' && item.sellPrice != null
      ? +((roundHalfUp(item.sellPrice) / buy - 1) * 100).toFixed(2)
      : '';
    const baseCoverage = legacyBase !== '' ? legacyBase : derivedCoverage;
    const sellPrice = item.sellPrice !== '' && item.sellPrice != null
      ? roundHalfUp(item.sellPrice)
      : (buy ? roundHalfUp(buy * (1 + toNumber(baseCoverage) / 100)) : '');
    return {
      id: item.id || uid(),
      name: item.name || '', unit: item.unit || '', qty: item.qty ?? '',
      buyPrice: item.buyPrice ?? '', baseCoverage, sellPrice, notes: item.notes || '',
      coverageRates: Object.fromEntries(company.coverages.map((coverage) => [
        coverage.id,
        item.coverageRates?.[coverage.id] ?? quote.coverageRates?.[coverage.id] ?? '',
      ])),
    };
  });
  return {
    id: quote.id || uid(),
    mainCompanyId: company.id,
    branchId: company.primary.id,
    fileName: quote.fileName || `عرض سعر ${company.name} - ${today()}`,
    client: quote.client || '', attention: quote.attention || '', date: quote.date || '', subject: quote.subject || '',
    notes: quote.notes || '', showTotal: !!quote.showTotal,
    introLines: Array.isArray(quote.introLines) ? quote.introLines : [...(primaryMeta.defaultIntroLines || [])],
    termsByTemplate: Object.fromEntries(company.outputs.map((output) => [
      output.template,
      Array.isArray(quote.termsByTemplate?.[output.template])
        ? quote.termsByTemplate[output.template]
        : (output.id === company.primary.id && Array.isArray(quote.terms)
          ? quote.terms
          : [...(TEMPLATE_META[output.template]?.defaultTerms || [])]),
    ])),
    items,
  };
}

function App() {
  const [screen, setScreen] = useState('home');
  const [mainCompany, setMainCompany] = useState(null);
  const [quotes, setQuotes] = useState(() => load('quotes', []));
  const [expenses, setExpenses] = useState(() => load('expenses', []));
  const [otherIncome, setOtherIncome] = useState(() => load('otherIncome', []));
  const [editingQuote, setEditingQuote] = useState(null);
  const [modal, setModal] = useState(null);

  const persist = (key, value, setter) => {
    setter(value);
    localStorage.setItem(key, JSON.stringify(value));
  };

  const openCompany = (company, quote = null) => {
    setMainCompany(company);
    setEditingQuote(quote);
    setScreen('quote');
  };

  const openSavedQuote = (quote) => {
    const company = MAIN_COMPANIES[quote.mainCompanyId];
    if (company) openCompany(company, quote);
  };

  return (
    <div className="app-shell">
      <Sidebar screen={screen} setScreen={setScreen} />
      <main className="main-content">
        {screen === 'home' && <HomeScreen onChoose={(company) => openCompany(company)} />}
        {screen === 'quote' && mainCompany && (
          <QuoteEditor
            key={`${mainCompany.id}-${editingQuote?.id || 'new'}`}
            company={mainCompany}
            initialQuote={editingQuote}
            onBack={() => setScreen('home')}
            onSave={(quote) => {
              const exists = quotes.some((saved) => saved.id === quote.id);
              const next = exists ? quotes.map((saved) => saved.id === quote.id ? quote : saved) : [quote, ...quotes];
              persist('quotes', next, setQuotes);
              setEditingQuote(quote);
            }}
          />
        )}
        {screen === 'dashboard' && <Dashboard quotes={quotes} expenses={expenses} otherIncome={otherIncome} onAddExpense={() => setModal('expense')} onAddIncome={() => setModal('income')} />}
        {screen === 'saved' && <SavedQuotes quotes={quotes} onOpen={openSavedQuote} onDelete={(id) => persist('quotes', quotes.filter((quote) => quote.id !== id), setQuotes)} />}
        {screen === 'transactions' && <Transactions expenses={expenses} income={otherIncome} onAddExpense={() => setModal('expense')} onAddIncome={() => setModal('income')} />}
      </main>
      {modal && <TransactionModal type={modal} onClose={() => setModal(null)} onSave={(entry) => {
        if (modal === 'expense') persist('expenses', [entry, ...expenses], setExpenses);
        else persist('otherIncome', [entry, ...otherIncome], setOtherIncome);
        setModal(null);
      }} />}
    </div>
  );
}

function Sidebar({ screen, setScreen }) {
  const items = [
    ['home', Home, 'الرئيسية'],
    ['dashboard', BarChart3, 'لوحة التحكم'],
    ['saved', FileText, 'العروض المحفوظة'],
    ['transactions', WalletCards, 'المصاريف والإيرادات'],
  ];
  return <aside className="sidebar">
    <div className="brand"><span>Q</span><div><b>QuoteFlow</b><small>إدارة عروض الأسعار</small></div></div>
    <nav>{items.map(([id, Icon, label]) => <button key={id} className={screen === id ? 'active' : ''} onClick={() => setScreen(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
  </aside>;
}

function HomeScreen({ onChoose }) {
  return <section className="page center-page">
    <div className="hero-copy"><span className="eyebrow">نظام عروض الأسعار والمصروفات</span><h1>اختر الشركة الرئيسية</h1><p>أدخل البيانات مرة واحدة، وحدد تغطيات الشركات التابعة، ثم صدّر الملفات كاملة.</p></div>
    <div className="company-grid main-company-grid">
      {Object.values(MAIN_COMPANIES).map((company) => <button key={company.id} className="company-card" style={{ '--company': company.color, '--accent': company.accent }} onClick={() => onChoose(company)}>
        <div className="company-icon"><Building2 size={34}/></div><h2>{company.name}</h2><p>{company.arabicName}</p><span>فتح ملف الشركة</span>
      </button>)}
    </div>
  </section>;
}

function QuoteEditor({ company, initialQuote, onBack, onSave }) {
  const primaryOutput = company.primary;
  const [quote, setQuote] = useState(() => normalizeQuote(initialQuote, company));
  const [selectedOutputId, setSelectedOutputId] = useState(primaryOutput.id);
  const [status, setStatus] = useState('');
  const [pdfChoiceOpen, setPdfChoiceOpen] = useState(false);
  const [exportRowOrders, setExportRowOrders] = useState({});
  const exportRefs = useRef({});

  const selectedOutput = company.outputs.find((output) => output.id === selectedOutputId) || primaryOutput;
  const selectedMeta = TEMPLATE_META[selectedOutput.template];
  const primaryTotal = useMemo(() => outputTotal(quote.items, primaryOutput, company), [quote.items, company, primaryOutput]);
  const purchaseTotal = useMemo(() => quote.items.reduce((sum, item) => sum + toNumber(item.qty) * toNumber(item.buyPrice), 0), [quote.items]);
  const coverageTotals = useMemo(() => Object.fromEntries(company.coverages.map((coverage) => [coverage.id, outputTotal(quote.items, coverage, company)])), [quote.items, company]);

  useEffect(() => {
    setQuote((current) => ({
      ...current,
      termsByTemplate: Object.fromEntries(company.outputs.map((output) => [
        output.template,
        Array.isArray(current.termsByTemplate?.[output.template])
          ? current.termsByTemplate[output.template]
          : [...(TEMPLATE_META[output.template]?.defaultTerms || [])],
      ])),
    }));
  }, [company]);

  const update = (field, value) => setQuote((current) => ({ ...current, [field]: value }));
  const updateIntroLine = (index, value) => setQuote((current) => ({ ...current, introLines: current.introLines.map((line, i) => i === index ? value : line) }));
  const addIntroLine = () => setQuote((current) => ({ ...current, introLines: [...current.introLines, ''] }));
  const removeIntroLine = (index) => setQuote((current) => ({ ...current, introLines: current.introLines.filter((_, i) => i !== index) }));
  const currentTerms = quote.termsByTemplate[selectedOutput.template] || [];
  const updateTerm = (index, value) => setQuote((current) => ({
    ...current,
    termsByTemplate: {
      ...current.termsByTemplate,
      [selectedOutput.template]: current.termsByTemplate[selectedOutput.template].map((term, i) => i === index ? value : term),
    },
  }));
  const addTerm = () => setQuote((current) => ({
    ...current,
    termsByTemplate: {
      ...current.termsByTemplate,
      [selectedOutput.template]: [...(current.termsByTemplate[selectedOutput.template] || []), ''],
    },
  }));
  const removeTerm = (index) => setQuote((current) => ({
    ...current,
    termsByTemplate: {
      ...current.termsByTemplate,
      [selectedOutput.template]: current.termsByTemplate[selectedOutput.template].filter((_, i) => i !== index),
    },
  }));

  const updateItem = (id, field, value) => setQuote((current) => ({
    ...current,
    items: current.items.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, [field]: value };
      if (field === 'buyPrice' || field === 'baseCoverage') {
        const buy = toNumber(next.buyPrice);
        next.sellPrice = buy ? roundHalfUp(buy * (1 + toNumber(next.baseCoverage) / 100)) : '';
      }
      if (field === 'sellPrice') {
        const buy = toNumber(next.buyPrice);
        next.baseCoverage = buy && value !== '' ? +((toNumber(value) / buy - 1) * 100).toFixed(2) : next.baseCoverage;
      }
      return next;
    }),
  }));

  const updateCoverage = (id, coverageId, value) => setQuote((current) => ({
    ...current,
    items: current.items.map((item) => item.id === id ? {
      ...item,
      coverageRates: { ...item.coverageRates, [coverageId]: value },
    } : item),
  }));

  const save = () => {
    const saved = {
      ...quote,
      branchId: company.primary.id,
      total: primaryTotal,
      purchaseTotal,
      coverageTotals,
      updatedAt: new Date().toISOString(),
    };
    onSave(saved);
    setStatus('تم الحفظ');
    setTimeout(() => setStatus(''), 1800);
  };

  const waitForImages = async (element) => {
    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    })));
    if (document.fonts?.ready) await document.fonts.ready;
  };

  const createPdf = async (output, mode) => {
    const exportKey = `${mode}-${output.id}`;
    const element = exportRefs.current[exportKey];
    if (!element) throw new Error(`Missing export page for ${output.name}`);
    await waitForImages(element);

    const appleMobile = isAppleMobileBrowser();
    const capture = (foreignObjectRendering) => html2canvas(element, {
      scale: appleMobile ? 2 : 2.2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      foreignObjectRendering,
      imageTimeout: 20000,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1200,
      windowHeight: 1600,
      onclone: (clonedDocument) => {
        const clonedElement = clonedDocument.querySelector(`[data-export-key="${exportKey}"]`);
        applyArabicExportFixes(clonedElement);
      },
    });

    let canvas;
    try {
      canvas = await capture(appleMobile);
      if (!canvasHasContent(canvas)) throw new Error('Blank mobile PDF canvas');
    } catch (captureError) {
      console.warn('Primary PDF capture failed, retrying with the standard renderer.', captureError);
      canvas = await capture(false);
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - width) / 2, 0, width, height, undefined, 'FAST');
    const modeName = mode === 'personal' ? 'نسخة شخصية' : 'نسخة عرض السعر';
    pdf.save(`${cleanFileName(quote.fileName)} - ${cleanFileName(output.name)} - ${modeName}.pdf`);
  };

  const downloadAllPDFs = async (mode) => {
    setPdfChoiceOpen(false);
    const outputsToDownload = mode === 'personal' ? [primaryOutput] : company.outputs;
    try {
      if (mode === 'quote') {
        setExportRowOrders(makeSubsidiaryRowOrders(quote.items, company.coverages));
        await waitForReactPaint();
      } else {
        setExportRowOrders({});
        await waitForReactPaint();
      }
      for (let index = 0; index < outputsToDownload.length; index += 1) {
        const output = outputsToDownload[index];
        setStatus(`جاري إنشاء PDF ${index + 1} من ${outputsToDownload.length}: ${output.name}`);
        await createPdf(output, mode);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      setStatus(outputsToDownload.length === 1 ? 'تم تحميل ملف PDF الشخصي' : `تم تحميل ${outputsToDownload.length} ملفات PDF`);
    } catch (error) {
      console.error(error);
      setStatus('تعذر إنشاء ملفات PDF');
    }
    setTimeout(() => setStatus(''), 2500);
  };

  const downloadSelectedPDF = async () => {
    try {
      if (selectedOutput.id !== primaryOutput.id) {
        setExportRowOrders((current) => ({
          ...current,
          [selectedOutput.id]: makeSingleSubsidiaryRowOrder(quote.items),
        }));
      } else {
        setExportRowOrders((current) => {
          const next = { ...current };
          delete next[selectedOutput.id];
          return next;
        });
      }
      await waitForReactPaint();
      setStatus(`جاري إنشاء PDF: ${selectedOutput.name}`);
      await createPdf(selectedOutput, 'quote');
      setStatus(`تم تحميل PDF ${selectedOutput.name}`);
    } catch (error) {
      console.error(error);
      setStatus(`تعذر إنشاء PDF ${selectedOutput.name}`);
    }
    setTimeout(() => setStatus(''), 2500);
  };

  const makeExcelSheet = (output) => {
    const rows = quote.items.map((item) => {
      const price = outputPrice(item, output, company);
      return [
        item.name || '',
        toNumber(item.qty),
        price,
        salesValue(item, output, company),
      ];
    });
    const headers = ['الصنف', 'الكمية', 'سعر بيع القطعة', 'قيمة المبيعات'];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 42 }, { wch: 14 }, { wch: 20 }, { wch: 20 }];
    ws['!views'] = [{ rightToLeft: true }];
    return ws;
  };

  const downloadMainExcel = async () => {
    try {
      setStatus(`جاري إنشاء Excel: ${primaryOutput.name}`);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, makeExcelSheet(primaryOutput), 'الجدول');
      workbook.Workbook = workbook.Workbook || {};
      workbook.Workbook.Views = [{ RTL: true }];
      XLSX.writeFile(workbook, `${cleanFileName(quote.fileName)} - ${cleanFileName(primaryOutput.name)}.xlsx`, { compression: true });
      setStatus('تم تحميل ملف Excel للشركة الرئيسية');
    } catch (error) {
      console.error(error);
      setStatus('تعذر إنشاء ملف Excel');
    }
    setTimeout(() => setStatus(''), 2500);
  };

  return <section className="page quote-page">
    <div className="coverage-switcher-card">
      <div><span className="eyebrow">ملف واحد لكل المجموعة</span><h2>{company.name}</h2><p>أدخل نسبة البيع، ثم أضف نسبة كل شركة تابعة. السعر النهائي لكل شركة تابعة يُحسب من مجموع النسبتين.</p></div>
      <div className="coverage-buttons">
        {company.outputs.map((output) => <button
          key={output.id}
          className={selectedOutputId === output.id ? 'active' : ''}
          onClick={() => setSelectedOutputId(output.id)}
        >{output.name}</button>)}
      </div>
      <small>اختار اسم الشركة لتبديل المعاينة والنصوص الخاصة بها. نسخة عرض السعر فقط تنشئ ثلاث ملفات تلقائياً.</small>
    </div>

    <div className="editor-layout">
      <div className="form-panel">
        <div className="editing-output"><span>تعديل ومعاينة:</span><strong>{selectedOutput.name}</strong></div>
        <h3>بيانات العرض</h3>
        <label>اسم الملف<input value={quote.fileName} onChange={(event) => update('fileName', event.target.value)} /></label>
        <div className="two-cols"><label>اسم العميل<input value={quote.client} onChange={(event) => update('client', event.target.value)} /></label><label>عناية الأستاذ<input value={quote.attention} onChange={(event) => update('attention', event.target.value)} /></label></div>
        <div className="two-cols"><label>التاريخ<input type="date" value={quote.date} onChange={(event) => update('date', event.target.value)} /></label><label>الموضوع<input value={quote.subject} onChange={(event) => update('subject', event.target.value)} /></label></div>
        <label className="check-label"><input type="checkbox" checked={quote.showTotal} onChange={(event) => update('showTotal', event.target.checked)} /> إظهار قيمة المبيعات داخل ملفات PDF</label>

        <div className="items-header"><h3>نصوص أعلى الجدول</h3><button onClick={addIntroLine}><Plus size={17}/> إضافة سطر</button></div>
        <div className="term-editor-list">{quote.introLines.map((line, index) => <div className="term-editor" key={`intro-${index}`}><textarea value={line} onChange={(event) => updateIntroLine(index, event.target.value)} placeholder="اكتب أي كلام يظهر فوق الجدول"/><button className="icon-danger" onClick={() => removeIntroLine(index)}><Trash2 size={16}/></button></div>)}</div>
        <label>ملاحظات إضافية للـPDF (اختياري)<textarea value={quote.notes} onChange={(event) => update('notes', event.target.value)} placeholder="أي كلام إضافي يظهر أسفل الجدول" /></label>

        <div className="items-header"><h3>النصوص والشروط الخاصة بـ {selectedOutput.name}</h3><button onClick={addTerm}><Plus size={17}/> إضافة سطر</button></div>
        <div className="term-editor-list">{currentTerms.map((term, index) => <div className="term-editor" key={`${selectedOutput.id}-${index}`}><textarea value={term} onChange={(event) => updateTerm(index, event.target.value)} placeholder="اكتب السطر كما سيظهر في PDF"/><button className="icon-danger" onClick={() => removeTerm(index)}><Trash2 size={16}/></button></div>)}</div>

        <div className="items-header"><h3>الأصناف</h3><button onClick={() => setQuote((current) => ({ ...current, items: [...current.items, makeEmptyItem(company)] }))}><Plus size={17}/> إضافة صنف</button></div>
        <div className="item-editor-list">
          {quote.items.map((item, index) => <div className="item-editor" key={item.id}>
            <div className="item-title"><b>صنف {index + 1}</b><button className="icon-danger" disabled={quote.items.length === 1} onClick={() => setQuote((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))}><Trash2 size={17}/></button></div>
            <label>اسم الصنف<input value={item.name} onChange={(event) => updateItem(item.id, 'name', event.target.value)} /></label>
            <div className="two-cols"><label>الكمية<input type="number" step="0.01" value={item.qty} onChange={(event) => updateItem(item.id, 'qty', event.target.value)} /></label><label>سعر الشراء<input type="number" step="0.01" value={item.buyPrice} onChange={(event) => updateItem(item.id, 'buyPrice', event.target.value)} /></label></div>
            <div className="three-cols"><label>نسبة البيع %<input type="number" step="0.01" value={item.baseCoverage} onChange={(event) => updateItem(item.id, 'baseCoverage', event.target.value)} /></label><label>سعر البيع الرئيسي<input type="number" step="0.01" value={item.sellPrice} onChange={(event) => updateItem(item.id, 'sellPrice', event.target.value)} onBlur={() => item.sellPrice !== '' && updateItem(item.id, 'sellPrice', roundHalfUp(item.sellPrice))} /></label><label>قيمة المبيعات<input readOnly value={money(salesValue(item, primaryOutput, company))} /></label></div>
            <div className="coverage-rate-grid">
              {company.coverages.map((coverage) => <label className="coverage-rate-card" key={coverage.id}>نسبة التغطية لـ {coverage.name} %
                <input type="number" step="0.01" value={item.coverageRates?.[coverage.id] ?? ''} onChange={(event) => updateCoverage(item.id, coverage.id, event.target.value)} />
                <small>النسبة المستخدمة: {money(effectiveCoverage(item, coverage, company))}% — سعر البيع: {money(outputPrice(item, coverage, company))}</small>
              </label>)}
            </div>
            <label>ملاحظات للـPDF فقط<input value={item.notes} onChange={(event) => updateItem(item.id, 'notes', event.target.value)} /></label>
          </div>)}
        </div>
      </div>

      <PreviewFit>
        <div className={`quote-sheet template-${selectedOutput.template}`}>
          <QuoteTemplate
            meta={selectedMeta}
            company={company}
            output={selectedOutput}
            quote={quote}
            total={selectedOutput.id === primaryOutput.id ? primaryTotal : coverageTotals[selectedOutput.id]}
            isPrimary={selectedOutput.id === primaryOutput.id}
            mode="personal"
          />
        </div>
      </PreviewFit>
    </div>

    <div className="page-toolbar bottom-actions-toolbar">
      <button className="back-btn" onClick={onBack}>رجوع للشركات</button>
      <div className="toolbar-actions">
        <span className="save-status">{status}</span>
        <button className="secondary" onClick={save}><Save size={18}/> حفظ</button>
        <button className="excel-btn" onClick={downloadMainExcel}><FileSpreadsheet size={18}/> تحميل Excel الرئيسي</button>
        <button className="current-company-pdf" onClick={downloadSelectedPDF} title={`تحميل نسخة عرض السعر لشركة ${selectedOutput.name} فقط`}><Download size={18}/> Download {selectedOutput.name}</button>
        <button className="primary" onClick={() => setPdfChoiceOpen(true)}><Download size={18}/> تحميل PDF</button>
      </div>
    </div>

    <div className="export-pages" aria-hidden="true">
      {[
        { mode: 'personal', output: primaryOutput },
        ...company.outputs.map((output) => ({ mode: 'quote', output })),
      ].map(({ mode, output }) => <div
        key={`${mode}-${output.id}`}
        className={`quote-sheet template-${output.template}`}
        data-export-key={`${mode}-${output.id}`}
        dir="rtl"
        lang="ar"
        ref={(element) => { exportRefs.current[`${mode}-${output.id}`] = element; }}
      >
        <QuoteTemplate
          meta={TEMPLATE_META[output.template]}
          company={company}
          output={output}
          quote={quote}
          total={output.id === primaryOutput.id ? primaryTotal : coverageTotals[output.id]}
          isPrimary={output.id === primaryOutput.id}
          mode={mode}
          rowOrder={mode === 'quote' && output.id !== primaryOutput.id ? exportRowOrders[output.id] : null}
        />
      </div>)}
    </div>

    {pdfChoiceOpen && <div className="modal-backdrop" onClick={() => setPdfChoiceOpen(false)}><div className="modal pdf-choice-modal" onClick={(event) => event.stopPropagation()}>
      <div className="modal-head"><div><h3>اختار نوع ملف PDF</h3><p>النسخة الشخصية للشركة الرئيسية فقط، وعرض السعر يشمل الشركات الثلاث.</p></div><button onClick={() => setPdfChoiceOpen(false)}><X size={20}/></button></div>
      <div className="pdf-choice-actions">
        <button className="pdf-choice-card" onClick={() => downloadAllPDFs('personal')}><FileText size={28}/><span><b>نسخة شخصية</b><small>ملف واحد للشركة الرئيسية فقط، ويحتوي على بيانات الشراء والتغطيات والأسعار وقيمة المبيعات.</small></span></button>
        <button className="pdf-choice-card quote-version" onClick={() => downloadAllPDFs('quote')}><Download size={28}/><span><b>نسخة عرض السعر</b><small>يتم تحميل 3 ملفات للشركة الرئيسية والشركتين التابعتين.</small></span></button>
      </div>
    </div></div>}
  </section>;
}

function PreviewFit({ children }) {
  const hostRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const resize = () => {
      const width = hostRef.current?.clientWidth || 794;
      setScale(Math.min(1, Math.max(0.35, (width - 24) / 794)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (hostRef.current) observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);
  return <div className="preview-wrap" ref={hostRef}>
    <div className="preview-stage" style={{ height: `${1123 * scale}px` }}>
      <div className="preview-scale" style={{ transform: `scale(${scale})` }}>{children}</div>
    </div>
  </div>;
}

function QuoteTemplate({ meta, company, output, quote, total, isPrimary, mode = 'personal', rowOrder = null }) {
  const sourceRows = quote.items?.length ? quote.items : [{ id: 'blank', coverageRates: {} }];
  const rows = Array.isArray(rowOrder) && rowOrder.length
    ? [
      ...rowOrder.map((id) => sourceRows.find((item) => item.id === id)).filter(Boolean),
      ...sourceRows.filter((item) => !rowOrder.includes(item.id)),
    ]
    : sourceRows;
  const formatDate = (value) => value ? value.split('-').reverse().join(' / ') : '';
  const terms = quote.termsByTemplate?.[output.template] || [];
  const isQuoteVersion = mode === 'quote';
  return <div className="sheet-inner exact-sheet" dir="rtl" lang="ar">
    {meta.header && <img className="sheet-header-img" src={meta.header} alt="" />}
    <div className={`dynamic-content content-${output.template} ${isPrimary ? 'content-master' : 'content-coverage'} ${isQuoteVersion ? 'content-quote-version' : ''}`}>
      <h1 className="quote-title">{output.template === 'imdad' ? 'عرض سعر' : 'عرض أسعار'}</h1>
      <div className="client-block">
        {quote.client && <p><b>السادة /</b> {quote.client}</p>}
        {quote.attention && <p><b>عناية الأستاذ /</b> {quote.attention}</p>}
        {quote.subject && <p><b>الموضوع :</b> {quote.subject}</p>}
        {meta.greeting && <p>{meta.greeting}</p>}
      </div>
      {quote.introLines.filter(Boolean).length > 0 && <div className="intro-lines">
        {quote.introLines.filter(Boolean).map((line, index) => <p key={index}><span className="rtl-text" dir="rtl" lang="ar">{line}</span></p>)}
      </div>}

      {isQuoteVersion ? <table className="quote-table exact-table quote-version-table"><thead><tr>
        <th className="item-col">الصنف</th><th>الكمية</th><th>سعر بيع القطعة</th><th>ملاحظات</th>
      </tr></thead><tbody>{rows.map((item, index) => <tr key={item.id || index}>
        <td>{item.name || ''}</td><td>{item.qty ?? ''}</td><td>{outputPrice(item, output, company) ? money(outputPrice(item, output, company)) : ''}</td><td>{item.notes || ''}</td>
      </tr>)}</tbody></table> : isPrimary ? <table className="quote-table exact-table master-quote-table"><thead><tr>
        <th>م</th><th className="item-col">الصنف</th><th>الكمية</th><th>سعر الشراء</th><th>نسبة البيع %</th><th>سعر بيع القطعة</th><th>قيمة المبيعات</th><th>ملاحظات</th>
      </tr></thead><tbody>{rows.map((item, index) => <tr key={item.id || index}>
        <td>{index + 1}</td><td>{item.name || ''}</td><td>{item.qty ?? ''}</td><td>{item.buyPrice === '' ? '' : money(item.buyPrice)}</td><td>{item.baseCoverage ?? ''}</td><td>{item.sellPrice === '' ? '' : money(outputPrice(item, output, company))}</td><td>{money(salesValue(item, output, company))}</td><td>{item.notes || ''}</td>
      </tr>)}</tbody></table> : <table className="quote-table exact-table coverage-quote-table"><thead><tr>
        {meta.showIndex && <th>م</th>}<th className="item-col">الصنف</th><th>الكمية</th><th>نسبة التغطية لـ {output.name} %</th><th>سعر بيع القطعة</th><th>قيمة المبيعات</th><th>{output.template === 'imdad' ? 'المواصفات' : 'ملاحظات'}</th>
      </tr></thead><tbody>{rows.map((item, index) => <tr key={item.id || index}>
        {meta.showIndex && <td>{index + 1}</td>}<td>{item.name || ''}</td><td>{item.qty ?? ''}</td><td>{money(effectiveCoverage(item, output, company))}</td><td>{outputPrice(item, output, company) ? money(outputPrice(item, output, company)) : ''}</td><td>{money(salesValue(item, output, company))}</td><td>{item.notes || ''}</td>
      </tr>)}</tbody></table>}

      {quote.showTotal && <div className="quote-summary"><b>قيمة المبيعات: {money(total)} جنيه</b></div>}
      <div className="terms exact-terms" dir="rtl" lang="ar">
        {terms.filter(Boolean).map((term, index) => <p className="term-line" key={index}>
          <span className="term-marker" aria-hidden="true">-</span>
          <span className="rtl-text term-text" dir="rtl" lang="ar">{term}</span>
        </p>)}
        {quote.notes && quote.notes.split('\n').filter(Boolean).map((line, index) => <p className="note-line" key={`note-${index}`}>
          <span className="rtl-text" dir="rtl" lang="ar">{line}</span>
        </p>)}
      </div>
      {quote.date && <div className="exact-date" dir="rtl" lang="ar"><span>{output.template === 'imdad' ? 'التاريخ' : 'تحرير في'} :</span><span className="date-value" dir="ltr">{formatDate(quote.date)}</span></div>}
      {meta.signature && <div className="signature-block"><img src={meta.signature} alt="" /></div>}
    </div>
    {meta.footer && <img className="sheet-footer-img" src={meta.footer} alt="" />}
  </div>;
}

function Dashboard({ quotes, expenses, otherIncome, onAddExpense, onAddIncome }) {
  const sales = quotes.reduce((sum, quote) => sum + toNumber(quote.total), 0);
  const purchases = quotes.reduce((sum, quote) => sum + toNumber(quote.purchaseTotal), 0);
  const expenseTotal = expenses.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const incomeTotal = otherIncome.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const netResult = sales - purchases - expenseTotal + incomeTotal;
  const byCompany = Object.values(MAIN_COMPANIES).map((company) => ({
    name: company.name,
    value: quotes.filter((quote) => quote.mainCompanyId === company.id).reduce((sum, quote) => sum + toNumber(quote.total), 0),
  }));
  const outputData = Object.values(MAIN_COMPANIES).flatMap((company) => company.outputs.map((output) => ({
    name: output.name,
    value: quotes.filter((quote) => quote.mainCompanyId === company.id).reduce((sum, quote) => {
      if (output.id === company.primary.id) return sum + toNumber(quote.total);
      return sum + toNumber(quote.coverageTotals?.[output.id]);
    }, 0),
  })));
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = date.toISOString().slice(0, 7);
    return {
      month: date.toLocaleDateString('ar-EG', { month: 'short' }),
      sales: quotes.filter((quote) => quote.date?.startsWith(key)).reduce((sum, quote) => sum + toNumber(quote.total), 0),
    };
  });
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">نظرة عامة</span><h1>لوحة التحكم</h1></div><div className="toolbar-actions"><button className="secondary" onClick={onAddExpense}><Receipt size={18}/> إضافة مصروف</button><button className="primary" onClick={onAddIncome}><Plus size={18}/> إضافة إيراد</button></div></div>
    <div className="stats-grid"><Stat title="قيمة المبيعات" value={sales}/><Stat title="قيمة المشتريات" value={purchases}/><Stat title="المصروفات" value={expenseTotal}/><Stat title="صافي العائد" value={netResult}/></div>
    <div className="charts-grid"><ChartCard title="مبيعات الشركات الرئيسية"><ResponsiveContainer width="100%" height={280}><BarChart data={byCompany}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#244f80" radius={[8, 8, 0, 0]}/></BarChart></ResponsiveContainer></ChartCard>
    <ChartCard title="توزيع ملفات الشركات"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={outputData} dataKey="value" nameKey="name" outerRadius={95} label>{outputData.map((_, index) => <Cell key={index} fill={['#0d3853', '#00bfe5', '#244f80', '#7aa0c7'][index % 4]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
    <ChartCard title="المبيعات خلال آخر 6 شهور" wide><ResponsiveContainer width="100%" height={290}><LineChart data={monthly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#0d3853" strokeWidth={3}/></LineChart></ResponsiveContainer></ChartCard></div>
  </section>;
}
function Stat({ title, value }) { return <div className="stat-card"><small>{title}</small><strong>{money(value)} ج.م</strong></div>; }
function ChartCard({ title, children, wide }) { return <div className={`chart-card ${wide ? 'wide' : ''}`}><h3>{title}</h3>{children}</div>; }

function SavedQuotes({ quotes, onOpen, onDelete }) {
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">الأرشيف</span><h1>العروض المحفوظة</h1></div></div>
    {quotes.length === 0 ? <Empty text="لا توجد عروض محفوظة بعد."/> : <div className="table-card"><table className="data-table"><thead><tr><th>اسم الملف</th><th>الشركة</th><th>العميل</th><th>التاريخ</th><th>قيمة المبيعات</th><th></th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><td><button className="link-btn" onClick={() => onOpen(quote)}>{quote.fileName}</button></td><td>{MAIN_COMPANIES[quote.mainCompanyId]?.name}</td><td>{quote.client}</td><td>{quote.date}</td><td>{money(quote.total)} ج.م</td><td><button className="icon-danger" onClick={() => onDelete(quote.id)}><Trash2 size={17}/></button></td></tr>)}</tbody></table></div>}
  </section>;
}

function Transactions({ expenses, income, onAddExpense, onAddIncome }) {
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">الحركة المالية</span><h1>المصاريف والإيرادات الأخرى</h1></div><div className="toolbar-actions"><button className="secondary" onClick={onAddExpense}><Receipt size={18}/> إضافة مصروف</button><button className="primary" onClick={onAddIncome}><Plus size={18}/> إضافة إيراد</button></div></div>
  <div className="charts-grid"><TransactionList title="المصاريف" entries={expenses}/><TransactionList title="الإيرادات الأخرى" entries={income}/></div></section>;
}
function TransactionList({ title, entries }) { return <div className="chart-card"><h3>{title}</h3>{entries.length === 0 ? <Empty text="لا توجد بيانات."/> : <div className="transaction-list">{entries.map((entry) => <div key={entry.id}><div><b>{entry.title}</b><small>{entry.company} - {entry.date}</small></div><strong>{money(entry.amount)} ج.م</strong></div>)}</div>}</div>; }
function Empty({ text }) { return <div className="empty"><FileText size={42}/><p>{text}</p></div>; }

function TransactionModal({ type, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', amount: '', date: today(), company: 'عام' });
  return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{type === 'expense' ? 'إضافة مصروف' : 'إضافة إيراد آخر'}</h3><button onClick={onClose}><X size={20}/></button></div>
  <label>البيان<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}/></label><label>القيمة<input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })}/></label><label>التاريخ<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })}/></label><label>الشركة<select value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })}><option>عام</option><option>AlexTrade</option><option>3A</option><option>Gino Trade</option><option>Imdad</option><option>الوعد</option><option>الحمد</option></select></label>
  <button className="primary full" onClick={() => onSave({ ...form, id: uid(), amount: toNumber(form.amount) })}><Save size={18}/> حفظ</button></div></div>;
}

export default App;
