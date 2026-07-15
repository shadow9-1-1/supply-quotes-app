import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Building2, Download, FileSpreadsheet, FileText, Home, Plus,
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
const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const money = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

function App() {
  const [screen, setScreen] = useState('home');
  const [mainCompany, setMainCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [quotes, setQuotes] = useState(() => load('quotes', []));
  const [expenses, setExpenses] = useState(() => load('expenses', []));
  const [otherIncome, setOtherIncome] = useState(() => load('otherIncome', []));
  const [editingQuote, setEditingQuote] = useState(null);
  const [modal, setModal] = useState(null);

  const persist = (key, value, setter) => {
    setter(value);
    localStorage.setItem(key, JSON.stringify(value));
  };

  const openBranch = (company, selectedBranch) => {
    setMainCompany(company);
    setBranch(selectedBranch);
    setEditingQuote(null);
    setScreen('quote');
  };

  const openSavedQuote = (quote) => {
    const company = MAIN_COMPANIES[quote.mainCompanyId];
    const selectedBranch = company.branches.find(b => b.id === quote.branchId);
    setMainCompany(company);
    setBranch(selectedBranch);
    setEditingQuote(quote);
    setScreen('quote');
  };

  return (
    <div className="app-shell">
      <Sidebar screen={screen} setScreen={setScreen} />
      <main className="main-content">
        {screen === 'home' && <HomeScreen onChoose={(company) => { setMainCompany(company); setScreen('branches'); }} />}
        {screen === 'branches' && <BranchesScreen company={mainCompany} onBack={() => setScreen('home')} onChoose={(b) => openBranch(mainCompany, b)} />}
        {screen === 'quote' && mainCompany && branch && (
          <QuoteEditor
            company={mainCompany}
            branch={branch}
            initialQuote={editingQuote}
            onBack={() => setScreen('branches')}
            onPrevious={() => {
              const currentIndex = mainCompany.branches.findIndex(b => b.id === branch.id);
              const target = mainCompany.branches[(currentIndex - 1 + mainCompany.branches.length) % mainCompany.branches.length];
              openBranch(mainCompany, target);
            }}
            onNext={() => {
              const currentIndex = mainCompany.branches.findIndex(b => b.id === branch.id);
              const target = mainCompany.branches[(currentIndex + 1) % mainCompany.branches.length];
              openBranch(mainCompany, target);
            }}
            onSave={(quote) => {
              const exists = quotes.some(q => q.id === quote.id);
              const next = exists ? quotes.map(q => q.id === quote.id ? quote : q) : [quote, ...quotes];
              persist('quotes', next, setQuotes);
              setEditingQuote(quote);
            }}
          />
        )}
        {screen === 'dashboard' && <Dashboard quotes={quotes} expenses={expenses} otherIncome={otherIncome} onAddExpense={() => setModal('expense')} onAddIncome={() => setModal('income')} />}
        {screen === 'saved' && <SavedQuotes quotes={quotes} onOpen={openSavedQuote} onDelete={(id) => persist('quotes', quotes.filter(q => q.id !== id), setQuotes)} />}
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
    <div className="hero-copy"><span className="eyebrow">نظام عروض الأسعار والمصروفات</span><h1>اختر الشركة الرئيسية</h1><p>أنشئ عروض أسعار، احفظها، صدّرها PDF، وتابع المصروفات والأرباح.</p></div>
    <div className="company-grid">
      {Object.values(MAIN_COMPANIES).map(c => <button key={c.id} className="company-card" style={{'--company': c.color, '--accent': c.accent}} onClick={() => onChoose(c)}>
        <div className="company-icon"><Building2 size={34}/></div><h2>{c.name}</h2><p>{c.arabicName}</p><span>فتح الشركات التابعة <ArrowRight size={17}/></span>
      </button>)}
    </div>
  </section>;
}

function BranchesScreen({ company, onBack, onChoose }) {
  if (!company) return null;
  return <section className="page center-page">
    <button className="back-btn" onClick={onBack}><ArrowRight size={18}/> رجوع</button>
    <div className="hero-copy"><span className="eyebrow">{company.name}</span><h1>اختر الشركة التابعة</h1><p>سيتم تطبيق قالب الـPDF الخاص بالشركة المختارة.</p></div>
    <div className="company-grid branches">
      {company.branches.map(b => <button className="company-card" key={b.id} style={{'--company': company.color, '--accent': company.accent}} onClick={() => onChoose(b)}>
        <div className="company-icon"><Receipt size={34}/></div><h2>{b.name}</h2><p>عرض سعر جديد</p><span>فتح النموذج <ArrowRight size={17}/></span>
      </button>)}
    </div>
  </section>;
}

function QuoteEditor({ company, branch, initialQuote, onBack, onPrevious, onNext, onSave }) {
  const templateKey = branch.template || company.id;
  const meta = TEMPLATE_META[templateKey] || TEMPLATE_META[company.id];
  const printRef = useRef(null);
  const [quote, setQuote] = useState(() => initialQuote || {
    id: uid(), mainCompanyId: company.id, branchId: branch.id,
    fileName: `عرض سعر ${branch.name} - ${today()}`,
    client: '', attention: '', date: '', subject: '',
    tax: '', notes: '', introLines: [...(meta.defaultIntroLines || [])], terms: [...(meta.defaultTerms || [])], items: [emptyItem()],
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    setQuote(q => ({
      ...q,
      introLines: Array.isArray(q.introLines) ? q.introLines : [...(meta.defaultIntroLines || [])],
      terms: Array.isArray(q.terms) ? q.terms : [...(meta.defaultTerms || [])],
    }));
  }, [meta]);

  function emptyItem() { return { id: uid(), name: '', unit: '', qty: '', buyPrice: '', profit: '', coverage: '', sellPrice: '', notes: '' }; }
  const update = (field, value) => setQuote(q => ({...q, [field]: value}));
  const updateIntroLine = (index, value) => setQuote(q => ({...q, introLines: q.introLines.map((line, i) => i === index ? value : line)}));
  const addIntroLine = () => setQuote(q => ({...q, introLines: [...(q.introLines || []), '']}));
  const removeIntroLine = (index) => setQuote(q => ({...q, introLines: q.introLines.filter((_, i) => i !== index)}));
  const updateTerm = (index, value) => setQuote(q => ({...q, terms: q.terms.map((term, i) => i === index ? value : term)}));
  const addTerm = () => setQuote(q => ({...q, terms: [...(q.terms || []), '']}));
  const removeTerm = (index) => setQuote(q => ({...q, terms: q.terms.filter((_, i) => i !== index)}));
  const updateItem = (id, field, value) => setQuote(q => ({...q, items: q.items.map(item => {
    if (item.id !== id) return item;
    const next = {...item, [field]: value};
    if (['buyPrice','profit','coverage'].includes(field)) {
      const buy = Number(next.buyPrice || 0); const profit = Number(next.profit || 0); const coverage = Number(next.coverage || 0);
      next.sellPrice = +(buy * (1 + (profit + coverage) / 100)).toFixed(2);
    }
    return next;
  })}));
  const total = useMemo(() => quote.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.sellPrice || 0), 0), [quote.items]);
  const purchaseTotal = useMemo(() => quote.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.buyPrice || 0), 0), [quote.items]);

  const save = () => { onSave({...quote, total, purchaseTotal, updatedAt: new Date().toISOString()}); setStatus('تم الحفظ'); setTimeout(() => setStatus(''), 1800); };
  const downloadPDF = async () => {
    setStatus('جاري إنشاء PDF...');
    const canvas = await html2canvas(printRef.current, { scale: 2.2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210, pageHeight = 297;
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const width = canvas.width * ratio, height = canvas.height * ratio;
    pdf.addImage(imgData, 'PNG', (pageWidth-width)/2, 0, width, height, undefined, 'FAST');
    pdf.save(`${quote.fileName || 'عرض سعر'}.pdf`);
    setStatus('تم تحميل PDF'); setTimeout(() => setStatus(''), 1800);
  };

  const downloadExcel = () => {
    setStatus('جاري إنشاء Excel...');
    const headerRows = [
      [meta.title || branch.name],
      ['عرض أسعار'],
      ['العميل', quote.client || ''],
      ['عناية الأستاذ', quote.attention || ''],
      ['الموضوع', quote.subject || ''],
      ['التاريخ', quote.date || ''],
      [],
    ];
    const tableRows = quote.items.map((item, index) => [
      index + 1,
      item.name || '',
      item.unit || '',
      Number(item.qty || 0),
      Number(item.sellPrice || 0),
      Number(item.qty || 0) * Number(item.sellPrice || 0),
      item.notes || '',
    ]);
    const footerRows = [
      [],
      ['الإجمالي', '', '', '', '', total],
      [],
      ['نصوص أعلى الجدول', ...(quote.introLines || []).filter(Boolean)],
      ['الشروط والملاحظات', ...(quote.terms || []).filter(Boolean)],
      ['ملاحظات إضافية', quote.notes || ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet([
      ...headerRows,
      ['م', 'الصنف', 'الوحدة', 'الكمية', 'سعر الوحدة', 'الإجمالي', branch.template === 'imdad' ? 'المواصفات' : 'ملاحظات'],
      ...tableRows,
      ...footerRows,
    ]);
    ws['!cols'] = [{wch:7},{wch:34},{wch:14},{wch:12},{wch:16},{wch:16},{wch:30}];
    ws['!views'] = [{rightToLeft:true}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'عرض السعر');
    XLSX.writeFile(wb, `${quote.fileName || 'عرض سعر'}.xlsx`, { compression: true });
    setStatus('تم تحميل Excel'); setTimeout(() => setStatus(''), 1800);
  };

  return <section className="page quote-page">
    <div className="page-toolbar">
      <div className="quote-navigation">
        <button className="back-btn" onClick={onBack}><ArrowRight size={18}/> رجوع للقائمة</button>
        <button className="nav-step-btn" onClick={onPrevious}><ArrowRight size={18}/> السابق</button>
        <span className="current-template">{branch.name}</span>
        <button className="nav-step-btn" onClick={onNext}>التالي <ArrowLeft size={18}/></button>
      </div>
      <div className="toolbar-actions"><span className="save-status">{status}</span><button className="secondary" onClick={save}><Save size={18}/> حفظ</button><button className="excel-btn" onClick={downloadExcel}><FileSpreadsheet size={18}/> تحميل Excel</button><button className="primary" onClick={downloadPDF}><Download size={18}/> تحميل PDF</button></div>
    </div>
    <div className="editor-layout">
      <div className="form-panel">
        <h3>بيانات العرض</h3>
        <label>اسم الملف<input value={quote.fileName} onChange={e => update('fileName', e.target.value)} /></label>
        <div className="two-cols"><label>اسم العميل<input value={quote.client} onChange={e => update('client', e.target.value)} /></label><label>عناية الأستاذ<input value={quote.attention} onChange={e => update('attention', e.target.value)} /></label></div>
        <div className="two-cols"><label>التاريخ<input type="date" value={quote.date} onChange={e => update('date', e.target.value)} /></label><label>الموضوع<input value={quote.subject} onChange={e => update('subject', e.target.value)} /></label></div><label className="check-label"><input type="checkbox" checked={!!quote.showTotal} onChange={e => update('showTotal', e.target.checked)} /> إظهار الإجمالي داخل الـPDF</label>
        <div className="items-header"><h3>نصوص أعلى الجدول</h3><button onClick={addIntroLine}><Plus size={17}/> إضافة سطر</button></div>
        <div className="term-editor-list">{(quote.introLines || []).map((line, index) => <div className="term-editor" key={`intro-${index}`}><textarea value={line} onChange={e => updateIntroLine(index, e.target.value)} placeholder="اكتب أي كلام يظهر فوق الجدول"/><button className="icon-danger" onClick={() => removeIntroLine(index)}><Trash2 size={16}/></button></div>)}</div>
        <label>ملاحظات إضافية (اختياري)<textarea value={quote.notes} onChange={e => update('notes', e.target.value)} placeholder="أي كلام إضافي يظهر أسفل الجدول" /></label>
        <div className="items-header"><h3>النصوص والشروط أسفل الجدول</h3><button onClick={addTerm}><Plus size={17}/> إضافة سطر</button></div>
        <div className="term-editor-list">{(quote.terms || []).map((term, index) => <div className="term-editor" key={index}><textarea value={term} onChange={e => updateTerm(index, e.target.value)} placeholder="اكتب أي سطر كما تريد أن يظهر في الـPDF"/><button className="icon-danger" onClick={() => removeTerm(index)}><Trash2 size={16}/></button></div>)}</div>
        <div className="items-header"><h3>الأصناف</h3><button onClick={() => setQuote(q => ({...q, items:[...q.items, emptyItem()]}))}><Plus size={17}/> إضافة صنف</button></div>
        <div className="item-editor-list">
          {quote.items.map((item, idx) => <div className="item-editor" key={item.id}>
            <div className="item-title"><b>صنف {idx+1}</b><button className="icon-danger" disabled={quote.items.length===1} onClick={() => setQuote(q => ({...q, items:q.items.filter(x => x.id!==item.id)}))}><Trash2 size={17}/></button></div>
            <label>اسم الصنف<input value={item.name} onChange={e => updateItem(item.id,'name',e.target.value)} /></label>
            <div className="three-cols"><label>الوحدة<input value={item.unit} onChange={e => updateItem(item.id,'unit',e.target.value)} /></label><label>الكمية<input type="number" step="0.01" value={item.qty} onChange={e => updateItem(item.id,'qty',e.target.value)} /></label><label>سعر الشراء<input type="number" step="0.01" value={item.buyPrice} onChange={e => updateItem(item.id,'buyPrice',e.target.value)} /></label></div>
            <div className="three-cols"><label>الربح %<input type="number" step="0.01" value={item.profit} onChange={e => updateItem(item.id,'profit',e.target.value)} /></label><label>التغطية %<input type="number" step="0.01" value={item.coverage} onChange={e => updateItem(item.id,'coverage',e.target.value)} /></label><label>سعر البيع<input type="number" step="0.01" value={item.sellPrice} onChange={e => updateItem(item.id,'sellPrice',e.target.value)} /></label></div>
            <label>ملاحظات<input value={item.notes} onChange={e => updateItem(item.id,'notes',e.target.value)} /></label>
          </div>)}
        </div>
      </div>
      <PreviewFit>
        <div className={`quote-sheet template-${templateKey}`} ref={printRef}>
          <QuoteTemplate meta={meta} company={company} branch={branch} quote={quote} total={total}/>
        </div>
      </PreviewFit>
    </div>
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
    <div className="preview-stage" style={{height: `${1123 * scale}px`}}>
      <div className="preview-scale" style={{transform: `scale(${scale})`}}>{children}</div>
    </div>
  </div>;
}

function QuoteTemplate({ meta, company, branch, quote, total }) {
  const rows = quote.items?.length ? quote.items : [{id:'blank'}];
  const showIndex = meta.showIndex;
  const formatDate = (value) => value ? value.split('-').reverse().join(' / ') : '';
  return <div className="sheet-inner exact-sheet" style={{backgroundImage:`url(${meta.background})`}}>
    <div className={`dynamic-content content-${branch.template}`}>
      <h1 className="quote-title">{company.id === 'imdad' && branch.template === 'imdad' ? 'عرض سعر' : 'عرض أسعار'}</h1>
      <div className="client-block">
        {quote.client && <p><b>السادة /</b> {quote.client}</p>}
        {quote.attention && <p><b>عناية الأستاذ /</b> {quote.attention}</p>}
        {quote.subject && <p><b>الموضوع :</b> {quote.subject}</p>}
        {meta.greeting && <p>{meta.greeting}</p>}
      </div>
      {(quote.introLines || []).filter(Boolean).length > 0 && <div className="intro-lines">
        {(quote.introLines || []).filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}
      </div>}
      <table className="quote-table exact-table"><thead><tr>
        {showIndex && <th>م</th>}<th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>{branch.template === 'imdad' ? 'المواصفات' : 'ملاحظات'}</th>
      </tr></thead><tbody>{rows.map((item, idx) => <tr key={item.id || idx}>
        {showIndex && <td>{idx + 1}</td>}<td>{item.name || ''}</td><td>{item.unit || ''}</td><td>{item.qty ?? ''}</td><td>{item.sellPrice === '' || item.sellPrice == null ? '' : money(item.sellPrice)}</td><td>{item.notes || ''}</td>
      </tr>)}</tbody></table>
      {quote.showTotal && <div className="quote-summary"><b>الإجمالي: {money(total)} جنيه</b></div>}
      <div className="terms exact-terms">
        {(quote.terms || []).filter(Boolean).map((term, index) => <p key={index}>- {term}</p>)}
        {quote.notes && quote.notes.split('\n').filter(Boolean).map((line,index)=><p key={`n-${index}`}>{line}</p>)}
      </div>
      {quote.date && <div className="exact-date">{branch.template === 'imdad' ? 'التاريخ' : 'تحرير في'} : {formatDate(quote.date)}</div>}
    </div>
  </div>;
}

function Dashboard({ quotes, expenses, otherIncome, onAddExpense, onAddIncome }) {
  const sales = quotes.reduce((s,q)=>s+Number(q.total||0),0);
  const purchases = quotes.reduce((s,q)=>s+Number(q.purchaseTotal||0),0);
  const exp = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const inc = otherIncome.reduce((s,e)=>s+Number(e.amount||0),0);
  const profit = sales - purchases - exp + inc;
  const byCompany = ['alex','imdad'].map(id => ({ name: MAIN_COMPANIES[id].name, value: quotes.filter(q=>q.mainCompanyId===id).reduce((s,q)=>s+Number(q.total||0),0)}));
  const branchData = Object.values(MAIN_COMPANIES).flatMap(c => c.branches.map(b => ({name:b.name, value:quotes.filter(q=>q.branchId===b.id).reduce((s,q)=>s+Number(q.total||0),0)})));
  const monthly = Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i));const key=d.toISOString().slice(0,7);return {month:d.toLocaleDateString('ar-EG',{month:'short'}), sales:quotes.filter(q=>q.date?.startsWith(key)).reduce((s,q)=>s+Number(q.total||0),0)};});
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">نظرة عامة</span><h1>لوحة التحكم</h1></div><div className="toolbar-actions"><button className="secondary" onClick={onAddExpense}><Receipt size={18}/> إضافة مصروف</button><button className="primary" onClick={onAddIncome}><Plus size={18}/> إضافة إيراد</button></div></div>
    <div className="stats-grid"><Stat title="إجمالي المبيعات" value={sales}/><Stat title="إجمالي المشتريات" value={purchases}/><Stat title="المصروفات" value={exp}/><Stat title="صافي الربح" value={profit}/></div>
    <div className="charts-grid"><ChartCard title="مبيعات الشركات الرئيسية"><ResponsiveContainer width="100%" height={280}><BarChart data={byCompany}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#244f80" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
    <ChartCard title="توزيع مبيعات الشركات التابعة"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={branchData} dataKey="value" nameKey="name" outerRadius={95} label>{branchData.map((_,i)=><Cell key={i} fill={['#0d3853','#00bfe5','#244f80','#7aa0c7'][i%4]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
    <ChartCard title="المبيعات خلال آخر 6 شهور" wide><ResponsiveContainer width="100%" height={290}><LineChart data={monthly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#0d3853" strokeWidth={3}/></LineChart></ResponsiveContainer></ChartCard></div>
  </section>;
}
function Stat({title,value}){return <div className="stat-card"><small>{title}</small><strong>{money(value)} ج.م</strong></div>}
function ChartCard({title,children,wide}){return <div className={`chart-card ${wide?'wide':''}`}><h3>{title}</h3>{children}</div>}

function SavedQuotes({ quotes, onOpen, onDelete }) {
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">الأرشيف</span><h1>العروض المحفوظة</h1></div></div>
    {quotes.length===0 ? <Empty text="لا توجد عروض محفوظة بعد."/> : <div className="table-card"><table className="data-table"><thead><tr><th>اسم الملف</th><th>الشركة</th><th>العميل</th><th>التاريخ</th><th>الإجمالي</th><th></th></tr></thead><tbody>{quotes.map(q=><tr key={q.id}><td><button className="link-btn" onClick={()=>onOpen(q)}>{q.fileName}</button></td><td>{MAIN_COMPANIES[q.mainCompanyId]?.branches.find(b=>b.id===q.branchId)?.name}</td><td>{q.client}</td><td>{q.date}</td><td>{money(q.total)} ج.م</td><td><button className="icon-danger" onClick={()=>onDelete(q.id)}><Trash2 size={17}/></button></td></tr>)}</tbody></table></div>}
  </section>;
}

function Transactions({ expenses, income, onAddExpense, onAddIncome }) {
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">الحركة المالية</span><h1>المصاريف والإيرادات الأخرى</h1></div><div className="toolbar-actions"><button className="secondary" onClick={onAddExpense}><Receipt size={18}/> إضافة مصروف</button><button className="primary" onClick={onAddIncome}><Plus size={18}/> إضافة إيراد</button></div></div>
  <div className="charts-grid"><TransactionList title="المصاريف" entries={expenses}/><TransactionList title="الإيرادات الأخرى" entries={income}/></div></section>;
}
function TransactionList({title,entries}){return <div className="chart-card"><h3>{title}</h3>{entries.length===0?<Empty text="لا توجد بيانات."/>:<div className="transaction-list">{entries.map(e=><div key={e.id}><div><b>{e.title}</b><small>{e.company} - {e.date}</small></div><strong>{money(e.amount)} ج.م</strong></div>)}</div>}</div>}
function Empty({text}){return <div className="empty"><FileText size={42}/><p>{text}</p></div>}

function TransactionModal({ type, onClose, onSave }) {
  const [form,setForm]=useState({title:'',amount:'',date:today(),company:'عام'});
  return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{type==='expense'?'إضافة مصروف':'إضافة إيراد آخر'}</h3><button onClick={onClose}><X size={20}/></button></div>
  <label>البيان<input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>القيمة<input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>التاريخ<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>الشركة<select value={form.company} onChange={e=>setForm({...form,company:e.target.value})}><option>عام</option><option>AlexTrade</option><option>3A</option><option>Gino Trade</option><option>Imdad</option><option>الوعد</option><option>الحمد</option></select></label>
  <button className="primary full" onClick={()=>onSave({...form,id:uid(),amount:Number(form.amount||0)})}><Save size={18}/> حفظ</button></div></div>;
}

export default App;
