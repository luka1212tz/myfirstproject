import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3,
  Instagram, MapPin, Menu, PawPrint, Phone, Scissors, ShieldCheck, Sparkles, Star,
  X, Cat, Dog, Heart, Send, Footprints, MessageCircle,
} from 'lucide-react';
import Admin from './Admin';
import { translate, type Language } from './i18n';
import { api, localToday } from './lib/api';

type Service = { id: string; name: string; description: string; animal_type: 'dog'|'cat'|'both'; price: number|null; duration_minutes: number; image_url: string };
type GalleryImage = { id: string; image_url: string; alt_text: string; category: string };
type Testimonial = { id: string; author_name: string; review_text: string; rating: number; review_date: string|null; source: string };
type FAQ = { id: string; question: string; answer: string };
type Hour = { weekday: number; is_open: boolean; open_time: string|null; close_time: string|null };
type Business = { name: string; address: string; phone: string; whatsappNumber: string; email: string; intro: string; mapsUrl: string; placeId: string; instagram: string; tiktok: string };
type SiteData = { business: Business; services: Service[]; gallery: GalleryImage[]; testimonials: Testimonial[]; faqs: FAQ[]; hours: Hour[] };

const fallbackBusiness: Business = {
  name: 'SHXAP GROOMING', address: 'Z. Gorgiladze N2, Batumi, Georgia', phone: '+995 551 22 22 99', whatsappNumber: '+995551222299', email: 'Shxapgruming@gmail.com', intro: '',
  mapsUrl: 'https://maps.app.goo.gl/uv7vUPoXWYzSyGrb7', placeId: 'ChIJcXQBEAd4B0AR2Y7XOG8Z0Zg',
  instagram: 'https://www.instagram.com/showergrooming/', tiktok: 'https://www.tiktok.com/@shxapgrooming',
};


const pricingGroups = [
  { title:'ლეკვების კომპლექსი (6 თვემდე)', desc:'განბანვა/გაშრობა, დავარცხნა, ბრჭყალების მოჭრა, ყურებისა და კბილების წმენდა, თათებისა და სახის მოვლა', items:[['იორკშირის ტერიერი, ში-ტცუ, მალტური ბოლონკა','50 ₾'],['პუდელი, ბიშონ ფრიზე, მალტიპუ','55 ₾'],['შპიცი','55 ₾']] },
  { title:'ჰიგიენური კომპლექსი', desc:'განბანვა/გაშრობა, ბრჭყალების მოჭრა, ყურების გაწმენდა, კბილების პროფილაქტიკური წმენდა', items:[['ძაღლები, ≤4 კგ','50 ₾'],['ძაღლები, ≤7 კგ','55 ₾'],['ძაღლები, ≤14 კგ','65 ₾'],['ძაღლები, >14 კგ','100+ ₾']] },
  { title:'შეკრეჭა', desc:'განბანვა/გაშრობა, ბრჭყალების მოჭრა, ყურების გაწმენდა, კბილების პროფილაქტიკური წმენდა, შეკრეჭა', items:[['იორკშირის / ბივერ ტერიერი','75 ₾'],['მალტური ბოლონკა','75 ₾'],['შპიცი, ≤22 სმ','70 ₾'],['შპიცი, 23–29 სმ','75 ₾'],['შპიცი, 30–38 სმ','80 ₾'],['პუდელი, მალტიპუ, ≤28 სმ','70 ₾'],['პუდელი, მალტიპუ, 29–35 სმ','75 ₾'],['პუდელი, მალტიპუ, 36–45 სმ','80 ₾'],['პუდელი, მალტიპუ, 45–60 სმ','85 ₾']] },
  { title:'შეკრეჭა: ჯიშები', desc:'', items:[['ბიშონ ფრიზე','75 ₾'],['ში-ტცუ','70 ₾'],['პეკინესი','70 ₾'],['პაპილიონი','70 ₾'],['კოკერ სპანიელი','80 ₾'],['ჯეკ-რასელ ტერიერი','65 ₾'],['ბიგლი','70 ₾'],['ფრანგული ბულდოგი','70 ₾'],['კორგი','75 ₾'],['შარპეი','75 ₾'],['შელტი','60–90 ₾'],['ბორდერ კოლი','80 ₾'],['ლაბრადორი','120 ₾'],['დობერმანი','130 ₾'],['გოლდენ რეტრივერი, ჰასკი, კოლი, სამოედი, მალამუტი და სხვ.','120 ₾']] },
  { title:'სხვა ჯიშები', desc:'ფასი დამოკიდებულია ბეწვის სიგრძეზე, სტრუქტურასა და დახვეულობაზე', items:[['სხვა ჯიშები, ≤30 სმ','75 ₾'],['სხვა ჯიშები, 30–40 სმ','80 ₾'],['სხვა ჯიშები, 40–50 სმ','90 ₾'],['სხვა ჯიშები, >50 სმ','100 ₾']] },
  { title:'ტრიმინგი', desc:'ტრიმინგი, შეკრეჭა, განბანვა/გაშრობა, ბრჭყალების მოჭრა, ყურების გაწმენდა, კბილების პროფილაქტიკური წმენდა', items:[['ნორვიჩ ტერიერი','80 ₾'],['გრიფონი, ჯეკ-რასელი','85 ₾'],['ცვერგშნაუცერი, ვესტ-ჰაილენდ-ვაიტ ტერიერი, აფენპინჩერი','95 ₾'],['მიტელშნაუცერი','100 ₾'],['ფოქს ტერიერი','105 ₾']] },
];

