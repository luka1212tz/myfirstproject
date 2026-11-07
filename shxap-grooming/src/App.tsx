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
  name: 'SHXAP GROOMING', address: 'Z. Gorgiladze N2, Batumi, Georgia', phone: '', whatsappNumber: '', email: '', intro: '',
  mapsUrl: 'https://maps.app.goo.gl/uv7vUPoXWYzSyGrb7', placeId: 'ChIJcXQBEAd4B0AR2Y7XOG8Z0Zg',
  instagram: 'https://www.instagram.com/showergrooming/', tiktok: 'https://www.tiktok.com/@shxapgrooming',
};

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
        <a className="brand" href="#top" aria-label="SHXAP GROOMING home"><span className="brand-mark"><PawPrint size={23}/></span><span>SHXAP<span className="brand-light"> GROOMING</span><small>BATUMI · GEORGIA</small></span></a>
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
          <div className="hero-visual" aria-label="Illustration of a happy pet, created for the SHXAP GROOMING website">
            <div className="hero-visual-backdrop"/>
            <div className="hero-stamp"><span>{t('stampTop')}</span><PawPrint size={21}/><span>{t('stampBottom')}</span></div>
            <svg className="pet-portrait" viewBox="0 0 520 560" role="img" aria-label="Decorative illustration of a fluffy dog">
              <defs><clipPath id="portraitClip"><circle cx="260" cy="270" r="220"/></clipPath></defs>
              <g clipPath="url(#portraitClip)">
                <circle cx="260" cy="270" r="220" fill="#d6a57d"/>
                <path d="M80 150 C35 75 4 100 25 220 C36 285 92 310 135 275Z" fill="#76513f"/>
                <path d="M440 150 C485 75 516 100 495 220 C484 285 428 310 385 275Z" fill="#76513f"/>
                <path d="M115 185 C115 90 180 60 260 65 C340 60 405 90 405 185 L410 350 C390 475 330 505 260 505 C190 505 130 475 110 350Z" fill="#f1e3cf"/>
                <path d="M155 260 C135 220 159 188 194 195 C224 202 230 237 214 268 C194 293 172 288 155 260Z" fill="#fff8ec"/>
                <path d="M305 260 C290 220 310 188 345 195 C375 202 385 237 365 268 C345 293 322 288 305 260Z" fill="#fff8ec"/>
                <ellipse cx="192" cy="260" rx="12" ry="17" fill="#2c2925"/><ellipse cx="338" cy="260" rx="12" ry="17" fill="#2c2925"/>
                <circle cx="196" cy="254" r="4" fill="#fff"/><circle cx="342" cy="254" r="4" fill="#fff"/>
                <ellipse cx="260" cy="338" rx="48" ry="35" fill="#3d302a"/>
                <path d="M260 367 C248 397 218 400 202 380 M260 367 C272 397 302 400 318 380" fill="none" stroke="#7c5345" strokeWidth="8" strokeLinecap="round"/>
                <path d="M113 343 C140 312 171 313 192 347 C216 384 179 423 146 402 C124 388 104 365 113 343Z" fill="#fff8ec"/>
                <path d="M407 343 C380 312 349 313 328 347 C304 384 341 423 374 402 C396 388 416 365 407 343Z" fill="#fff8ec"/>
                <path d="M160 118 C181 79 216 89 230 125 C207 151 177 153 160 118Z M290 124 C305 87 344 82 360 120 C345 152 310 154 290 124Z" fill="#fff8ec"/>
                <path d="M150 450 C197 489 323 489 370 450 L410 560 L110 560Z" fill="#55766a"/>
              </g>
            </svg>
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

        <section className="why-section">
          <div className="section-wrap why-inner"><div className="why-heading"><div className="eyebrow"><span className="eyebrow-line"/>{t('whyKicker')}</div><h2>{t('whyTitle')}</h2></div><div className="why-grid"><article><span className="why-index">01</span><div className="why-icon"><Heart size={21}/></div><h3>{t('why1')}</h3><p>{t('why1Text')}</p></article><article><span className="why-index">02</span><div className="why-icon"><PawPrint size={21}/></div><h3>{t('why2')}</h3><p>{t('why2Text')}</p></article><article><span className="why-index">03</span><div className="why-icon"><CalendarDays size={21}/></div><h3>{t('why3')}</h3><p>{t('why3Text')}</p></article></div></div>
        </section>

        <section className="section section-wrap process-section"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{t('processKicker')}</div><h2>{t('processTitle')}</h2></div><span className="process-mark"><PawPrint size={42}/></span></div><div className="process-grid"><article><span>01</span><div className="process-icon"><Scissors/></div><h3>{t('step1')}</h3><p>{t('step1Text')}</p></article><article><span>02</span><div className="process-icon"><Send/></div><h3>{t('step2')}</h3><p>{t('step2Text')}</p></article><article><span>03</span><div className="process-icon"><ShieldCheck/></div><h3>{t('step3')}</h3><p>{t('step3Text')}</p></article></div></section>

        <section className="gallery-section" id="gallery"><div className="section-wrap"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{t('galleryKicker')}</div><h2>{t('galleryTitle')}</h2></div><a className="text-link" href={business.instagram} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={15}/></a></div>
          {gallery.length ? <div className="gallery-grid">{gallery.map((image, index) => <button key={image.id} className={`gallery-tile gallery-tile-${index % 4}`} onClick={() => setLightbox(image)}><img src={image.image_url} alt={image.alt_text || 'SHXAP GROOMING pet grooming gallery'} loading="lazy"/><span><ArrowUpRight size={18}/></span></button>)}</div> : <div className="gallery-empty"><div className="gallery-paw"><PawPrint size={58}/></div><div><h3>{t('galleryEmpty')}</h3><p>{t('galleryPrompt')}</p><div className="social-links"><a href={business.instagram} target="_blank" rel="noreferrer"><Instagram size={16}/> Instagram</a><a href={business.tiktok} target="_blank" rel="noreferrer"><span className="tiktok-glyph">♪</span> TikTok</a></div></div></div>}
        </div></section>

        <section className="section section-wrap reviews-section" id="reviews"><div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{t('reviewsKicker')}</div><h2>{t('reviewsTitle')}</h2></div><a className="text-link" href={business.mapsUrl} target="_blank" rel="noreferrer">Google Maps <ArrowUpRight size={15}/></a></div>
          {testimonials.length ? <div className="reviews-grid">{testimonials.map((review) => <article className="review-card" key={review.id}><div className="stars">{Array.from({length: review.rating}).map((_, i) => <Star size={14} fill="currentColor" key={i}/>)}</div><p>“{review.review_text}”</p><div className="review-by"><span>{review.author_name}</span><small>{review.review_date ? new Date(`${review.review_date}T12:00:00`).toLocaleDateString(language === 'ka' ? 'ka-GE' : language === 'ru' ? 'ru-RU' : 'en-GB') : review.source}</small></div></article>)}</div> : <div className="reviews-empty"><span className="reviews-symbol"><Star size={23}/></span><p>{t('reviewsEmpty')}</p><a href={`https://search.google.com/local/writereview?placeid=${business.placeId}`} target="_blank" rel="noreferrer">{t('leaveReview')} <ArrowUpRight size={14}/></a></div>}
        </section>

        <section className="booking-section" id="booking"><div className="section-wrap booking-layout"><div className="booking-aside"><div className="eyebrow eyebrow-light"><span className="eyebrow-line"/>{t('bookingKicker')}</div><h2>{t('bookingTitle')}</h2><p>{t('bookingText')}</p><div className="booking-aside-note"><CalendarDays size={20}/><span>{t('bookingAsideNote')}</span></div><div className="booking-deco"><PawPrint size={104}/></div></div><BookingForm business={business} services={services} language={language} t={t}/></div></section>

        <section className="section section-wrap faq-section"><div className="faq-title"><div className="eyebrow"><span className="eyebrow-line"/>{t('faqKicker')}</div><h2>{t('faqTitle')}</h2></div><div className="faq-list">{faqs.length ? faqs.map((faq) => <details key={faq.id}><summary>{faq.question}<span>+</span></summary><p>{faq.answer}</p></details>) : <div className="faq-empty">{t('faqEmpty')}</div>}</div></section>

        <section className="location-section" id="location"><div className="section-wrap location-layout"><div className="location-copy"><div className="eyebrow"><span className="eyebrow-line"/>{t('locationKicker')}</div><h2>{t('locationTitle')}</h2><div className="location-address"><MapPin size={20}/><span>{t('address')}</span></div>{(business.phone || business.email || business.whatsappNumber) && <div className="location-contact">{business.phone && <a href={`tel:${business.phone}`}><Phone size={16}/>{business.phone}</a>}{business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}{business.whatsappNumber && <a href={`https://wa.me/${business.whatsappNumber}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/>{t('whatsapp')}</a>}</div>}<div className="hours-block"><h3>{t('openingHours')}</h3>{hours.some((hour) => hour.is_open) ? hours.map((hour) => <div className="hours-row" key={hour.weekday}><span>{weekdays[language][hour.weekday]}</span><strong>{hour.is_open ? `${String(hour.open_time).slice(0,5)} – ${String(hour.close_time).slice(0,5)}` : t('closed')}</strong></div>) : <p>{t('hoursUnknown')}</p>}</div><a className="button button-dark location-button" href={business.mapsUrl} target="_blank" rel="noreferrer">{t('directions')} <ArrowUpRight size={16}/></a></div><div className="map-frame"><iframe title={t('mapTitle')} src={`https://www.google.com/maps?q=place_id:${business.placeId}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/><div className="map-caption"><span><MapPin size={15}/> SHXAP GROOMING</span><a href={business.mapsUrl} target="_blank" rel="noreferrer">{t('openMaps')} <ArrowUpRight size={13}/></a></div></div></div></section>
      </main>

      <footer className="site-footer"><div className="section-wrap footer-main"><a className="brand brand-footer" href="#top"><span className="brand-mark"><PawPrint size={23}/></span><span>SHXAP<span className="brand-light"> GROOMING</span><small>BATUMI · GEORGIA</small></span></a><p>{t('footerLine')}</p><div className="footer-social"><a href={business.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram/></a><a href={business.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><span>♪</span></a></div></div><div className="section-wrap footer-bottom"><span>© {new Date().getFullYear()} SHXAP GROOMING. All rights reserved.</span><span><a href="/admin">{t('admin')}</a><span className="footer-dot"/>{t('batumi')}</span></div></footer>

      {siteError && <div className="site-warning" role="status">{t('siteWarning')}</div>}
      {lightbox && <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}><button onClick={() => setLightbox(null)} aria-label="Close image"><X/></button><img src={lightbox.image_url} alt={lightbox.alt_text}/></div>}
    </div>
  );
}

function BookingForm({ business, services, language, t }: { business: Business; services: Service[]; language: Language; t: (key: any) => string }) {
  const [petType, setPetType] = useState<'dog'|'cat'>('dog');
  const eligibleServices = useMemo(() => services.filter((service) => service.animal_type === 'both' || service.animal_type === petType), [services, petType]);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ bookingId: string; whatsappUrl: string } | null>(null);
  const [form, setForm] = useState({ petName: '', breed: '', weight: '', fullName: '', phone: '', notes: '' });
  const selectedService = eligibleServices.find((service) => service.id === serviceId);

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
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(''); setSending(true);
    const whatsappWindow = business.whatsappNumber ? window.open('about:blank', '_blank') : null;
    try {
      const result = await api<{ bookingId: string; status: string; serviceName: string }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...form, animalType: petType, serviceId, date, time, weight: form.weight }),
      });
      const message = [
        'Hello! I would like to request an appointment at SHXAP GROOMING.',
        `Pet: ${form.petName} (${petType})`, `Breed: ${form.breed || 'Not specified'}`,
        `Service: ${result.serviceName}`, `Date: ${date}`, `Time: ${time}`,
        `Customer: ${form.fullName}`, `Phone: ${form.phone}`,
        form.notes ? `Additional information: ${form.notes}` : '',
        `Request ID: ${result.bookingId}`, 'Please confirm availability.',
      ].filter(Boolean).join('\n');
      const whatsappUrl = business.whatsappNumber ? `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(message)}` : '';
      if (whatsappWindow && whatsappUrl) whatsappWindow.location.href = whatsappUrl;
      else whatsappWindow?.close();
      setSent({ bookingId: result.bookingId, whatsappUrl });
    } catch (error) {
      whatsappWindow?.close();
      setFormError(error instanceof Error ? error.message : 'Could not send your request.');
    } finally { setSending(false); }
  }

  if (sent) return <div className="booking-form booking-success"><div className="success-icon"><Check size={30}/></div><div className="eyebrow"><span className="eyebrow-line"/> {t('bookingSuccess')}</div><h3>{t('bookingSuccessText')}</h3><p className="booking-id">Request ID · {sent.bookingId}</p>{sent.whatsappUrl ? <a className="button button-dark" href={sent.whatsappUrl} target="_blank" rel="noreferrer">{t('openWhatsapp')} <ArrowUpRight size={16}/></a> : <p className="whatsapp-note">{t('noWhatsapp')}</p>}<button className="text-link" onClick={() => { setSent(null); setDate(''); setTime(''); setForm({petName:'',breed:'',weight:'',fullName:'',phone:'',notes:''}); }}>{language === 'ka' ? 'ახალი მოთხოვნის შექმნა' : language === 'ru' ? 'Создать новый запрос' : 'Make another request'} <ArrowRight size={15}/></button></div>;

  return <form className="booking-form" onSubmit={submit}>
    <div className="form-topline"><span>01 / 02</span><span>{t('appointmentRequest')}</span></div>
    {formError && <div className="form-error" role="alert">{formError}</div>}
    <div className="form-grid">
      <label className="field field-wide"><span>{t('petType')} *</span><div className="pet-toggle"><button type="button" className={petType === 'dog' ? 'selected' : ''} onClick={() => setPetType('dog')}><Dog size={17}/>{t('dog')}</button><button type="button" className={petType === 'cat' ? 'selected' : ''} onClick={() => setPetType('cat')}><Cat size={17}/>{t('cat')}</button></div></label>
      <label className="field"><span>{t('service')} *</span><select required value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">{t('chooseService')}</option>{eligibleServices.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}</select></label>
      <label className="field"><span>{t('petName')} *</span><input required maxLength={60} value={form.petName} onChange={(event) => update('petName', event.target.value)} placeholder="Max" /></label>
      <label className="field"><span>{t('breed')}</span><input maxLength={100} value={form.breed} onChange={(event) => update('breed', event.target.value)} placeholder="Golden Retriever" /></label>
      <label className="field"><span>{t('weight')}</span><input type="number" min="0.1" max="250" step="0.1" value={form.weight} onChange={(event) => update('weight', event.target.value)} placeholder="12" /></label>
      <label className="field"><span>{t('date')} *</span><input type="date" required min={localToday()} value={date} onChange={(event) => setDate(event.target.value)} disabled={!serviceId}/></label>
      <label className="field"><span>{t('time')} *</span><select required value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || !serviceId || slotsLoading}><option value="">{t('chooseTime')}</option>{slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select>{slotsLoading && <small className="field-hint">{t('loadingSlots')}</small>}{date && serviceId && !slotsLoading && !slots.length && <small className="field-hint">{t('noSlots')}</small>}</label>
      <div className="form-divider"><span>{t('yourDetails')}</span></div>
      <label className="field"><span>{t('fullName')} *</span><input required minLength={2} maxLength={100} value={form.fullName} onChange={(event) => update('fullName', event.target.value)} autoComplete="name" /></label>
      <label className="field"><span>{t('phone')} *</span><input required type="tel" minLength={7} maxLength={30} value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" placeholder="+995 5XX XX XX XX" /></label>
      <label className="field field-wide"><span>{t('notes')}</span><textarea rows={3} maxLength={1000} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder={t('notesPlaceholder')}/></label>
    </div>
    <div className="booking-submit-row"><button className="button button-dark" type="submit" disabled={sending || !selectedService || !time}>{sending ? t('submitting') : t('submit')} <ArrowUpRight size={16}/></button><span><ShieldCheck size={15}/> {t('privacy')}</span></div>
    {!services.length && <div className="no-service-note">{t('noDetails')}</div>}
  </form>;
}

export default App;
