export const MAIN_COMPANIES = {
  alex: {
    id: 'alex', name: 'AlexTrade', arabicName: 'اليكس تريد', color: '#0d3853', accent: '#00bfe5',
    branches: [
      { id: 'alextrade', name: 'AlexTrade', template: 'alex', direct: true },
      { id: '3a', name: '3A / AAA', template: '3a', direct: true },
      { id: 'gino', name: 'Gino Trade', template: 'gino' },
    ],
  },
  imdad: {
    id: 'imdad', name: 'Imdad', arabicName: 'إمداد', color: '#244f80', accent: '#7aa0c7',
    branches: [
      { id: 'imdad-direct', name: 'Imdad', template: 'imdad', direct: true },
      { id: 'alwaad', name: 'الوعد', template: 'alwaad' },
      { id: 'alhamd', name: 'الحمد', template: 'alhamd' },
    ],
  },
};

export const TEMPLATE_META = {
  '3a': {
    title: 'ثري ايه', subtitle: 'للتوريدات العمومية', background: '/templates/3a-reference.jpg',
    greeting: 'تحيه طيبه و بعد،،،', showIndex: true,
    defaultIntroLines: [],
    defaultTerms: ['يضاف ضريبة القيمة المضافة 14% على الأصناف الخاضعة.', 'الدفع نقداً أو بشيك.', 'مدة العرض أسبوع من تاريخ أمر التوريد.'],
  },
  alex: {
    title: 'ALEX TRADE', subtitle: 'للتجارة والتوريدات العامة', background: '/templates/alex-reference.jpg',
    greeting: 'تحية طيبة و بعد،،،', showIndex: false,
    defaultIntroLines: [],
    defaultTerms: ['السعر غير شامل ضريبة القيمة المضافة.', 'الدفع نقداً أو بشيك لصالح شركة اليكس تريد', 'مدة التوريد في خلال أسبوع من تاريخ أمر التوريد', 'مكان التسليم بمخازن شركتكم'],
  },
  gino: {
    title: 'جنو تريد', subtitle: 'لتوريد المواد الغذائية', background: '/templates/gino-reference.jpg',
    greeting: 'تحيه طيبه و بعد ،،،', showIndex: false,
    defaultIntroLines: [],
    defaultTerms: ['الاسعار غير شامله ضريبة القيمة المضافة.', 'الدفع نقداً أو بشيك.', 'مدة التوريد خلال أسبوع من تاريخ أمر التوريد.'],
  },
  alwaad: {
    title: 'الوعد', subtitle: 'للتوريدات العمومية', background: '/templates/alwaad-reference.jpg',
    greeting: 'تحيه طيبه وبعد،،،', showIndex: true,
    defaultIntroLines: [],
    defaultTerms: ['الأسعار غير شاملة ضريبة القيمة المضافة 14%.', 'وتفضلوا بقبول وافر الشكر،،،'],
  },
  alhamd: {
    title: 'الحمد', subtitle: 'للتوريدات العمومية', background: '/templates/alhamd-reference.jpg',
    greeting: 'تحيه طيبه وبعد،،،', showIndex: true,
    defaultIntroLines: [],
    defaultTerms: ['يضاف إلى السعر السابق ضريبة قيمة مضافة 14%'],
  },
  imdad: {
    title: 'إمداد', subtitle: 'للتوريدات الصناعية والهندسية', background: '/templates/imdad-reference.jpg',
    greeting: '', showIndex: true,
    defaultIntroLines: ['تتشرف شركة إمداد للتوريدات الصناعية والهندسية أن تتقدم بعرض سعر التالي:'],
    defaultTerms: ['الأسعار: يضاف للأسعار ضريبة القيمة المضافة.', 'الدفع: نقداً أو بشيك لصالح شركة إمداد للتوريدات الصناعية والهندسية.', 'مدة التوريد: في خلال أسبوع من تاريخ أمر التوريد.', 'مكان التسليم: بمخازن شركتكم', 'وتفضلوا بقبول وافر الشكر والاحترام،،،'],
  },
};
