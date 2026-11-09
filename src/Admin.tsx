import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft, CalendarDays, Check, Clock3, ImagePlus, LogOut, PawPrint, Plus, Save,
  Settings2, Star, Trash2, Users, X, Scissors, LayoutDashboard, CalendarOff,
} from 'lucide-react';
import { api } from './lib/api';

type Tab = 'overview'|'bookings'|'services'|'hours'|'content'|'gallery'|'reviews'|'faqs';
const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const blankService = { id:'', name:'', description:'', animal_type:'dog', price:'', duration_minutes:60, image_url:'', is_active:false, sort_order:0 };

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [bookingQuery, setBookingQuery] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [serviceForm, setServiceForm] = useState<any>(blankService);
  const [settingsForm, setSettingsForm] = useState({ phone:'', whatsapp_number:'', email:'', intro:'' });
  const [hoursForm, setHoursForm] = useState<any[]>(dayNames.map((_, weekday) => ({ weekday, is_open:false, open_time:'09:00', close_time:'18:00' })));
  const [blockedDate, setBlockedDate] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [galleryUrl, setGalleryUrl] = useState('');
  const [galleryAlt, setGalleryAlt] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('dogs');
  const [uploading, setUploading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ authorName:'', reviewText:'', rating:5, reviewDate:'', source:'Owner-added testimonial' });
  const [faqForm, setFaqForm] = useState({ id:'', question:'', answer:'', isPublished:true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/api/admin').then((result: any) => { setLoggedIn(true); setData(result); hydrate(result); }).catch(() => undefined);
  }, []);

  function hydrate(result: any) {
    if (result.settings) setSettingsForm({ phone:result.settings.phone || '', whatsapp_number:result.settings.whatsapp_number || '', email:result.settings.email || '', intro:result.settings.intro || '' });
    if (Array.isArray(result.hours) && result.hours.length) {
      setHoursForm(dayNames.map((_, weekday) => {
        const row = result.hours.find((item: any) => Number(item.weekday) === weekday);
        return { weekday, is_open:Boolean(row?.is_open), open_time:String(row?.open_time || '09:00').slice(0,5), close_time:String(row?.close_time || '18:00').slice(0,5) };
      }));
    }
  }

  async function refresh() {
    const result = await api<any>('/api/admin');
    setData(result); hydrate(result);
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      await api('/api/admin/login', { method:'POST', body:JSON.stringify({ email, password }) });
      const result = await api<any>('/api/admin'); setLoggedIn(true); setData(result); hydrate(result);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in.'); }
    finally { setLoading(false); }
  }

  async function logout() {
    await api('/api/admin/logout', { method:'POST', body:'{}' }).catch(() => undefined);
    window.location.href = '/';
  }

  async function sendAction(payload: any): Promise<boolean> {
    setSaving(true); setError('');
    try { await api('/api/admin', { method:'POST', body:JSON.stringify(payload) }); await refresh(); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save the change.'); return false; }
    finally { setSaving(false); }
  }

  async function saveService(event: FormEvent) {
    event.preventDefault();
    const saved = await sendAction({ action:'service.save', ...serviceForm, durationMinutes:Number(serviceForm.duration_minutes), animalType:serviceForm.animal_type, imageUrl:serviceForm.image_url, isActive:Boolean(serviceForm.is_active), price:serviceForm.price });
    if (saved) setServiceForm(blankService);
  }

  async function saveHours(event: FormEvent) {
    event.preventDefault();
    await sendAction({ action:'hours.save', hours:hoursForm.map((row) => ({ weekday:row.weekday, isOpen:row.is_open, openTime:row.open_time, closeTime:row.close_time })) });
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await sendAction({ action:'settings.save', phone:settingsForm.phone, whatsappNumber:settingsForm.whatsapp_number, email:settingsForm.email, intro:settingsForm.intro });
  }

  async function addGallery(event: FormEvent) {
    event.preventDefault();
    const saved = await sendAction({ action:'gallery.save', imageUrl:galleryUrl, altText:galleryAlt, category:galleryCategory });
    if (saved) { setGalleryUrl(''); setGalleryAlt(''); }
  }

  async function uploadGallery(file?: File) {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const { upload } = await import('@vercel/blob/client');
      const optimized = await optimizeImage(file);
      const uploadName = file.name.replace(/\.[^.]+$/, '') + '.webp';
      const blob = await upload(uploadName, optimized, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
        clientPayload: JSON.stringify({ category:galleryCategory }),
      });
      await sendAction({ action:'gallery.save', imageUrl:blob.url, altText:galleryAlt || file.name.replace(/\.[^.]+$/, ''), category:galleryCategory });
    } catch (err) { setError(err instanceof Error ? err.message : 'Image upload failed. Set BLOB_READ_WRITE_TOKEN in Vercel first.'); }
    finally { setUploading(false); }
  }

  async function addReview(event: FormEvent) {
    event.preventDefault();
    const saved = await sendAction({ action:'testimonial.save', ...reviewForm, isPublished:true });
    if (saved) setReviewForm({ authorName:'', reviewText:'', rating:5, reviewDate:'', source:'Owner-added testimonial' });
  }

  async function saveFaq(event: FormEvent) {
    event.preventDefault();
    const saved = await sendAction({ action:'faq.save', ...faqForm });
    if (saved) setFaqForm({ id:'', question:'', answer:'', isPublished:true });
  }

  const bookings = [...(data?.bookings || [])].sort((a:any,b:any) => new Date(b.created_at || b.starts_at).getTime() - new Date(a.created_at || a.starts_at).getTime());
  const pending = bookings.filter((booking: any) => booking.status === 'pending').length;
  const confirmed = bookings.filter((booking: any) => booking.status === 'confirmed').length;
  const today = new Date().toLocaleDateString('en-CA', { timeZone:'Asia/Tbilisi' });
  const todayBookings = bookings.filter((booking: any) => new Date(booking.starts_at).toLocaleDateString('en-CA', { timeZone:'Asia/Tbilisi' }) === today);
  const thisMonth = today.slice(0, 7);
  const monthBookings = bookings.filter((booking: any) => new Date(booking.starts_at).toLocaleDateString('en-CA', { timeZone:'Asia/Tbilisi' }).slice(0, 7) === thisMonth);
  const filteredBookings = bookings.filter((booking: any) => {
    const query = bookingQuery.trim().toLowerCase();
    const matchesQuery = !query || [booking.full_name, booking.phone, booking.pet_name, booking.service_name].some((value) => String(value || '').toLowerCase().includes(query));
    return matchesQuery && (bookingFilter === 'all' || booking.status === bookingFilter);
  });

  function exportBookings() {
    const headers = ['Customer','Phone','Pet','Animal','Breed','Weight kg','Service','Start','End','Status','Notes'];
    const rows = filteredBookings.map((booking: any) => [booking.full_name, booking.phone, booking.pet_name, booking.animal_type, booking.breed, booking.approximate_weight, booking.service_name, booking.starts_at, booking.ends_at, booking.status, booking.customer_note]);
    const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
    const file = new Blob(['\uFEFF', csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = `shxap-bookings-${today}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  async function rescheduleBooking(booking: any) {
    const start = new Date(booking.starts_at);
    const currentDate = start.toLocaleDateString('en-CA', { timeZone:'Asia/Tbilisi' });
    const currentTime = start.toLocaleTimeString('en-GB', { timeZone:'Asia/Tbilisi', hour:'2-digit', minute:'2-digit' });
    const nextDate = window.prompt('New appointment date (YYYY-MM-DD):', currentDate);
    if (!nextDate) return;
    const nextTime = window.prompt('New appointment time (HH:MM):', currentTime);
    if (!nextTime) return;
    await sendAction({ action:'booking.reschedule', id:booking.id, date:nextDate, time:nextTime });
  }

  if (!loggedIn) return <div className="admin-login-page"><a className="back-home" href="/"><ArrowLeft size={16}/> Back to website</a><form className="login-card" onSubmit={login}><div className="login-logo"><span><PawPrint size={25}/></span><small>SHXAP GROOMING</small></div><div className="eyebrow"><span className="eyebrow-line"/> PRIVATE OWNER AREA</div><h1>Welcome back.</h1><p>Sign in to manage appointments and your website.</p>{error && <div className="form-error">{error}</div>}<label className="field"><span>Email address</span><input required type="email" autoComplete="username" value={email} onChange={(e)=>setEmail(e.target.value)}/></label><label className="field"><span>Password</span><input required type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)}/></label><button className="button button-dark login-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} <ArrowLeft className="arrow-flip" size={16}/></button><small className="login-help">Admin credentials are configured in your Vercel environment variables.</small></form></div>;

  return <div className="admin-layout">
    <aside className="admin-sidebar"><a className="brand admin-brand" href="/"><span className="brand-mark"><PawPrint size={22}/></span><span>SHXAP<span className="brand-light"> GROOMING</span><small>OWNER DASHBOARD</small></span></a><div className="admin-side-label">WORKSPACE</div><nav className="admin-nav">
      <AdminNavItem icon={<LayoutDashboard size={17}/>} label="Overview" active={tab==='overview'} onClick={()=>setTab('overview')}/>
      <AdminNavItem icon={<CalendarDays size={17}/>} label="Bookings" count={pending} active={tab==='bookings'} onClick={()=>setTab('bookings')}/>
      <AdminNavItem icon={<Scissors size={17}/>} label="Services & prices" active={tab==='services'} onClick={()=>setTab('services')}/>
      <AdminNavItem icon={<Clock3 size={17}/>} label="Availability" active={tab==='hours'} onClick={()=>setTab('hours')}/>
      <AdminNavItem icon={<Settings2 size={17}/>} label="Business details" active={tab==='content'} onClick={()=>setTab('content')}/>
      <AdminNavItem icon={<ImagePlus size={17}/>} label="Photo gallery" active={tab==='gallery'} onClick={()=>setTab('gallery')}/>
      <AdminNavItem icon={<Star size={17}/>} label="Testimonials" active={tab==='reviews'} onClick={()=>setTab('reviews')}/>
      <AdminNavItem icon={<CalendarOff size={17}/>} label="FAQs" active={tab==='faqs'} onClick={()=>setTab('faqs')}/>
    </nav><div className="admin-side-bottom"><div className="admin-avatar">S</div><span><strong>SHXAP GROOMING</strong><small>Owner account</small></span><button onClick={logout} aria-label="Log out"><LogOut size={17}/></button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><span className="admin-breadcrumb">Workspace / </span><strong>{tabTitle(tab)}</strong></div><div className="admin-top-actions"><a href="/" target="_blank" rel="noreferrer">View website <ArrowLeft className="arrow-diagonal" size={14}/></a><button onClick={refresh} title="Refresh data"><Clock3 size={16}/></button></div></header>
      <div className="admin-content">{error && <div className="admin-alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}{saving && <div className="save-indicator"><span/> Saving changes…</div>}
        {tab==='overview' && <><div className="admin-page-heading"><div><span className="eyebrow">YOUR SALON AT A GLANCE</span><h1>Overview</h1><p>Here’s what’s happening at SHXAP GROOMING.</p></div><a className="button button-dark" href="/" target="_blank" rel="noreferrer">View website <ArrowLeft className="arrow-diagonal" size={15}/></a></div><div className="stats-grid"><StatCard label="Total bookings" value={bookings.length} icon={<CalendarDays/>}/><StatCard label="Pending requests" value={pending} icon={<Clock3/>} accent/><StatCard label="Confirmed" value={confirmed} icon={<Check/>}/><StatCard label="Today" value={todayBookings.length} icon={<Users/>}/><StatCard label="This month" value={monthBookings.length} icon={<CalendarDays/>}/></div><div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><h2>Latest appointment requests</h2><p>New bookings and their current status.</p></div><button className="panel-link" onClick={()=>setTab('bookings')}>All bookings →</button></div><BookingTable bookings={bookings.slice(0,6)} updateStatus={(id,status)=>sendAction({action:'booking.status',id,status})} onReschedule={(booking)=>rescheduleBooking(booking)} onDelete={(id)=>{if(window.confirm('Permanently delete this booking?')) sendAction({action:'booking.delete',id});}}/></section><section className="admin-panel setup-panel"><div className="panel-heading"><div><h2>Finish setting up</h2><p>Complete these details before accepting bookings.</p></div></div><SetupTask done={Boolean(data?.settings?.phone)} label="Add a business phone number" onClick={()=>setTab('content')}/><SetupTask done={Boolean(data?.settings?.whatsapp_number)} label="Connect WhatsApp" onClick={()=>setTab('content')}/><SetupTask done={Boolean(data?.services?.length)} label="Add your services and prices" onClick={()=>setTab('services')}/><SetupTask done={data?.hours?.some((hour:any)=>hour.is_open)} label="Set your working hours" onClick={()=>setTab('hours')}/><SetupTask done={Boolean(data?.gallery?.length)} label="Add original salon photos" onClick={()=>setTab('gallery')}/></section></div></>}

        {tab==='bookings' && <><div className="admin-page-heading"><div><span className="eyebrow">SHXAP GROOMING · ADMIN</span><h1>Bookings</h1><p>Review requests, confirm appointments and manage your schedule.</p></div><button className="button button-dark" onClick={exportBookings}><Save size={14}/> Export CSV</button></div><section className="admin-panel"><div className="booking-filters"><input aria-label="Search bookings" placeholder="Search name, phone, pet or service…" value={bookingQuery} onChange={(e)=>setBookingQuery(e.target.value)}/><select aria-label="Filter booking status" value={bookingFilter} onChange={(e)=>setBookingFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><BookingTable bookings={filteredBookings} updateStatus={(id,status)=>sendAction({action:'booking.status',id,status})} onReschedule={(booking)=>rescheduleBooking(booking)} onDelete={(id)=>{if(window.confirm('Permanently delete this booking?')) sendAction({action:'booking.delete',id});}} full/></section></>}

        {tab==='services' && <><PageHeading title="Services & prices" subtitle="Only active services appear on the public website and booking form."/><div className="admin-two-col service-admin-layout"><section className="admin-panel"><div className="panel-heading"><div><h2>{serviceForm.id ? 'Edit service' : 'Add a service'}</h2><p>Prices can be left blank until confirmed.</p></div>{serviceForm.id && <button className="icon-button" onClick={()=>setServiceForm(blankService)}><X size={17}/></button>}</div><form className="admin-form-grid" onSubmit={saveService}><label className="field field-wide"><span>Service name *</span><input required value={serviceForm.name} onChange={(e)=>setServiceForm({...serviceForm,name:e.target.value})}/></label><label className="field field-wide"><span>Description</span><textarea rows={3} value={serviceForm.description} onChange={(e)=>setServiceForm({...serviceForm,description:e.target.value})}/></label><label className="field"><span>For</span><select value={serviceForm.animal_type} onChange={(e)=>setServiceForm({...serviceForm,animal_type:e.target.value})}><option value="dog">Dogs</option><option value="cat">Cats</option><option value="both">Dogs & cats</option></select></label><label className="field"><span>Duration (minutes) *</span><input type="number" min="15" max="480" step="15" required value={serviceForm.duration_minutes} onChange={(e)=>setServiceForm({...serviceForm,duration_minutes:Number(e.target.value)})}/></label><label className="field"><span>Price (₾)</span><input type="number" min="0" step="1" value={serviceForm.price} onChange={(e)=>setServiceForm({...serviceForm,price:e.target.value})} placeholder="Leave blank if not set"/></label><label className="field field-wide"><span>Service photo URL (HTTPS, optional)</span><input type="url" value={serviceForm.image_url} onChange={(e)=>setServiceForm({...serviceForm,image_url:e.target.value})} placeholder="https://…"/></label><label className="check-field"><input type="checkbox" checked={serviceForm.is_active} onChange={(e)=>setServiceForm({...serviceForm,is_active:e.target.checked})}/> Show on public website and allow booking</label><button className="button button-dark field-wide" disabled={saving}><Save size={15}/> {serviceForm.id?'Save service':'Add service'}</button></form></section><section className="admin-panel"><div className="panel-heading"><div><h2>Your services</h2><p>{data?.services?.length || 0} configured</p></div></div><div className="admin-service-list">{(data?.services||[]).map((service:any)=><div className="admin-service-row" key={service.id}><div className="admin-service-icon"><PawPrint size={18}/></div><div className="admin-service-info"><strong>{service.name}</strong><small>{service.animal_type} · {service.duration_minutes} min · {service.price == null ? 'Price not set' : `${service.price} ₾`}</small><span className={service.is_active?'state-active':'state-hidden'}>{service.is_active?'Published':'Hidden'}</span></div><button className="icon-button" onClick={()=>setServiceForm({...service,price:service.price ?? '',animal_type:service.animal_type})} title="Edit"><Settings2 size={16}/></button><button className="icon-button danger" onClick={()=>sendAction({action:'service.delete',id:service.id})} title="Hide service"><Trash2 size={16}/></button></div>)}{!data?.services?.length && <EmptyAdmin icon={<Scissors/>} text="No services added yet. Create the first one using the form."/>}</div></section></div></>}

        {tab==='hours' && <><PageHeading title="Availability" subtitle="Set opening hours and block dates when the salon cannot accept appointments."/><div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><h2>Weekly schedule</h2><p>Appointment slots are generated every 30 minutes.</p></div></div><form onSubmit={saveHours}><div className="hours-editor">{hoursForm.map((row,index)=><div className="hours-edit-row" key={row.weekday}><label className="day-toggle"><input type="checkbox" checked={row.is_open} onChange={(e)=>setHoursForm((current)=>current.map((r,i)=>i===index?{...r,is_open:e.target.checked}:r))}/><span>{dayNames[index]}</span></label>{row.is_open?<><input type="time" value={row.open_time} onChange={(e)=>setHoursForm((current)=>current.map((r,i)=>i===index?{...r,open_time:e.target.value}:r))}/><span className="hours-dash">to</span><input type="time" value={row.close_time} onChange={(e)=>setHoursForm((current)=>current.map((r,i)=>i===index?{...r,close_time:e.target.value}:r))}/></>:<span className="closed-label">Closed</span>}</div>)}</div><button className="button button-dark" disabled={saving}><Save size={15}/> Save working hours</button></form></section><section className="admin-panel"><div className="panel-heading"><div><h2>Block a date</h2><p>One-off dates when the salon is closed.</p></div><CalendarOff size={20}/></div><form className="block-date-form" onSubmit={(e)=>{e.preventDefault();sendAction({action:'blocked.add',date:blockedDate,reason:blockedReason});setBlockedDate('');setBlockedReason('')}}><label className="field"><span>Date</span><input type="date" min={new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Tbilisi'})} required value={blockedDate} onChange={(e)=>setBlockedDate(e.target.value)}/></label><label className="field"><span>Reason (optional)</span><input value={blockedReason} onChange={(e)=>setBlockedReason(e.target.value)} placeholder="Holiday, maintenance…"/></label><button className="button button-dark" disabled={saving}><Plus size={15}/> Block date</button></form><div className="blocked-list">{(data?.blockedDates||[]).map((item:any)=><div key={item.id}><span><strong>{new Date(`${item.blocked_date.slice(0,10)}T12:00:00`).toLocaleDateString()}</strong><small>{item.reason||'Unavailable'}</small></span><button className="icon-button danger" onClick={()=>sendAction({action:'blocked.delete',id:item.id})}><Trash2 size={15}/></button></div>)}{!data?.blockedDates?.length && <p className="muted-small">No dates blocked.</p>}</div></section></div></>}

        {tab==='content' && <><PageHeading title="Business details" subtitle="Keep contact information up to date. The business name, address and Maps listing are fixed to the supplied SHXAP listing."/><section className="admin-panel settings-panel"><form className="admin-form-grid" onSubmit={saveSettings}><label className="field"><span>Business phone</span><input type="tel" value={settingsForm.phone} onChange={(e)=>setSettingsForm({...settingsForm,phone:e.target.value})} placeholder="+995 …"/></label><label className="field"><span>WhatsApp number (international digits)</span><input value={settingsForm.whatsapp_number} onChange={(e)=>setSettingsForm({...settingsForm,whatsapp_number:e.target.value})} placeholder="9955XXXXXXXX"/></label><label className="field field-wide"><span>Business email</span><input type="email" value={settingsForm.email} onChange={(e)=>setSettingsForm({...settingsForm,email:e.target.value})} placeholder="hello@example.com"/></label><label className="field field-wide"><span>Homepage introduction</span><textarea rows={5} maxLength={1500} value={settingsForm.intro} onChange={(e)=>setSettingsForm({...settingsForm,intro:e.target.value})} placeholder="Write a short introduction to SHXAP GROOMING…"/></label><div className="settings-fixed field-wide"><div><strong>Business name</strong><span>SHXAP GROOMING</span></div><div><strong>Address</strong><span>Z. Gorgiladze N2, Batumi, Georgia</span></div><div><strong>Google Maps Place ID</strong><span>ChIJcXQBEAd4B0AR2Y7XOG8Z0Zg</span></div><div><strong>Instagram / TikTok</strong><span>@showergrooming / @shxapgrooming</span></div></div><button className="button button-dark field-wide" disabled={saving}><Save size={15}/> Save business details</button></form></section></>}

        {tab==='gallery' && <><PageHeading title="Photo gallery" subtitle="Use original SHXAP GROOMING photos only. Images added here appear on the public website."/><div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><h2>Add a photo</h2><p>Upload needs a Vercel Blob token, or paste a public HTTPS image URL.</p></div></div><form className="admin-form-grid" onSubmit={addGallery}><label className="field field-wide"><span>Photo URL (HTTPS)</span><input type="url" value={galleryUrl} onChange={(e)=>setGalleryUrl(e.target.value)} placeholder="https://…"/></label><label className="field field-wide"><span>Image description</span><input value={galleryAlt} onChange={(e)=>setGalleryAlt(e.target.value)} placeholder="A freshly groomed dog…"/></label><label className="field"><span>Category</span><select value={galleryCategory} onChange={(e)=>setGalleryCategory(e.target.value)}><option value="dogs">Dogs</option><option value="cats">Cats</option><option value="before-after">Before & after</option><option value="salon">Salon</option></select></label><button className="button button-dark" disabled={saving || !galleryUrl}>Add image URL <Plus size={15}/></button><div className="upload-drop field-wide"><ImagePlus size={25}/><strong>{uploading?'Uploading…':'Or upload an image'}</strong><small>JPG, PNG, WebP or AVIF. Up to 5 MB.</small><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={(e)=>uploadGallery(e.target.files?.[0])}/></div></form></section><section className="admin-panel"><div className="panel-heading"><div><h2>Published photos</h2><p>{data?.gallery?.length || 0} images</p></div></div><div className="admin-gallery-grid">{(data?.gallery||[]).map((image:any)=><div className="admin-gallery-item" key={image.id}><img src={image.image_url} alt={image.alt_text}/><button className="icon-button danger" onClick={()=>sendAction({action:'gallery.delete',id:image.id})}><Trash2 size={15}/></button><small>{image.category}</small></div>)}</div>{!data?.gallery?.length&&<EmptyAdmin icon={<ImagePlus/>} text="No photos yet. Add your own salon photos to make the gallery feel authentic."/>}</section></div></>}

        {tab==='reviews' && <><PageHeading title="Testimonials" subtitle="Add genuine customer feedback only. Do not present manually entered comments as verified Google reviews."/><div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><h2>Add a testimonial</h2><p>Use feedback provided by a real customer.</p></div></div><form className="admin-form-grid" onSubmit={addReview}><label className="field field-wide"><span>Customer name</span><input required value={reviewForm.authorName} onChange={(e)=>setReviewForm({...reviewForm,authorName:e.target.value})}/></label><label className="field field-wide"><span>Review text</span><textarea required rows={5} value={reviewForm.reviewText} onChange={(e)=>setReviewForm({...reviewForm,reviewText:e.target.value})}/></label><label className="field"><span>Rating</span><select value={reviewForm.rating} onChange={(e)=>setReviewForm({...reviewForm,rating:Number(e.target.value)})}><option value={5}>5 stars</option><option value={4}>4 stars</option><option value={3}>3 stars</option><option value={2}>2 stars</option><option value={1}>1 star</option></select></label><label className="field"><span>Date (optional)</span><input type="date" value={reviewForm.reviewDate} onChange={(e)=>setReviewForm({...reviewForm,reviewDate:e.target.value})}/></label><button className="button button-dark field-wide" disabled={saving}><Plus size={15}/> Add testimonial</button></form></section><section className="admin-panel"><div className="panel-heading"><div><h2>Current testimonials</h2><p>{data?.testimonials?.length || 0} entries</p></div></div><div className="admin-reviews">{(data?.testimonials||[]).map((review:any)=><div className="admin-review-row" key={review.id}><div><div className="stars">{'★'.repeat(review.rating)}</div><strong>{review.author_name}</strong><p>{review.review_text}</p><small>{review.source}</small></div><button className="icon-button danger" onClick={()=>sendAction({action:'testimonial.delete',id:review.id})}><Trash2 size={15}/></button></div>)}{!data?.testimonials?.length&&<EmptyAdmin icon={<Star/>} text="No testimonials added. Genuine feedback will appear here."/>}</div></section></div></>}
        {tab==='faqs' && <><PageHeading title="Frequently asked questions" subtitle="Add and edit answers customers need before booking."/><div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><h2>{faqForm.id?'Edit question':'Add a question'}</h2><p>Only published questions appear on the public website.</p></div>{faqForm.id && <button className="icon-button" onClick={()=>setFaqForm({id:'',question:'',answer:'',isPublished:true})}><X size={16}/></button>}</div><form className="admin-form-grid" onSubmit={saveFaq}><label className="field field-wide"><span>Question</span><input required minLength={4} maxLength={240} value={faqForm.question} onChange={(e)=>setFaqForm({...faqForm,question:e.target.value})}/></label><label className="field field-wide"><span>Answer</span><textarea required minLength={8} maxLength={1500} rows={5} value={faqForm.answer} onChange={(e)=>setFaqForm({...faqForm,answer:e.target.value})}/></label><label className="check-field field-wide"><input type="checkbox" checked={faqForm.isPublished} onChange={(e)=>setFaqForm({...faqForm,isPublished:e.target.checked})}/> Publish on public website</label><button className="button button-dark field-wide" disabled={saving}><Save size={15}/> {faqForm.id?'Save question':'Add question'}</button></form></section><section className="admin-panel"><div className="panel-heading"><div><h2>Current questions</h2><p>{data?.faqs?.length || 0} entries</p></div></div><div className="admin-reviews">{(data?.faqs||[]).map((faq:any)=><div className="admin-review-row" key={faq.id}><div><strong>{faq.question}</strong><p>{faq.answer}</p><small>{faq.is_published?'Published':'Hidden'}</small></div><button className="icon-button" title="Edit question" onClick={()=>setFaqForm({id:faq.id,question:faq.question,answer:faq.answer,isPublished:faq.is_published})}><Settings2 size={15}/></button><button className="icon-button danger" title="Delete question" onClick={()=>sendAction({action:'faq.delete',id:faq.id})}><Trash2 size={15}/></button></div>)}{!data?.faqs?.length&&<EmptyAdmin icon={<CalendarOff/>} text="No FAQs yet. Add the questions your customers ask most often."/>}</div></section></div></>}
      </div>
    </main>
  </div>;
}

function AdminNavItem({icon,label,active,count,onClick}:{icon:ReactNode;label:string;active:boolean;count?:number;onClick:()=>void}) { return <button className={`admin-nav-item ${active?'active':''}`} onClick={onClick}>{icon}<span>{label}</span>{Boolean(count)&&<b>{count}</b>}</button>; }
function StatCard({label,value,icon,accent}:{label:string;value:number;icon:ReactNode;accent?:boolean}) { return <div className={`stat-card ${accent?'stat-accent':''}`}><span className="stat-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function PageHeading({title,subtitle}:{title:string;subtitle:string}) { return <div className="admin-page-heading"><div><span className="eyebrow">SHXAP GROOMING · ADMIN</span><h1>{title}</h1><p>{subtitle}</p></div></div>; }
function tabTitle(tab:Tab) { return ({overview:'Overview',bookings:'Bookings',services:'Services & prices',hours:'Availability',content:'Business details',gallery:'Photo gallery',reviews:'Testimonials',faqs:'FAQs'})[tab]; }
function BookingTable({bookings,updateStatus,onReschedule,onDelete,full=false}:{bookings:any[];updateStatus:(id:string,status:string)=>void; onReschedule:(booking:any)=>void; onDelete:(id:string)=>void;full?:boolean}) {
  if (!bookings.length) return <EmptyAdmin icon={<CalendarDays/>} text="No appointment requests yet. New customer requests will appear here."/>;
  return <div className="booking-table-wrap"><table className="booking-table"><thead><tr><th>Customer / Pet</th><th>Service</th><th>Date & time</th><th>Status</th><th>Manage</th></tr></thead><tbody>{bookings.map((booking)=>{const date=new Date(booking.starts_at);return <tr key={booking.id}><td><strong>{booking.full_name}</strong><small>{booking.pet_name} · {booking.animal_type}{booking.breed?` · ${booking.breed}`:''}</small><small>{booking.phone}</small></td><td>{booking.service_name}<details className="booking-details"><summary>Full details</summary><div><b>Breed:</b> {booking.breed || 'Not provided'}<br/><b>Weight:</b> {booking.approximate_weight ? `${booking.approximate_weight} kg` : 'Not provided'}<br/><b>Email:</b> {booking.customer_email || 'Not provided'}<br/><b>Notes:</b> {booking.customer_note || 'None'}<br/><b>Request created:</b> {booking.created_at ? new Date(booking.created_at).toLocaleString() : '—'}</div></details></td><td><strong>{date.toLocaleDateString('en-GB',{timeZone:'Asia/Tbilisi',day:'2-digit',month:'short',year:'numeric'})}</strong><small>{date.toLocaleTimeString('en-GB',{timeZone:'Asia/Tbilisi',hour:'2-digit',minute:'2-digit'})}</small></td><td><div className="booking-row-actions"><select className={`status-select status-${booking.status}`} value={booking.status} onChange={(e)=>updateStatus(booking.id,e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div></td><td><div className="booking-row-actions"><button className="icon-button" title="Reschedule appointment" onClick={()=>onReschedule(booking)}><CalendarDays size={14}/></button><button className="icon-button danger" title="Delete booking" onClick={()=>onDelete(booking.id)}><Trash2 size={14}/></button></div></td></tr>})}</tbody></table></div>;
}
function SetupTask({done,label,onClick}:{done:boolean;label:string;onClick:()=>void}) { return <button className="setup-task" onClick={onClick}><span className={done?'task-done':'task-open'}>{done?<Check size={13}/>:<Plus size={13}/>}</span><span>{label}</span>{done&&<small>Done</small>}</button>; }
function EmptyAdmin({icon,text}:{icon:ReactNode;text:string}) { return <div className="admin-empty"><span>{icon}</span><p>{text}</p></div>; }


async function optimizeImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const converted = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
    return converted || file;
  } catch {
    return file;
  }
}