const weekdays: Record<Language, string[]> = {
  ka: ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
};

function App() {
  const [language, setLanguage] = useState<Language>('ka');
  const [site, setSite] = useState<SiteData | null>(null);
  const [siteError, setSiteError] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const isAdmin = window.location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) return;
    api<SiteData>('/api/site').then(setSite).catch(() => setSiteError(true));
  }, [isAdmin]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (isAdmin) {
      document.title = 'SHXAP GROOMING | Owner Dashboard';
      return;
    }
    const title = 'SHXAP GROOMING | ' + translate(language, 'eyebrow');
    document.title = title;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', translate(language, 'heroText'));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    ogTitle?.setAttribute('content', title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    ogDescription?.setAttribute('content', translate(language, 'heroText'));
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `${window.location.origin}/`;
    const ogUrl = document.querySelector('meta[property="og:url"]');
    ogUrl?.setAttribute('content', `${window.location.origin}/`);
  }, [language, isAdmin]);

  if (isAdmin) return <Admin />;
  const t = (key: any) => translate(language, key);
  const business = site?.business || fallbackBusiness;
  const services = site?.services || [];
  const gallery = site?.gallery || [];
  const testimonials = site?.testimonials || [];
  const faqs = site?.faqs || [];
  const hours = site?.hours || [];

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenu(false);
  }

  return (
    <div className="site-shell">
      <div className="topline"><span><MapPin size={13} /> {t('batumi')}</span><span>{t('topLine')}</span><a href={business.mapsUrl} target="_blank" rel="noreferrer">{t('findMaps')} <ArrowUpRight size={12}/></a></div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SHXAP GROOMING home"><span className="brand-mark"><img src="/shower-grooming-logo.png" alt="Shower Grooming logo" /></span><span>SHXAP<span className="brand-light"> GROOMING</span><small>BATUMI · GEORGIA</small></span></a>
        <nav className={`main-nav ${mobileMenu ? 'nav-open' : ''}`}>
          <button onClick={() => scrollTo('services')}>{t('navServices')}</button>
          <button onClick={() => scrollTo('about')}>{t('navAbout')}</button>
          <button onClick={() => scrollTo('gallery')}>{t('navGallery')}</button>
          <button onClick={() => scrollTo('reviews')}>{t('navReviews')}</button>
          <button onClick={() => scrollTo('location')}>{t('navLocation')}</button>
        </nav>
        <div className="header-actions">
          <label className="language-picker"><span className="sr-only">Language</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="ka">ქარ</option><option value="en">EN</option><option value="ru">РУС</option></select><ChevronDown size={13}/></label>
          <button className="button button-dark header-book" onClick={() => scrollTo('booking')}>{t('book')} <ArrowUpRight size={15}/></button>
          <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label={mobileMenu ? 'Close menu' : 'Open menu'}>{mobileMenu ? <X/> : <Menu/>}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line"/>{t('eyebrow')}</div>
            <h1>{t('heroTitle')}</h1>
            <p className="hero-lede">{t('heroText')}</p>
            <div className="hero-actions"><button className="button button-dark" onClick={() => scrollTo('booking')}>{t('book')} <ArrowUpRight size={16}/></button><button className="text-link" onClick={() => scrollTo('services')}>{t('explore')} <ArrowDown size={15}/></button></div>
            <div className="hero-note"><span className="note-icon"><Heart size={16}/></span><span>{t('heroNote')} <small>{t('heroNoteSub')}</small></span></div>
          </div>
          <div className="hero-visual" aria-label="Shower Grooming official logo">
            <div className="hero-visual-backdrop"/>
            <div className="hero-stamp"><span>{t('stampTop')}</span><PawPrint size={21}/><span>{t('stampBottom')}</span></div>
            <img className="pet-portrait hero-logo" src="/shower-grooming-logo.png" alt="Shower Grooming — official dog and cat grooming logo" />
            <div className="hero-side-card"><span className="side-card-icon"><Sparkles size={19}/></span><span>{t('madeFor')}<br/><strong>{t('bestDays')}</strong></span></div>
            <div className="hero-number">01 <span>/ 03</span></div>
          </div>
          <div className="hero-bottom"><span>{t('scrollExplore')}</span><span className="hero-bottom-line"/><span>{t('batumi')}</span></div>
        </section>

        <section className="intro-band" id="about">
          <div className="intro-inner section-wrap">
            <div><div className="eyebrow eyebrow-light"><span className="eyebrow-line"/>{t('aboutKicker')}</div><h2>{t('aboutTitle')}</h2></div>
            <div className="intro-copy"><p>{business.intro || t('aboutText')}</p><span className="intro-signature">SHXAP GROOMING <PawPrint size={17}/></span></div>
          </div>
        </section>

        <section className="section section-wrap" id="services">
          <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{t('servicesKicker')}</div><h2>{t('servicesTitle')}</h2></div><p>{t('servicesText')}</p></div>
          {services.length ? <div className="services-grid">{services.map((service, index) => <article className="service-card" key={service.id}>{service.image_url && <img className="service-photo" src={service.image_url} alt={service.name} loading="lazy"/>}<div className={`service-icon service-icon-${index % 3}`}>{service.animal_type === 'cat' ? <Cat size={25}/> : service.animal_type === 'dog' ? <Dog size={25}/> : <PawPrint size={25}/>}</div><div className="service-card-top"><span>{service.animal_type === 'both' ? t('animalBoth') : service.animal_type === 'dog' ? t('animalDogs') : t('animalCats')}</span><span>0{index + 1}</span></div><h3>{service.name}</h3><p>{service.description}</p><div className="service-meta"><span><Clock3 size={14}/>{service.duration_minutes} min</span><strong>{service.price == null ? t('askPrice') : `${Number(service.price).toFixed(0)} ₾`}</strong></div><button className="service-link" onClick={() => scrollTo('booking')}>{t('requestService')} <ArrowUpRight size={14}/></button></article>)}</div> : <div className="empty-state empty-services"><div className="empty-icon"><Scissors size={26}/></div><p>{t('noServices')}</p><a href={business.instagram} target="_blank" rel="noreferrer">@showergrooming <ArrowUpRight size={14}/></a></div>}
        </section>

        <section className="pricing-section" id="pricing">
          <div className="section-wrap">
            <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>ფასები</div><h2>მოვლის მომსახურება და ფასები</h2></div><p>აირჩიეთ თქვენი მეგობრისთვის შესაფერისი მომსახურება.</p></div>
            <div className="pricing-grid">{pricingGroups.map((group, index) => <article className="pricing-card" key={group.title}><div className="pricing-card-kicker">0{index+1} / SHXAP GROOMING</div><h3>{group.title}</h3>{group.desc && <p className="pricing-desc">{group.desc}</p>}<ul>{group.items.map(([name, price]) => <li key={name}><span>{name}</span><strong>{price}</strong></li>)}</ul><button className="service-link" onClick={() => scrollTo('booking')}>ჩაწერის მოთხოვნა <ArrowUpRight size={14}/></button></article>)}</div>
          </div>
        </section>

        <section className="why-section">
          <div className="section-wrap why-inner"><div className="why-heading"><div className="eyebrow"><span className="eyebrow-line"/>{t('whyKicker')}</div><h2>{t('whyTitle')}</h2></div><div className="why-grid"><article><span className="why-index">01</span><div className="why-icon"><Heart size={21}/></div><h3>{t('why1')}</h3><p>{t('why1Text')}</p></article><article><span className="why-index">02</span><div className="why-icon"><PawPrint size={21}/></div><h3>{t('why2')}</h3><p>{t('why2Text')}</p></article><article><span className="why-index">03</span><div className="why-icon"><CalendarDays size={21}/></div><h3>{t('why3')}</h3><p>{t('why3Text')}</p></article></div></div>
        </section>

        <section className="section section-wrap process-section"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{t('processKicker')}</div><h2>{t('processTitle')}</h2></div><span className="process-mark"><PawPrint size={42}/></span></div><div className="process-grid"><article><span>01</span><div className="process-icon"><Scissors/></div><h3>{t('step1')}</h3><p>{t('step1Text')}</p></article><article><span>02</span><div className="process-icon"><Send/></div><h3>{t('step2')}</h3><p>{t('step2Text')}</p></article><article><span>03</span><div className="process-icon"><ShieldCheck/></div><h3>{t('step3')}</h3><p>{t('step3Text')}</p></article></div></section>

        <section className="gallery-section" id="gallery"><div className="section-wrap"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{t('galleryKicker')}</div><h2>{t('galleryTitle')}</h2></div><a className="text-link" href={business.instagram} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={15}/></a></div>
          <div className="gallery-grid">{['/gallery/grooming-01.webp', '/gallery/grooming-02.webp', '/gallery/grooming-03.webp', '/gallery/grooming-04.webp', '/gallery/grooming-05.webp', '/gallery/grooming-06.webp', '/gallery/grooming-07.webp', '/gallery/grooming-08.webp', '/gallery/grooming-09.webp', '/gallery/grooming-10.webp', '/gallery/grooming-11.webp', '/gallery/grooming-12.webp', '/gallery/grooming-13.webp', '/gallery/grooming-14.webp', '/gallery/grooming-15.webp', '/gallery/grooming-16.webp', '/gallery/grooming-17.webp', '/gallery/grooming-18.webp', '/gallery/grooming-19.webp', '/gallery/grooming-20.webp'].map((src, index) => <button key={src} className={`gallery-tile gallery-tile-${index % 4}`} onClick={() => setLightbox({id:src,image_url:src,alt_text:'SHXAP GROOMING — გრუმინგის გალერეა',category:'grooming'})}><img src={src} alt="SHXAP GROOMING — გრუმინგის შედეგი" loading="lazy" decoding="async" width="480" height="640"/><span><ArrowUpRight size={18}/></span></button>)}</div>
        </div></section>

        <section className="section section-wrap reviews-section" id="reviews"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{t('reviewsKicker')}</div><h2>{t('reviewsTitle')}</h2></div><a className="text-link" href={business.mapsUrl} target="_blank" rel="noreferrer">Google Maps <ArrowUpRight size={15}/></a></div>
          {testimonials.length ? <div className="reviews-grid">{testimonials.map((review) => <article className="review-card" key={review.id}><div className="stars">{Array.from({length: review.rating}).map((_, i) => <Star size={14} fill="currentColor" key={i}/>)}</div><p>“{review.review_text}”</p><div className="review-by"><span>{review.author_name}</span><small>{review.review_date ? new Date(`${review.review_date}T12:00:00`).toLocaleDateString(language === 'ka' ? 'ka-GE' : language === 'ru' ? 'ru-RU' : 'en-GB') : review.source}</small></div></article>)}</div> : <div className="reviews-empty"><span className="reviews-symbol"><Star size={23}/></span><p>{t('reviewsEmpty')}</p><a href={`https://search.google.com/local/writereview?placeid=${business.placeId}`} target="_blank" rel="noreferrer">{t('leaveReview')} <ArrowUpRight size={14}/></a></div>}
        </section>

        <section className="booking-section" id="booking"><div className="section-wrap booking-layout"><div className="booking-aside"><div className="eyebrow eyebrow-light"><span className="eyebrow-line"/>{t('bookingKicker')}</div><h2>{t('bookingTitle')}</h2><p>{t('bookingText')}</p><div className="booking-aside-note"><CalendarDays size={20}/><span>{t('bookingAsideNote')}</span></div><div className="booking-deco"><PawPrint size={104}/></div></div><BookingForm business={business} services={services} language={language} t={t}/></div></section>

        <section className="section section-wrap faq-section"><div className="faq-title"><div className="eyebrow"><span className="eyebrow-line"/>{t('faqKicker')}</div><h2>{t('faqTitle')}</h2></div><div className="faq-list">{faqs.length ? faqs.map((faq) => <details key={faq.id}><summary>{faq.question}<span>+</span></summary><p>{faq.answer}</p></details>) : <div className="faq-empty">{t('faqEmpty')}</div>}</div></section>

        <section className="location-section" id="location"><div className="section-wrap location-layout"><div className="location-copy"><div className="eyebrow"><span className="eyebrow-line"/>{t('locationKicker')}</div><h2>{t('locationTitle')}</h2><div className="location-address"><MapPin size={20}/><span>{t('address')}</span></div>{(business.phone || business.email || business.whatsappNumber) && <div className="location-contact">{business.phone && <a href={`tel:${business.phone}`}><Phone size={16}/>{business.phone}</a>}{business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}{business.whatsappNumber && <a href={`https://wa.me/${business.whatsappNumber}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/>{t('whatsapp')}</a>}</div>}<div className="hours-block"><h3>{t('openingHours')}</h3>{hours.some((hour) => hour.is_open) ? hours.map((hour) => <div className="hours-row" key={hour.weekday}><span>{weekdays[language][hour.weekday]}</span><strong>{hour.is_open ? `${String(hour.open_time).slice(0,5)} – ${String(hour.close_time).slice(0,5)}` : t('closed')}</strong></div>) : <p>{t('hoursUnknown')}</p>}</div><a className="button button-dark location-button" href={business.mapsUrl} target="_blank" rel="noreferrer">{t('directions')} <ArrowUpRight size={16}/></a></div><div className="map-frame"><iframe title={t('mapTitle')} src={`https://www.google.com/maps?q=place_id:${business.placeId}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/><div className="map-caption"><span><MapPin size={15}/> SHXAP GROOMING</span><a href={business.mapsUrl} target="_blank" rel="noreferrer">{t('openMaps')} <ArrowUpRight size={13}/></a></div></div></div></section>
      </main>

      <footer className="site-footer"><div className="section-wrap footer-main"><a className="brand brand-footer" href="#top"><span className="brand-mark"><img src="/shower-grooming-logo.png" alt="Shower Grooming logo" /></span><span>SHXAP<span className="brand-light"> GROOMING</span><small>BATUMI · GEORGIA</small></span></a><p>{t('footerLine')}</p><div className="footer-social"><a href={business.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram/></a><a href={business.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><span>♪</span></a></div></div><div className="section-wrap footer-bottom"><span>© {new Date().getFullYear()} SHXAP GROOMING. All rights reserved.</span><span><a href="/admin">{t('admin')}</a><span className="footer-dot"/>{t('batumi')}</span></div></footer>

      {siteError && <div className="site-warning" role="status">{t('siteWarning')}</div>}
      {lightbox && <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}><button onClick={() => setLightbox(null)} aria-label="Close image"><X/></button><img src={lightbox.image_url} alt={lightbox.alt_text}/></div>}
    </div>
  );
}

function BookingForm({ business, services, language, t }: { business: Business; services: Service[]; language: Language; t: (key: any) => string }) {
  const [petType, setPetType] = useState<'dog'|'cat'>('dog');
  const eligibleServices = useMemo(() => services.filter((service) => service.animal_type === 'both' || service.animal_type === petType), [services, petType]);
  const [serviceId, setServiceId] = useState('');
  const [selectedPrice, setSelectedPrice] = useState<{ category: string; item: string; price: string } | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ bookingId: string; whatsappUrl: string; customerEmailSent: boolean; ownerEmailSent: boolean } | null>(null);
  const [form, setForm] = useState({ petName: '', breed: '', weight: '', puppyAge: '', fullName: '', phone: '', email: '', notes: '' });
  const selectedService = eligibleServices.find((service) => service.id === serviceId);
  const weightNumber = Number(form.weight);
  const weightIsReady = petType === 'dog' && form.weight.trim() !== '' && Number.isFinite(weightNumber) && weightNumber > 0 && weightNumber <= 250;

  useEffect(() => {
    if (!eligibleServices.some((service) => service.id === serviceId)) setServiceId('');
  }, [petType, eligibleServices, serviceId]);

  useEffect(() => {
    setTime(''); setSlots([]);
    if (!serviceId || !date) return;
    let active = true;
    setSlotsLoading(true);
    api<{slots: string[]}>(`/api/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}`)
      .then((result) => { if (active) setSlots(result.slots); })
      .catch(() => { if (active) setSlots([]); })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [serviceId, date]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'weight' || key === 'puppyAge' || key === 'breed') {
      setSelectedPrice(null);
      setServiceId('');
      setDate('');
      setTime('');
    }
  }

  function choosePrice(categoryTitle: string, item: string, price: string) {
    const service = eligibleServices.find((entry) => entry.name.trim().toLocaleLowerCase() === categoryTitle.trim().toLocaleLowerCase());
    if (!service) {
      setFormError(`სერვისი „${categoryTitle}“ ჯერ არ არის აქტიური ადმინისტრატორის პანელში. გთხოვთ, დაუკავშირდეთ სალონს.`);
      return;
    }
    setFormError('');
    setSelectedPrice({ category: categoryTitle, item, price });
    setServiceId(service.id);
    setDate('');
    setTime('');
  }

  function hygienePrice(weight: number) {
    if (weight <= 4) return { label: 'ძაღლები, ≤4 კგ', price: '50 ₾' };
    if (weight <= 7) return { label: 'ძაღლები, ≤7 კგ', price: '55 ₾' };
    if (weight <= 14) return { label: 'ძაღლები, ≤14 კგ', price: '65 ₾' };
    return { label: 'ძაღლები, >14 კგ', price: '100+ ₾' };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(''); setSending(true);
    if (petType === 'dog' && !selectedPrice) {
      setFormError('ჯერ მიუთითეთ წონა და აირჩიეთ სასურველი მომსახურება და ფასი.');
      setSending(false);
      return;
    }
    const whatsappWindow = business.whatsappNumber ? window.open('about:blank', '_blank') : null;
    try {
      const priceSelection = selectedPrice ? `${selectedPrice.category} — ${selectedPrice.item} (${selectedPrice.price})` : '';
      const result = await api<{ bookingId: string; status: string; serviceName: string; customerEmailSent: boolean; ownerEmailSent: boolean }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...form, animalType: petType, serviceId, date, time, weight: form.weight, priceSelection }),
      });
      const message = [
        'Hello! I would like to request an appointment at SHXAP GROOMING.',
        `Pet: ${form.petName} (${petType})`, `Weight: ${form.weight || 'Not provided'} kg`, `Breed: ${form.breed || 'Not specified'}`,
        `Service: ${result.serviceName}`, priceSelection ? `Selected price: ${priceSelection}` : '',
        `Date: ${date}`, `Time: ${time}`, `Customer: ${form.fullName}`, `Phone: ${form.phone}`, `Email: ${form.email}`,
        form.notes ? `Additional information: ${form.notes}` : '',
        `Request ID: ${result.bookingId}`, 'Please confirm availability.',
      ].filter(Boolean).join('\n');
      const whatsappUrl = business.whatsappNumber ? `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(message)}` : '';
      if (whatsappWindow && whatsappUrl) whatsappWindow.location.href = whatsappUrl;
      else whatsappWindow?.close();
      setSent({ bookingId: result.bookingId, whatsappUrl, customerEmailSent: result.customerEmailSent, ownerEmailSent: result.ownerEmailSent });
    } catch (error) {
      whatsappWindow?.close();
      setFormError(error instanceof Error ? error.message : 'Could not send your request.');
    } finally { setSending(false); }
  }

  if (sent) return <div className="booking-form booking-success"><div className="success-icon"><Check size={30}/></div><div className="eyebrow"><span className="eyebrow-line"/> {t('bookingSuccess')}</div><h3>{t('bookingSuccessText')}</h3><p className="booking-id">Request ID · {sent.bookingId}</p>{sent.whatsappUrl ? <a className="button button-dark" href={sent.whatsappUrl} target="_blank" rel="noreferrer">{t('openWhatsapp')} <ArrowUpRight size={16}/></a> : <p className="whatsapp-note">{t('noWhatsapp')}</p>}<p className={`email-confirmation-note ${sent.customerEmailSent ? 'email-sent' : 'email-not-sent'}`}>{sent.customerEmailSent ? 'მოთხოვნის მიღების წერილი გამოგეგზავნათ მითითებულ ელფოსტაზე. ვიზიტი დადასტურდება სალონის პასუხის შემდეგ.' : 'მოთხოვნა შენახულია, მაგრამ ელფოსტის გაგზავნა ვერ მოხერხდა. გადაამოწმეთ ელფოსტა ან დაგვიკავშირდით ტელეფონით.'}</p>{!sent.ownerEmailSent && <p className="email-warning">სალონის ელფოსტაზე შეტყობინება ვერ გაიგზავნა; მოთხოვნა მაინც შენახულია ადმინისტრატორის პანელში.</p>}<button className="text-link" onClick={() => { setSent(null); setDate(''); setTime(''); setServiceId(''); setSelectedPrice(null); setForm({petName:'',breed:'',weight:'',puppyAge:'',fullName:'',phone:'',email:'',notes:''}); }}>{language === 'ka' ? 'ახალი მოთხოვნის შექმნა' : language === 'ru' ? 'Создать новый запрос' : 'Make another request'} <ArrowRight size={15}/></button></div>;

  const hygiene = weightIsReady ? hygienePrice(weightNumber) : null;
  const dogCategories = pricingGroups.map((group, index) => ({
    ...group,
    index,
    options: index === 1 && hygiene ? [[hygiene.label, hygiene.price] as [string, string]] : group.items as [string, string][],
  }));

  return <form className="booking-form" onSubmit={submit}>
    <div className="form-topline"><span>01 / 03</span><span>{t('appointmentRequest')}</span></div>
    {formError && <div className="form-error" role="alert">{formError}</div>}
    <div className="form-grid">
      <label className="field field-wide"><span>{t('petType')} *</span><div className="pet-toggle"><button type="button" className={petType === 'dog' ? 'selected' : ''} onClick={() => { setPetType('dog'); setSelectedPrice(null); setServiceId(''); setDate(''); setTime(''); }}>{<Dog size={17}/>}{t('dog')}</button><button type="button" className={petType === 'cat' ? 'selected' : ''} onClick={() => { setPetType('cat'); setSelectedPrice(null); setServiceId(''); setDate(''); setTime(''); }}>{<Cat size={17}/>}{t('cat')}</button></div></label>
      {petType === 'dog' ? <>
        <label className="field field-wide booking-weight-field"><span>ძაღლის წონა (კგ) *</span><input required type="number" min="0.1" max="250" step="0.1" value={form.weight} onChange={(event) => update('weight', event.target.value)} placeholder="მაგ. 6.5" inputMode="decimal"/><small className="field-hint">მიუთითეთ წონა — ამის შემდეგ გამოჩნდება შესაფერისი მომსახურებები და ფასები.</small></label>
        <label className="field"><span>{t('petName')} *</span><input required maxLength={60} value={form.petName} onChange={(event) => update('petName', event.target.value)} placeholder="Max" /></label>
        <label className="field"><span>{t('breed')} *</span><input required maxLength={100} value={form.breed} onChange={(event) => update('breed', event.target.value)} placeholder="მაგ. პუდელი" /></label>
        <label className="field"><span>ლეკვის ასაკი (თვე), თუ 6 თვეზე ნაკლებია</span><input type="number" min="1" max="72" step="1" value={form.puppyAge} onChange={(event) => update('puppyAge', event.target.value)} placeholder="მაგ. 4"/></label>
        {weightIsReady ? <div className="booking-catalog field-wide">
          <div className="booking-catalog-heading"><span className="eyebrow-line"/><div><strong>აირჩიეთ მომსახურება</strong><small>წონა: {weightNumber} კგ · აირჩიეთ კონკრეტული ჯიში / ზომა და ფასი</small></div></div>
          <div className="booking-catalog-list">{dogCategories.map((group) => {
            const isPuppy = group.index === 0;
            const puppyAllowed = form.puppyAge.trim() !== '' && Number(form.puppyAge) > 0 && Number(form.puppyAge) <= 6;
            const isDisabled = isPuppy && !puppyAllowed;
            return <section className={`booking-catalog-card ${selectedPrice?.category === group.title ? 'catalog-selected' : ''} ${isDisabled ? 'catalog-disabled' : ''}`} key={group.title}>
              <div className="booking-catalog-card-head"><div><span className="catalog-number">0{group.index + 1} / SHXAP GROOMING</span><h4>{group.title}</h4>{group.desc && <p>{group.desc}</p>}</div>{selectedPrice?.category === group.title && <span className="catalog-check"><Check size={15}/></span>}</div>
              {isPuppy && !puppyAllowed && <p className="catalog-hint">ამ სერვისისთვის მიუთითეთ ლეკვის ასაკი — 6 თვემდე.</p>}
              <div className="catalog-price-options">{group.options.map(([label, price]) => {
                const isChoice = selectedPrice?.category === group.title && selectedPrice.item === label;
                return <button type="button" className={`catalog-price-option ${isChoice ? 'option-selected' : ''}`} key={label} disabled={isDisabled} aria-pressed={isChoice} onClick={() => choosePrice(group.title, label, price)}><span>{label}</span><strong>{price}</strong>{isChoice && <Check size={15}/>}</button>;
              })}</div>
            </section>;
          })}</div>
        </div> : <div className="weight-prompt field-wide"><Dog size={20}/><span>შეიყვანეთ ძაღლის წონა, რომ გამოჩნდეს დასაჯავშნი მომსახურებები.</span></div>}
      </> : <>
        <label className="field"><span>{t('petName')} *</span><input required maxLength={60} value={form.petName} onChange={(event) => update('petName', event.target.value)} placeholder="Max" /></label>
        <label className="field"><span>{t('breed')}</span><input maxLength={100} value={form.breed} onChange={(event) => update('breed', event.target.value)} /></label>
        <label className="field"><span>{t('weight')}</span><input type="number" min="0.1" max="250" step="0.1" value={form.weight} onChange={(event) => update('weight', event.target.value)} /></label>
        <label className="field field-wide"><span>{t('service')} *</span><select required value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSelectedPrice(null); }}><option value="">{t('chooseService')}</option>{eligibleServices.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}</select></label>
        {!eligibleServices.length && <p className="field-hint field-wide">კატების მომსახურებებზე ფასისა და ჩაწერისთვის დაგვიკავშირდით ტელეფონით.</p>}
      </>}
      <label className="field field-wide"><span>{t('date')} *</span><input type="date" required min={localToday()} value={date} onChange={(event) => setDate(event.target.value)} disabled={!serviceId}/></label>
      <label className="field"><span>{t('time')} *</span><select required value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || !serviceId || slotsLoading}><option value="">{t('chooseTime')}</option>{slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select>{slotsLoading && <small className="field-hint">{t('loadingSlots')}</small>}{date && serviceId && !slotsLoading && !slots.length && <small className="field-hint">{t('noSlots')}</small>}</label>
      <div className="form-divider"><span>{t('yourDetails')}</span></div>
      <label className="field"><span>{t('fullName')} *</span><input required minLength={2} maxLength={100} value={form.fullName} onChange={(event) => update('fullName', event.target.value)} autoComplete="name" /></label>
      <label className="field"><span>{t('phone')} *</span><input required type="tel" minLength={7} maxLength={30} value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" placeholder="+995 5XX XX XX XX" /></label>
      <label className="field field-wide email-required-field"><span>ელფოსტა — აქ გამოგეგზავნებათ ჩაწერის სტატუსი *</span><input required type="email" maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" placeholder="თქვენი ელფოსტა, მაგ. name@gmail.com"/><small className="field-hint">ელფოსტა სავალდებულოა, რომ მიიღოთ მოთხოვნის მიღებისა და დადასტურების შეტყობინებები.</small></label>
      <label className="field field-wide"><span>{t('notes')}</span><textarea rows={3} maxLength={1000} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder={t('notesPlaceholder')}/></label>
    </div>
    <div className="booking-submit-row"><button className="button button-dark" type="submit" disabled={sending || !selectedService || !time || (petType === 'dog' && !selectedPrice)}>{sending ? t('submitting') : t('submit')} <ArrowUpRight size={16}/></button><span><ShieldCheck size={15}/> {t('privacy')}</span></div>
    {!services.length && <div className="no-service-note">სერვისების სიის ჩატვირთვა ვერ მოხერხდა. გთხოვთ, სცადოთ მოგვიანებით ან დაგვიკავშირდეთ.</div>}
  </form>;
}

export default App;
