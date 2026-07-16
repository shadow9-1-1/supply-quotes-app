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
    title: 'ثري ايه', subtitle: 'للتوريدات العمومية',
    header: '/templates/separated/3a-header.jpg', footer: '/templates/separated/3a-footer.jpg', signature: '/templates/separated/3a-signature.jpg',
    greeting: 'تحيه طيبه و بعد،،،', showIndex: true,
    defaultIntroLines: [],
    defaultTerms: ['يضاف ضريبة القيمة المضافة 14% على الأصناف الخاضعة.', 'الدفع نقداً أو بشيك.', 'مدة العرض أسبوع من تاريخ أمر التوريد.'],
  },
  alex: {
    title: 'ALEX TRADE', subtitle: 'للتجارة والتوريدات العامة',
    header: '/templates/separated/alex-header.jpg', footer: '/templates/separated/alex-footer.jpg', signature: '/templates/separated/alex-signature.jpg',
    greeting: 'تحية طيبة و بعد،،،', showIndex: false,
    defaultIntroLines: [],
    defaultTerms: ['السعر غير شامل ضريبة القيمة المضافة.', 'الدفع نقداً أو بشيك لصالح شركة اليكس تريد', 'مدة التوريد في خلال أسبوع من تاريخ أمر التوريد', 'مكان التسليم بمخازن شركتكم'],
  },
  gino: {
    title: 'جنو تريد', subtitle: 'لتوريد المواد الغذائية',
    header: '/templates/separated/gino-header.jpg', footer: '/templates/separated/gino-footer.jpg', signature: '/templates/separated/gino-signature.jpg',
    greeting: 'تحيه طيبه و بعد ،،،', showIndex: false,
    defaultIntroLines: [],
    defaultTerms: ['الاسعار غير شامله ضريبة القيمة المضافة.', 'الدفع نقداً أو بشيك.', 'مدة التوريد خلال أسبوع من تاريخ أمر التوريد.'],
  },
  alwaad: {
    title: 'الوعد', subtitle: 'للتوريدات العمومية',
    header: '/templates/separated/alwaad-header.jpg', footer: null, signature: '/templates/separated/alwaad-signature.jpg',
    greeting: 'تحيه طيبه وبعد،،،', showIndex: true,
    defaultIntroLines: [],
    defaultTerms: ['الأسعار غير شاملة ضريبة القيمة المضافة 14%.', 'وتفضلوا بقبول وافر الشكر،،،'],
  },
  alhamd: {
    title: 'الحمد', subtitle: 'للتوريدات العمومية',
    header: '/templates/separated/alhamd-header.jpg', footer: '/templates/separated/alhamd-footer.jpg', signature: '/templates/separated/alhamd-signature.jpg',
    greeting: 'تحيه طيبه وبعد،،،', showIndex: true,
    defaultIntroLines: [],
    defaultTerms: ['يضاف إلى السعر السابق ضريبة قيمة مضافة 14%'],
  },
  imdad: {
    title: 'إمداد', subtitle: 'للتوريدات الصناعية والهندسية',
    header: '/templates/separated/imdad-header.jpg', footer: '/templates/separated/imdad-footer.jpg', signature: '/templates/separated/imdad-signature.jpg',
    greeting: '', showIndex: true,
    defaultIntroLines: ['تتشرف شركة إمداد للتوريدات الصناعية والهندسية أن تتقدم بعرض سعر التالي:'],
    defaultTerms: ['الأسعار: يضاف للأسعار ضريبة القيمة المضافة.', 'الدفع: نقداً أو بشيك لصالح شركة إمداد للتوريدات الصناعية والهندسية.', 'مدة التوريد: في خلال أسبوع من تاريخ أمر التوريد.', 'مكان التسليم: بمخازن شركتكم', 'وتفضلوا بقبول وافر الشكر والاحترام،،،'],
  },
};
